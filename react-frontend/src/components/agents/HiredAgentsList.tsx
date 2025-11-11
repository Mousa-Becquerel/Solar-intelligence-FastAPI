/**
 * Hired Agents List
 *
 * Sidebar component showing hired agents
 * Includes "My Team" header, agent list, and "Start Chat" button
 * Matches Flask design exactly
 */

import { useNavigate } from 'react-router-dom';
import type { AgentType } from '../../constants/agents';
import { AGENT_METADATA } from '../../constants/agentMetadata';

interface HiredAgentsListProps {
  hiredAgents: AgentType[];
  onUnhire: (agentType: AgentType) => void;
}

export default function HiredAgentsList({
  hiredAgents,
  onUnhire,
}: HiredAgentsListProps) {
  const navigate = useNavigate();

  const handleStartChat = () => {
    if (hiredAgents.length > 0) {
      // Navigate to chat with first hired agent
      navigate(`/chat?agent=${hiredAgents[0]}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '260px',
        background: 'white',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem 1.5rem',
          gap: '1.5rem',
          minHeight: 0,
        }}
      >
        {/* My Team Header */}
        <div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: '500',
              color: '#1e3a8a',
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.02em',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            }}
          >
            My Team
          </h2>
          <p
            style={{
              fontSize: '0.8125rem',
              color: '#64748b',
              margin: 0,
              fontWeight: '300',
              lineHeight: '1.5',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            }}
          >
            {hiredAgents.length} {hiredAgents.length === 1 ? 'agent' : 'agents'} hired
          </p>
        </div>

        {/* Hired Agents List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
          }}
        >
          {hiredAgents.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: '#94a3b8',
                fontSize: '0.875rem',
                fontWeight: '300',
                lineHeight: '1.6',
                fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              }}
            >
              No agents hired yet. Browse and hire agents to build your team.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {hiredAgents.map((agentType) => {
                const metadata = AGENT_METADATA[agentType];
                return (
                  <div
                    key={agentType}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    {/* Agent info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      {/* Agent icon */}
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: '#E8EAF6',
                          color: '#5C6BC0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          dangerouslySetInnerHTML={{ __html: metadata.icon }}
                        />
                      </div>

                      {/* Agent name and role */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#1e293b',
                            margin: 0,
                            letterSpacing: '-0.01em',
                            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {metadata.name}
                        </h4>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            margin: 0,
                            fontWeight: '300',
                            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {metadata.role}
                        </p>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => onUnhire(agentType)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.375rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s ease',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      title="Remove agent"
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
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Start Chat Button */}
        <button
          onClick={handleStartChat}
          disabled={hiredAgents.length === 0}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            background: hiredAgents.length > 0 ? '#5C6BC0' : '#94a3b8',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: 'none',
            borderRadius: '16px',
            cursor: hiredAgents.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: 'none',
            marginTop: 'auto',
            letterSpacing: '-0.01em',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
            opacity: hiredAgents.length > 0 ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            if (hiredAgents.length > 0) {
              e.currentTarget.style.background = '#4E5BA6';
            }
          }}
          onMouseLeave={(e) => {
            if (hiredAgents.length > 0) {
              e.currentTarget.style.background = '#5C6BC0';
            }
          }}
        >
          {/* MD3 State Layer */}
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'white',
              opacity: 0,
              transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'none',
            }}
          />

          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ position: 'relative', zIndex: 1 }}>Start Chat</span>
        </button>
      </div>

      <style>{`
        /* Custom scrollbar for hired agents list */
        div::-webkit-scrollbar {
          width: 6px;
        }

        div::-webkit-scrollbar-track {
          background: transparent;
        }

        div::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
