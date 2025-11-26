/**
 * Chat Header
 *
 * Top navigation bar with agent selector and back button
 * Material Design 3 compliant dropdown
 * Manages selected agent state
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useAuthStore } from '../../stores';
import { useAccessibleAgents } from '../../hooks/useAccessibleAgents';
import { AGENT_DROPDOWN_NAMES } from '../../constants/agents';
import type { AgentType } from '../../constants/agents';

interface ChatHeaderProps {
  selectedAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
  onAgentInitialized?: (initialized: boolean) => void;
}

export default function ChatHeader({
  selectedAgent,
  onAgentChange,
  onAgentInitialized,
}: ChatHeaderProps) {
  const navigate = useNavigate();
  const { artifactOpen, artifactContent, artifactType, openArtifact } = useUIStore();
  const { accessibleAgents, loading } = useAccessibleAgents();

  // MD3 Dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-select first accessible agent if current selection is not accessible
  useEffect(() => {
    if (!loading && accessibleAgents.length > 0) {
      const isSelectedAgentAccessible = accessibleAgents.some(
        agent => agent.agent_type === selectedAgent
      );

      if (!isSelectedAgentAccessible) {
        // Current agent not accessible - select first accessible agent
        const firstAgent = accessibleAgents[0].agent_type as AgentType;
        onAgentChange(firstAgent);
      }

      // Mark agent as initialized once we've loaded and checked accessible agents
      if (onAgentInitialized) {
        onAgentInitialized(true);
      }
    }
  }, [accessibleAgents, loading, selectedAgent, onAgentChange, onAgentInitialized]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAgentSelect = (agentType: AgentType) => {
    onAgentChange(agentType);
    setIsOpen(false);
    setIsFocused(false);
  };

  const selectedAgentName = AGENT_DROPDOWN_NAMES[selectedAgent] || selectedAgent;

  return (
    <header
      style={{
        position: 'relative',
        flexShrink: 0,
        height: '60px',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem 0 1rem',
        borderBottom: '1px solid #f3f4f6',
        zIndex: 100,
      }}
    >
      {/* Left section: Agent Selector - Clean Minimal Design */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div ref={dropdownRef} style={{ position: 'relative', minWidth: '240px' }}>
          {/* Agent Selector Button */}
          <button
            onClick={() => !loading && accessibleAgents.length > 0 && setIsOpen(!isOpen)}
            onFocus={() => setIsFocused(true)}
            tabIndex={0}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            disabled={loading || accessibleAgents.length === 0}
            style={{
              width: '100%',
              position: 'relative',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: `1.5px solid ${isFocused || isOpen ? '#fbbf24' : '#e5e7eb'}`,
              borderRadius: '12px',
              padding: '0.75rem 2.5rem 0.75rem 1rem',
              cursor: loading || accessibleAgents.length === 0 ? 'default' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isFocused || isOpen
                ? '0 4px 16px rgba(251, 191, 36, 0.2), 0 0 0 3px rgba(251, 191, 36, 0.1)'
                : '0 2px 8px rgba(0, 0, 0, 0.04)',
              outline: 'none',
              textAlign: 'left',
              fontSize: '0.95rem',
              fontWeight: '500',
              color: loading || accessibleAgents.length === 0 ? '#94a3b8' : '#0a1850',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => {
              if (!loading && accessibleAgents.length > 0 && !isOpen) {
                e.currentTarget.style.borderColor = '#fbbf24';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(251, 191, 36, 0.15)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #fffbf0 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isOpen) {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
              }
            }}
          >
            {loading ? 'Loading agents...' : accessibleAgents.length === 0 ? 'No agents available' : selectedAgentName}

            {/* Dropdown icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                color: isFocused || isOpen ? '#fbbf24' : '#64748b',
                pointerEvents: 'none',
              }}
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isOpen && accessibleAgents.length > 0 && (
            <div
              role="listbox"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                background: '#FFFFFF',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                zIndex: 1000,
                maxHeight: '320px',
                overflowY: 'auto',
                animation: 'dropdown-enter 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: '0.5rem',
              }}
            >
              {accessibleAgents.map((agent) => {
                const agentType = agent.agent_type as AgentType;
                const agentName = AGENT_DROPDOWN_NAMES[agentType] || agentType;
                const isSelected = agentType === selectedAgent;

                return (
                  <div
                    key={agentType}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleAgentSelect(agentType)}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.9375rem',
                      fontWeight: isSelected ? '500' : '400',
                      color: isSelected ? '#0a1850' : '#475569',
                      fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                      letterSpacing: '0.01em',
                      background: isSelected ? '#fffbf0' : 'transparent',
                      borderRadius: '8px',
                      position: 'relative',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isSelected ? '#fef3c7' : '#f8fafc';
                      e.currentTarget.style.color = '#0a1850';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected ? '#fffbf0' : 'transparent';
                      e.currentTarget.style.color = isSelected ? '#0a1850' : '#475569';
                    }}
                  >
                    <span>{agentName}</span>
                    {isSelected && (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right section: Artifact reopen button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Show reopen button if artifact content exists and panel is closed */}
        {artifactContent && !artifactOpen && (
          <button
            onClick={() => openArtifact(artifactContent, artifactType || 'contact')}
            className="artifact-reopen-btn"
            title="Reopen panel"
            aria-label="Reopen artifact panel"
            style={{
              width: '40px',
              height: '40px',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              color: '#64748b',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.color = '#1e293b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            {/* Panel icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        )}
      </div>

      {/* Styles */}
      <style>{`
        /* Dropdown Animation */
        @keyframes dropdown-enter {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Smooth scrollbar for dropdown */
        div[role="listbox"]::-webkit-scrollbar {
          width: 6px;
        }

        div[role="listbox"]::-webkit-scrollbar-track {
          background: transparent;
          margin: 8px;
        }

        div[role="listbox"]::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 3px;
        }

        div[role="listbox"]::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </header>
  );
}
