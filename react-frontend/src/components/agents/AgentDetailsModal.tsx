/**
 * Agent Details Modal
 *
 * Shows detailed information about an agent including:
 * - Full description
 * - Capabilities
 * - Sample questions
 * - Data sources
 */

import { useEffect } from 'react';
import type { AgentType } from '../../constants/agents';
import type { AgentMetadata } from '../../constants/agentMetadata';

interface AgentDetailsModalProps {
  agentType: AgentType;
  metadata: AgentMetadata;
  isOpen: boolean;
  onClose: () => void;
  isHired: boolean;
  onToggleHire: (agentType: AgentType) => void;
  canHire: boolean;
}

// Sample questions for each agent
const SAMPLE_QUESTIONS: Record<AgentType, string[]> = {
  market: [
    'What are the current trends in the European PV market?',
    'Show me solar installation forecasts for 2024',
    'Compare China and US manufacturing capacity',
  ],
  price: [
    'What are the current module prices?',
    'Show me price trends for polysilicon',
    'Compare wafer prices across regions',
  ],
  news: [
    'What are the latest solar industry news?',
    'Show me recent announcements from major manufacturers',
    'What policy updates were announced this week?',
  ],
  digitalization: [
    'How is AI being used in solar manufacturing?',
    'What are the latest automation trends?',
    'Tell me about smart grid integration',
  ],
  nzia_policy: [
    'What are the NZIA compliance requirements?',
    'Explain the FERX framework',
    'How does the Italian PV auction work?',
  ],
  nzia_market_impact: [
    'What is the EU manufacturing target for 2030?',
    'How will NZIA affect European PV manufacturers?',
    'Show me country-level PV forecasts',
  ],
  manufacturer_financial: [
    'Compare JinkoSolar and LONGi financial performance',
    'What are Trina Solar\'s recent quarterly results?',
    'Show me margin trends for top manufacturers',
  ],
  leo_om: [
    'What are best practices for O&M in solar plants?',
    'How can I optimize performance monitoring?',
    'Tell me about maintenance scheduling strategies',
  ],
  weaviate: [
    'Query custom data from the database',
    'Perform complex analytics',
    'Explore relationships in the data',
  ],
};

export default function AgentDetailsModal({
  agentType,
  metadata,
  isOpen,
  onClose,
  isHired,
  onToggleHire,
  canHire,
}: AgentDetailsModalProps) {
  const { name, role, color, initial, description, premium, capabilities } = metadata;

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get color mapping
  const colorMap: Record<typeof color, { bg: string; text: string }> = {
    'navy': { bg: '#010654', text: 'white' },
    'gold': { bg: '#E89C43', text: 'white' },
    'navy-light': { bg: '#5C6BC0', text: 'white' },
    'gold-dark': { bg: '#E4C154', text: '#010654' },
    'purple': { bg: '#9C27B0', text: 'white' },
    'emerald': { bg: '#10B981', text: 'white' },
    'indigo': { bg: '#6366F1', text: 'white' },
    'teal': { bg: '#14B8A6', text: 'white' },
  };

  const badgeColors = colorMap[color];
  const sampleQuestions = SAMPLE_QUESTIONS[agentType] || [];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '85vh',
          background: 'white',
          borderRadius: '16px',
          zIndex: 1001,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          {/* Agent Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              background: badgeColors.bg,
              color: badgeColors.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: '600',
              flexShrink: 0,
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              padding: '12px',
            }}
          >
            <img
              src={`/agents/${name}.svg`}
              alt={name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)',
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = initial;
                }
              }}
            />
          </div>

          {/* Agent Name and Role */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0,
                  fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                }}
              >
                {name}
              </h2>
              {premium && (
                <span
                  style={{
                    background: '#E89C43',
                    color: 'white',
                    fontSize: '0.625rem',
                    fontWeight: '600',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Premium
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                margin: 0,
                fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              }}
            >
              {role}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          {/* Description */}
          <section style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              }}
            >
              About
            </h3>
            <p
              style={{
                fontSize: '0.9375rem',
                color: '#374151',
                lineHeight: '1.6',
                margin: 0,
                fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              }}
            >
              {description}
            </p>
          </section>

          {/* Capabilities */}
          {capabilities && capabilities.length > 0 && (
            <section style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                }}
              >
                Capabilities
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {capabilities.map((capability, index) => (
                  <li
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={badgeColors.bg}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, marginTop: '2px' }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sample Questions */}
          {sampleQuestions.length > 0 && (
            <section style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                }}
              >
                Try Asking
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sampleQuestions.map((question, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px 16px',
                      background: '#F9FAFB',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    "{question}"
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer with Action Button */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: 'transparent',
              color: '#6B7280',
              border: '1px solid #E5E7EB',
              borderRadius: '100px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Close
          </button>
          <button
            onClick={() => {
              if (canHire) {
                onToggleHire(agentType);
                onClose();
              }
            }}
            disabled={!canHire}
            style={{
              flex: 2,
              padding: '12px 24px',
              background: !canHire
                ? '#F3F4F6'
                : isHired
                  ? 'transparent'
                  : '#010654',
              color: !canHire
                ? '#9CA3AF'
                : isHired
                  ? '#010654'
                  : 'white',
              border: !canHire
                ? '1px solid #E5E7EB'
                : isHired
                  ? '1px solid #010654'
                  : 'none',
              borderRadius: '100px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: !canHire ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!canHire) return;
              if (isHired) {
                e.currentTarget.style.background = 'rgba(1, 6, 84, 0.08)';
              } else {
                e.currentTarget.style.background = '#1A1F6E';
              }
            }}
            onMouseLeave={(e) => {
              if (!canHire) return;
              if (isHired) {
                e.currentTarget.style.background = 'transparent';
              } else {
                e.currentTarget.style.background = '#010654';
              }
            }}
          >
            {!canHire ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Upgrade Required</span>
              </>
            ) : isHired ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Hired</span>
              </>
            ) : (
              <span>Hire Agent</span>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
}
