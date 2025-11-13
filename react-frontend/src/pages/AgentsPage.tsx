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

export default function AgentsPage() {
  const navigate = useNavigate();
  const [hiredAgents, setHiredAgents] = useState<AgentType[]>([]);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

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

  const handleLogout = () => {
    // Implement logout logic
    navigate('/login');
  };

  const handleProfile = () => {
    // Implement profile navigation
    navigate('/profile');
  };

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
        background: 'white',
        fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
      }}
    >
      {/* Sidebar */}
      <HiredAgentsList hiredAgents={hiredAgents} onUnhire={handleUnhireFromSidebar} />

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          marginLeft: '260px',
          padding: '1.5rem',
          position: 'relative',
          overflowY: 'auto',
          maxHeight: '100vh',
        }}
      >
        {/* User Menu (top right) */}
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 1000,
          }}
        >
          {/* Profile Button */}
          <button
            onClick={handleProfile}
            style={{
              width: '36px',
              height: '36px',
              background: '#F5F5F5',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              textDecoration: 'none',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#EEEEEE';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F5F5F5';
            }}
          >
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              width: '36px',
              height: '36px',
              background: '#F5F5F5',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              textDecoration: 'none',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FFEBEE';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F5F5F5';
              e.currentTarget.style.color = '#64748b';
            }}
          >
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        {/* Page Header */}
        <div
          style={{
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: 'none',
          }}
        >
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: '400',
              color: '#1e3a8a',
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.025em',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            }}
          >
            Hire Your <span style={{ fontWeight: '500' }}>AI Agents</span>
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#1e3a8a',
              lineHeight: '1.6',
              fontWeight: '300',
              margin: 0,
              letterSpacing: '-0.01em',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            }}
          >
            Choose from our team of specialized AI experts to build your perfect solar
            intelligence team
          </p>
        </div>

        {/* Agents Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: '0.875rem',
            width: '100%',
            paddingBottom: '2rem',
          }}
        >
          {AVAILABLE_AGENTS.map((agentType) => (
            <AgentCard
              key={agentType}
              agentType={agentType}
              metadata={AGENT_METADATA[agentType]}
              isHired={hiredAgents.includes(agentType)}
              userPlan={userPlan}
              onToggleHire={handleToggleHire}
            />
          ))}
        </div>
      </div>

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
