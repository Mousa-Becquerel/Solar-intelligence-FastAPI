/**
 * Agents Page
 *
 * Agent selection/hiring interface with Material Design 3 styling
 * Shows grid of available agents with hire/unhire functionality
 * Sidebar shows hired agents ("My Team")
 * Matches Flask design exactly
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AgentCard from '../components/agents/AgentCard';
import AgentDetailsModal from '../components/agents/AgentDetailsModal';
import HiredAgentsList from '../components/agents/HiredAgentsList';
import AgentsPageSkeleton from '../components/agents/AgentsPageSkeleton';
import Toast from '../components/common/Toast';
import type { AgentType } from '../constants/agents';
import { AGENT_METADATA, AVAILABLE_AGENTS } from '../constants/agentMetadata';
import { hireAgent, unhireAgent, getHiredAgents } from '../services/agentService';
import { apiClient } from '../api';
import { useUIStore } from '../stores';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

type FilterCategory = 'all' | 'premium' | 'market' | 'policy' | 'financial' | 'eu_projects';

export default function AgentsPage() {
  const navigate = useNavigate();
  const { sidebarExpanded, setSidebarExpanded } = useUIStore();
  const [hiredAgents, setHiredAgents] = useState<AgentType[]>([]);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [userRole, setUserRole] = useState<string>('demo');
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [selectedAgentForModal, setSelectedAgentForModal] = useState<AgentType | null>(null);
  const [userQuery, setUserQuery] = useState<string>('');
  const [recommendedAgents, setRecommendedAgents] = useState<AgentType[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  // Track if free user has exhausted their trial queries (in fallback mode)
  const [isInFallbackMode, setIsInFallbackMode] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Load user plan, role, and name
      const user = await apiClient.getCurrentUser();
      const planType = user.plan_type || 'free';
      setUserPlan(planType);
      setUserRole(user.role || 'demo');

      // Extract first name from full_name (e.g., "John Doe" -> "John")
      let firstName = 'there';
      if (user.full_name) {
        const nameParts = user.full_name.trim().split(/\s+/);
        firstName = nameParts[0] || 'there';
      } else if (user.username) {
        // Fallback to username if full_name is not available
        firstName = user.username;
      }
      setUserName(firstName);

      // For free users, check if they've exhausted their trial queries (fallback mode)
      if (planType === 'free') {
        try {
          const profile = await apiClient.getProfile();
          const { monthly_queries, query_limit } = profile.usage_stats;
          console.log('[AgentsPage] Profile loaded for fallback check:', { monthly_queries, query_limit, planType });
          // If query_limit is not "Unlimited" and user has reached/exceeded it, they're in fallback
          if (query_limit !== 'Unlimited') {
            const limit = parseInt(query_limit, 10);
            console.log('[AgentsPage] Checking fallback:', { limit, monthly_queries, isInFallback: monthly_queries >= limit });
            if (!isNaN(limit) && monthly_queries >= limit) {
              console.log('[AgentsPage] Setting isInFallbackMode to TRUE');
              setIsInFallbackMode(true);
            }
          }
        } catch (profileError) {
          console.error('Failed to load profile for fallback check:', profileError);
          // If we can't load profile, assume not in fallback (safer for user experience)
        }
      }

      // Load hired agents
      const hiredAgentsList = await getHiredAgents();
      const agentTypes = hiredAgentsList
        .filter((agent) => agent.is_active)
        .map((agent) => agent.agent_type as AgentType);
      setHiredAgents(agentTypes);
    } catch (error) {
      console.error('Failed to load data:', error);
      // showToast is defined later, so we'll just log for now
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Ensure sidebar is collapsed on agents page mount
  useEffect(() => {
    setSidebarExpanded(false);
  }, [setSidebarExpanded]);

  // Load hired agents and user plan on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleHire = async (agentType: AgentType) => {
    const isHired = hiredAgents.includes(agentType);
    const agentMetadata = AGENT_METADATA[agentType];
    const agentName = agentMetadata.name;

    try {
      if (isHired) {
        // Unhire agent
        await unhireAgent(agentType);
        setHiredAgents((prev) => prev.filter((a) => a !== agentType));
        showToast(`${agentName} has been removed from your team`, 'success');
      } else {
        // Eco (storage_optimization) is admin-only
        if (agentType === 'storage_optimization' && userRole !== 'admin') {
          showToast('Eco is currently available to administrators only.', 'error');
          return;
        }

        // Free users in fallback mode can ONLY hire Sam (seamless)
        if (userPlan === 'free' && isInFallbackMode && agentType !== 'seamless') {
          showToast('Your trial has ended. Only Sam is available in the free tier. Upgrade to hire more agents!', 'error');
          return;
        }

        // Free users can hire ALL agents during trial period (first 15 queries)
        // Analyst users cannot hire strategist agents (Nova/Nina)
        // Strategist/Enterprise/Admin users can hire all agents
        const canHirePremium = (userPlan === 'free' && !isInFallbackMode) || ['strategist', 'enterprise', 'admin', 'premium', 'max'].includes(userPlan);
        if (agentMetadata.premium && !canHirePremium) {
          showToast('This agent requires a Strategist or Enterprise plan. Please upgrade to hire this agent.', 'error');
          return;
        }

        // Hire agent
        await hireAgent(agentType);
        setHiredAgents((prev) => [...prev, agentType]);
        showToast(`${agentName} has joined your team!`, 'success');
      }
    } catch (error: any) {
      console.error('Error toggling hire:', error);
      showToast(error.message || 'Operation failed', 'error');
    }
  };

  const handleUnhireFromSidebar = async (agentType: AgentType) => {
    await handleToggleHire(agentType);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Filter agents based on selected category
  const filteredAgents = AVAILABLE_AGENTS.filter((agentType) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'premium') return AGENT_METADATA[agentType].premium;
    if (selectedFilter === 'market') return agentType === 'market';
    if (selectedFilter === 'policy') return agentType === 'nzia_policy' || agentType === 'nzia_market_impact';
    if (selectedFilter === 'financial') return agentType === 'manufacturer_financial';
    if (selectedFilter === 'eu_projects') return agentType === 'seamless';
    return true;
  });

  // Reorder agents: recommended ones first, then others
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    const aIsRecommended = recommendedAgents.includes(a);
    const bIsRecommended = recommendedAgents.includes(b);

    if (aIsRecommended && !bIsRecommended) return -1;
    if (!aIsRecommended && bIsRecommended) return 1;
    return 0;
  });

  if (loading) {
    return <AgentsPageSkeleton />;
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f5f5f5', // MD3 Surface background - matching profile page
        fontFamily: "'Inter', 'Roboto', 'Google Sans Text', Arial, sans-serif",
      }}
    >
      {/* Sidebar */}
      <HiredAgentsList hiredAgents={hiredAgents} onUnhire={handleUnhireFromSidebar} />

      {/* Main Content - Scrollable */}
      <div
        style={{
          flex: 1,
          marginLeft: sidebarExpanded ? '220px' : '72px',
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Top Bar - Sticky */}
        <div
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '52px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Page Title */}
          <h1
            style={{
              fontSize: '20px',
              lineHeight: '28px',
              fontWeight: '400',
              color: '#1e3a8a', // Same blue as chat screen
              margin: 0,
              fontFamily: "'Inter', 'Roboto', 'Google Sans', Arial, sans-serif",
            }}
          >
            Agents Gallery
          </h1>

          {/* Right Section - Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Unhire All Button - MD3 Destructive Style */}
            {hiredAgents.length > 0 && (
              <button
                onClick={async () => {
                  try {
                    // Unhire all agents in parallel
                    await Promise.all(hiredAgents.map(agentType => unhireAgent(agentType)));
                    setHiredAgents([]);
                    showToast('All agents have been removed from your team', 'success');
                  } catch (error: any) {
                    console.error('Error unhiring all agents:', error);
                    showToast(error.message || 'Failed to remove all agents', 'error');
                  }
                }}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#dc2626',
                  border: '1.5px solid #fecaca',
                  borderRadius: '100px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.borderColor = '#fca5a5';
                  e.currentTarget.style.color = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#fecaca';
                  e.currentTarget.style.color = '#dc2626';
                }}
              >
                {/* Remove/Trash icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span>Unhire All</span>
              </button>
            )}

            {/* Start Chat Button - Material Design Style */}
            <button
            onClick={() => navigate('/chat')}
            disabled={hiredAgents.length === 0}
            style={{
              padding: '10px 24px',
              background: hiredAgents.length > 0 ? '#1e3a8a' : '#f5f5f5',
              color: hiredAgents.length > 0 ? '#FFFFFF' : '#9ca3af',
              border: 'none',
              borderRadius: '100px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: hiredAgents.length > 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              boxShadow: hiredAgents.length > 0 ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (hiredAgents.length > 0) {
                e.currentTarget.style.background = '#1e40af';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
              } else {
                e.currentTarget.style.background = '#eeeeee';
              }
            }}
            onMouseLeave={(e) => {
              if (hiredAgents.length > 0) {
                e.currentTarget.style.background = '#1e3a8a';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              } else {
                e.currentTarget.style.background = '#f5f5f5';
              }
            }}
          >
            {/* Chat icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span>Start Chat</span>
            {hiredAgents.length > 0 && (
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                }}
              >
                {hiredAgents.length}
              </span>
            )}
          </button>
          </div>
        </div>

        {/* Full-Width Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(255, 183, 77, 0.12) 100%)',
            padding: '64px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '320px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated gradient orbs */}
          <div
            className="gradient-orb gradient-orb-1"
            style={{
              position: 'absolute',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(30, 58, 138, 0.15) 0%, transparent 70%)',
              top: '-250px',
              left: '-100px',
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          />
          <div
            className="gradient-orb gradient-orb-2"
            style={{
              position: 'absolute',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 183, 77, 0.18) 0%, transparent 70%)',
              bottom: '-150px',
              right: '-50px',
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          />

          {/* Floating accent shapes */}
          <div
            className="accent-shape accent-shape-1"
            style={{
              position: 'absolute',
              width: '120px',
              height: '120px',
              borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.08), rgba(255, 183, 77, 0.08))',
              top: '20%',
              right: '15%',
              pointerEvents: 'none',
              willChange: 'transform, border-radius',
            }}
          />
          <div
            className="accent-shape accent-shape-2"
            style={{
              position: 'absolute',
              width: '80px',
              height: '80px',
              borderRadius: '63% 37% 54% 46% / 55% 48% 52% 45%',
              background: 'linear-gradient(225deg, rgba(255, 183, 77, 0.1), rgba(30, 58, 138, 0.06))',
              bottom: '25%',
              left: '12%',
              pointerEvents: 'none',
              willChange: 'transform, border-radius',
            }}
          />

          {/* Subtle grid overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(30, 58, 138, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 58, 138, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              pointerEvents: 'none',
              opacity: 0.4,
            }}
          />
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center', maxWidth: '900px', position: 'relative', zIndex: 1 }}>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '500',
                color: '#1e3a8a',
                margin: '0 0 12px 0',
                fontFamily: "'Inter', 'Roboto', 'Google Sans', Arial, sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              {userName ? `Welcome, ${userName}` : 'Find Your Perfect AI Team'}
            </h2>
            <p
              style={{
                fontSize: '16px',
                lineHeight: '24px',
                color: '#64748b',
                margin: '0',
                fontFamily: "'Inter', 'Roboto', 'Google Sans Text', Arial, sans-serif",
                fontWeight: '300',
              }}
            >
              Describe what you need help with, and we'll recommend the best agents for you
            </p>
          </div>

          {/* Input Section - Centered, Max Width with Glassmorphism */}
          <div
            style={{
              width: '100%',
              maxWidth: '800px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '8px',
              boxShadow: '0 8px 32px rgba(30, 58, 138, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              position: 'relative',
              zIndex: 2,
            }}
          >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {/* Input Field */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="e.g., I need help analyzing solar panel market trends..."
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 20px',
                        fontSize: '15px',
                        fontWeight: '400',
                        letterSpacing: '-0.01em',
                        lineHeight: '1.5',
                        border: 'none',
                        borderRadius: '24px',
                        outline: 'none',
                        fontFamily: "'Inter', 'Roboto', 'Google Sans Text', Arial, sans-serif",
                        background: '#f8f9fa',
                        color: '#1e293b',
                        transition: 'background-color 0.2s ease',
                        boxShadow: 'none',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.background = '#f1f3f4';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.background = '#f8f9fa';
                      }}
                    />
                  </div>

                  {/* Recommend Button - MD3 Filled Button, Always Visible */}
                  <button
                    onClick={async () => {
                      if (userQuery.trim() && !isRecommending) {
                        setIsRecommending(true);
                        try {
                          // Call AI recommendation API using apiClient.request
                          const response = await apiClient.request<{ recommended_agents: string[] }>(
                            'recommendations/recommend',
                            {
                              method: 'POST',
                              body: JSON.stringify({ query: userQuery })
                            }
                          );

                          const recommendedAgents = response.recommended_agents as AgentType[];
                          setRecommendedAgents(recommendedAgents);

                          if (recommendedAgents.length > 0) {
                            // Automatically hire recommended agents that are not already hired
                            const agentsToHire = recommendedAgents.filter(agent => !hiredAgents.includes(agent));

                            if (agentsToHire.length > 0) {
                              // Hire each recommended agent
                              const hirePromises = agentsToHire.map(async (agentType) => {
                                const agentMetadata = AGENT_METADATA[agentType];

                                // Admin-only agents (Eco) can only be hired by admins
                                if (agentType === 'storage_optimization' && userRole !== 'admin') {
                                  console.warn(`Skipping auto-hire for ${agentType} - admin-only agent`);
                                  return null;
                                }

                                // Free users in fallback mode can ONLY hire Sam
                                if (userPlan === 'free' && isInFallbackMode && agentType !== 'seamless') {
                                  console.warn(`Skipping auto-hire for ${agentType} - free user in fallback mode can only hire Sam`);
                                  return null;
                                }

                                // Free users can hire ALL agents during trial
                                // Only Analyst users cannot hire strategist agents
                                const canHirePremium = (userPlan === 'free' && !isInFallbackMode) || ['strategist', 'enterprise', 'admin', 'premium', 'max'].includes(userPlan);
                                if (agentMetadata.premium && !canHirePremium) {
                                  console.warn(`Skipping auto-hire for premium agent ${agentType} - user plan ${userPlan} insufficient`);
                                  return null;
                                }

                                try {
                                  await hireAgent(agentType);
                                  return agentType;
                                } catch (error) {
                                  console.error(`Failed to auto-hire agent ${agentType}:`, error);
                                  return null;
                                }
                              });

                              const hiredResults = await Promise.all(hirePromises);
                              const successfullyHired = hiredResults.filter((agent): agent is AgentType => agent !== null);

                              // Update hired agents state
                              if (successfullyHired.length > 0) {
                                setHiredAgents((prev) => [...prev, ...successfullyHired]);
                                showToast(
                                  `Found and hired ${successfullyHired.length} recommended agent${successfullyHired.length > 1 ? 's' : ''} for you!`,
                                  'success'
                                );
                              } else {
                                showToast(`Found ${recommendedAgents.length} recommended agent${recommendedAgents.length > 1 ? 's' : ''} for you!`, 'success');
                              }
                            } else {
                              // All recommended agents are already hired
                              showToast(`Found ${recommendedAgents.length} recommended agent${recommendedAgents.length > 1 ? 's' : ''} (already in your team)!`, 'success');
                            }
                          } else {
                            showToast('No specific agents recommended. Try refining your query.', 'error');
                          }
                        } catch (error: any) {
                          console.error('Error getting recommendations:', error);
                          showToast('Failed to get recommendations. Please try again.', 'error');
                        } finally {
                          setIsRecommending(false);
                        }
                      }
                    }}
                    disabled={!userQuery.trim() || isRecommending}
                    style={{
                      background: userQuery.trim() && !isRecommending ? '#1e3a8a' : '#e5e7eb',
                      color: userQuery.trim() && !isRecommending ? '#FFFFFF' : '#9CA3AF',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '14px 32px',
                      fontSize: '15px',
                      lineHeight: '22px',
                      fontWeight: '500',
                      cursor: userQuery.trim() && !isRecommending ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      fontFamily: "'Inter', 'Roboto', 'Google Sans Text', Arial, sans-serif",
                      boxShadow: 'none',
                      minWidth: '140px',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.01em',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      if (userQuery.trim() && !isRecommending) {
                        e.currentTarget.style.background = '#1e40af';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (userQuery.trim() && !isRecommending) {
                        e.currentTarget.style.background = '#1e3a8a';
                      }
                    }}
                  >
                    {isRecommending ? (
                      <>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{
                            animation: 'spin 1s linear infinite',
                          }}
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="60"
                            strokeDashoffset="15"
                          />
                        </svg>
                        <span>Finding...</span>
                      </>
                    ) : (
                      'Recommend'
                    )}
                  </button>
                </div>
              </div>
        </div>

        {/* Content Area */}
        <div
          style={{
            padding: '24px',
          }}
        >
          {/* Category Filters */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '24px',
              padding: '0',
              justifyContent: 'center',
            }}
          >
            {[
              { key: 'all' as FilterCategory, label: 'All Agents' },
              { key: 'premium' as FilterCategory, label: 'Strategist' },
              { key: 'market' as FilterCategory, label: 'Market Analysis' },
              { key: 'policy' as FilterCategory, label: 'Policy & Compliance' },
              { key: 'financial' as FilterCategory, label: 'Financial Analysis' },
              { key: 'eu_projects' as FilterCategory, label: 'EU Projects' },
            ].map(({ key, label }) => {
              const isSelected = selectedFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedFilter(key)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '20px',
                    border: 'none',
                    background: isSelected ? '#1e3a8a' : '#f5f5f5',
                    color: isSelected ? '#FFFFFF' : '#64748b',
                    fontSize: '14px',
                    lineHeight: '20px',
                    fontWeight: '500',
                    fontFamily: "'Inter', 'Roboto', 'Google Sans Text', Arial, sans-serif",
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: 'none',
                    minHeight: '40px',
                    letterSpacing: '0.01em',
                  }}
                  onMouseEnter={(e) => {
                    if (isSelected) {
                      e.currentTarget.style.background = '#1e40af';
                    } else {
                      e.currentTarget.style.background = '#eeeeee';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isSelected) {
                      e.currentTarget.style.background = '#1e3a8a';
                    } else {
                      e.currentTarget.style.background = '#f5f5f5';
                    }
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Agents Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 280px))',
              gridAutoRows: '220px', // Fixed height for all cards
              gap: '24px',
              width: '100%',
              paddingBottom: '2rem',
              justifyContent: 'center',
            }}
          >
            {sortedAgents.map((agentType) => (
              <AgentCard
                key={agentType}
                agentType={agentType}
                metadata={AGENT_METADATA[agentType]}
                isHired={hiredAgents.includes(agentType)}
                userPlan={userPlan}
                userRole={userRole}
                onToggleHire={handleToggleHire}
                onCardClick={setSelectedAgentForModal}
                isRecommended={recommendedAgents.includes(agentType)}
                isInFallbackMode={isInFallbackMode}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Agent Details Modal */}
      {selectedAgentForModal && (
        <AgentDetailsModal
          agentType={selectedAgentForModal}
          metadata={AGENT_METADATA[selectedAgentForModal]}
          isOpen={selectedAgentForModal !== null}
          onClose={() => setSelectedAgentForModal(null)}
          isHired={hiredAgents.includes(selectedAgentForModal)}
          onToggleHire={handleToggleHire}
          canHire={
            // Admin-only agents (Eco) require admin role
            selectedAgentForModal === 'storage_optimization'
              ? userRole === 'admin'
              : // Free users in fallback mode can only hire Sam
                (userPlan === 'free' && isInFallbackMode)
                  ? selectedAgentForModal === 'seamless'
                  : (
                      !AGENT_METADATA[selectedAgentForModal].premium ||
                      (userPlan === 'free' && !isInFallbackMode) ||  // Free users can try all agents during trial
                      ['strategist', 'enterprise', 'admin', 'premium', 'max'].includes(userPlan)
                    )
          }
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
        /* Spinner animation */
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Hero Section Animations */
        @keyframes float-orb-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -20px) scale(1.05);
          }
          66% {
            transform: translate(-20px, 30px) scale(0.95);
          }
        }

        @keyframes float-orb-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-25px, 20px) scale(1.08);
          }
          66% {
            transform: translate(35px, -15px) scale(0.92);
          }
        }

        @keyframes float-shape-1 {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          }
          50% {
            transform: translate(15px, -15px) rotate(180deg);
            border-radius: 70% 30% 30% 70% / 70% 70% 30% 30%;
          }
        }

        @keyframes float-shape-2 {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            border-radius: 63% 37% 54% 46% / 55% 48% 52% 45%;
          }
          50% {
            transform: translate(-20px, 20px) rotate(-180deg);
            border-radius: 37% 63% 46% 54% / 48% 55% 45% 52%;
          }
        }

        .gradient-orb-1 {
          animation: float-orb-1 20s ease-in-out infinite;
        }

        .gradient-orb-2 {
          animation: float-orb-2 18s ease-in-out infinite;
        }

        .accent-shape-1 {
          animation: float-shape-1 15s ease-in-out infinite;
        }

        .accent-shape-2 {
          animation: float-shape-2 12s ease-in-out infinite;
        }

        /* Responsive layout */
        @media (max-width: 768px) {
          .agents-container {
            flex-direction: column;
          }
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .gradient-orb-1,
          .gradient-orb-2,
          .accent-shape-1,
          .accent-shape-2 {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
