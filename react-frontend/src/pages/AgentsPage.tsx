/**
 * Agents Page
 *
 * Agent selection/hiring interface with Material Design 3 styling
 * Shows grid of available agents with hire/unhire functionality
 * Sidebar shows hired agents ("My Team")
 * Matches Flask design exactly
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AgentCard from '../components/agents/AgentCard';
import AgentDetailsModal from '../components/agents/AgentDetailsModal';
import HiredAgentsList from '../components/agents/HiredAgentsList';
import Toast from '../components/common/Toast';
import type { AgentType } from '../constants/agents';
import { AGENT_METADATA, AVAILABLE_AGENTS } from '../constants/agentMetadata';
import { hireAgent, unhireAgent, getHiredAgents } from '../services/agentService';
import { apiClient } from '../api';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

type FilterCategory = 'all' | 'premium' | 'market' | 'policy' | 'financial';

export default function AgentsPage() {
  const navigate = useNavigate();
  const [hiredAgents, setHiredAgents] = useState<AgentType[]>([]);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [selectedAgentForModal, setSelectedAgentForModal] = useState<AgentType | null>(null);
  const [userQuery, setUserQuery] = useState<string>('');
  const [recommendedAgents, setRecommendedAgents] = useState<AgentType[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);

  // Load hired agents and user plan on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load user plan
      const user = await apiClient.getCurrentUser();
      setUserPlan(user.plan_type || 'free');

      // Load hired agents
      const hiredAgentsList = await getHiredAgents();
      const agentTypes = hiredAgentsList
        .filter((agent) => agent.is_active)
        .map((agent) => agent.agent_type as AgentType);
      setHiredAgents(agentTypes);
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

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
        // Check if trying to hire a premium agent with a free plan
        if (agentMetadata.premium && userPlan === 'free') {
          showToast('This agent requires a Premium or Enterprise plan. Please upgrade to hire this agent.', 'error');
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
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
        }}
      >
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading...</p>
      </div>
    );
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

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          marginLeft: '220px',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Top Bar */}
        <div
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '64px',
            flexShrink: 0,
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
        </div>

        {/* Scrollable Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          {/* AI-Powered Agent Recommendation - Centered Modern Design */}
          <div
            style={{
              marginBottom: '48px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '900px',
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '32px 40px',
                border: '1px solid #F0F0F0',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '24px',
                    fontWeight: '400',
                    color: '#1e3a8a',
                    margin: '0 0 8px 0',
                    fontFamily: "'Inter', 'Roboto', 'Google Sans', Arial, sans-serif",
                    letterSpacing: '-0.01em',
                  }}
                >
                  Find Your Perfect AI Team
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#94a3b8',
                    margin: '0',
                    fontFamily: "'Inter', 'Roboto', 'Google Sans Text', Arial, sans-serif",
                    fontWeight: '300',
                    maxWidth: '600px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                >
                  Describe what you need help with, and we'll recommend the best agents for you
                </p>
              </div>

              {/* Input Section - MD3 Flat Design matching ChatInput */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  background: '#F5F5F5',
                  borderRadius: '16px',
                  padding: '0.8rem',
                  boxShadow: 'none',
                  border: 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
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
                        padding: '0.875rem 1.125rem',
                        fontSize: '0.9375rem',
                        fontWeight: '300',
                        letterSpacing: '-0.01em',
                        lineHeight: '1.5',
                        border: 'none',
                        borderRadius: '12px',
                        outline: 'none',
                        fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                        background: '#ffffff',
                        color: '#1e293b',
                        transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: 'none',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.background = '#fafafa';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                      }}
                    />
                  </div>

                  {/* Recommend Button - MD3 Filled Button */}
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
                            showToast(`Found ${recommendedAgents.length} recommended agent${recommendedAgents.length > 1 ? 's' : ''} for you!`, 'success');
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
                      background: (userQuery.trim() && !isRecommending) ? '#FFB74D' : '#f5f5f5',
                      color: (userQuery.trim() && !isRecommending) ? '#1e293b' : '#9CA3AF',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '14px 32px',
                      fontSize: '15px',
                      lineHeight: '22px',
                      fontWeight: '400',
                      cursor: (userQuery.trim() && !isRecommending) ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: "'Inter', 'Roboto', 'Google Sans Text', Arial, sans-serif",
                      boxShadow: 'none',
                      minWidth: '140px',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.1px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      if (userQuery.trim() && !isRecommending) {
                        e.currentTarget.style.background = '#F5A73B';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (userQuery.trim() && !isRecommending) {
                        e.currentTarget.style.background = '#FFB74D';
                      }
                    }}
                  >
                    {isRecommending ? (
                      <>
                        {/* Modern Spinner */}
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
                            stroke="#9CA3AF"
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
          </div>

        {/* Category Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '24px',
            padding: '0',
          }}
        >
          {[
            { key: 'all' as FilterCategory, label: 'All Agents' },
            { key: 'premium' as FilterCategory, label: 'Premium' },
            { key: 'market' as FilterCategory, label: 'Market Analysis' },
            { key: 'policy' as FilterCategory, label: 'Policy & Compliance' },
            { key: 'financial' as FilterCategory, label: 'Financial Analysis' },
          ].map(({ key, label }) => {
            const isSelected = selectedFilter === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedFilter(key)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '9999px', // MD3 full rounded
                  border: 'none',
                  background: isSelected ? '#FFB74D' : '#f5f5f5', // Butterscotch when selected, gray when not
                  color: isSelected ? '#1e293b' : '#64748b',
                  fontSize: '14px', // MD3 Label L
                  lineHeight: '20px',
                  fontWeight: '500',
                  fontFamily: "'Inter', 'Roboto', 'Google Sans Text', Arial, sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 'none',
                  minHeight: '40px',
                  letterSpacing: '0.1px',
                }}
                onMouseEnter={(e) => {
                  if (isSelected) {
                    e.currentTarget.style.background = '#F5A73B'; // Darker butterscotch on hover
                  } else {
                    e.currentTarget.style.background = '#eeeeee';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isSelected) {
                    e.currentTarget.style.background = '#FFB74D';
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
              gap: '24px',
              width: '100%',
              paddingBottom: '2rem',
            }}
          >
            {sortedAgents.map((agentType) => (
              <AgentCard
                key={agentType}
                agentType={agentType}
                metadata={AGENT_METADATA[agentType]}
                isHired={hiredAgents.includes(agentType)}
                userPlan={userPlan}
                onToggleHire={handleToggleHire}
                onCardClick={setSelectedAgentForModal}
                isRecommended={recommendedAgents.includes(agentType)}
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
            !AGENT_METADATA[selectedAgentForModal].premium ||
            userPlan === 'premium' ||
            userPlan === 'max' ||
            userPlan === 'admin'
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

        /* Responsive layout */
        @media (max-width: 768px) {
          .agents-container {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
