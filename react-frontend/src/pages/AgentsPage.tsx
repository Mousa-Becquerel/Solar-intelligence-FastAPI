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
              fontWeight: '600',
              color: '#1e3a8a', // Same blue as chat screen
              margin: 0,
              fontFamily: "'Inter', 'Roboto', 'Google Sans', Arial, sans-serif",
            }}
          >
            Hire Your AI Team
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
          {/* Page Description */}
          <p
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: '#1e3a8a', // Same blue as chat screen
              fontWeight: '400',
              margin: '0 0 24px 0',
              letterSpacing: '0.25px',
              fontFamily: "'Inter', 'Roboto', 'Google Sans Text', Arial, sans-serif",
            }}
          >
            Choose from our team of specialized AI experts to build your perfect solar intelligence team
          </p>

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
            {filteredAgents.map((agentType) => (
              <AgentCard
                key={agentType}
                agentType={agentType}
                metadata={AGENT_METADATA[agentType]}
                isHired={hiredAgents.includes(agentType)}
                userPlan={userPlan}
                onToggleHire={handleToggleHire}
                onCardClick={setSelectedAgentForModal}
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
