/**
 * Agent Card Component
 *
 * Individual agent card with Material Design 3 styling
 * Shows agent info, badges, and hire/unhire button
 * Matches Flask design exactly
 */

import './AgentCard.css';
import type { AgentType } from '../../constants/agents';
import type { AgentMetadata } from '../../constants/agentMetadata';

interface AgentCardProps {
  agentType: AgentType;
  metadata: AgentMetadata;
  isHired: boolean;
  userPlan: string;
  onToggleHire: (agentType: AgentType) => void;
}

export default function AgentCard({
  agentType,
  metadata,
  isHired,
  userPlan,
  onToggleHire,
}: AgentCardProps) {
  const { name, role, color, initial, badges, description, premium } = metadata;

  // Check if user can hire this agent
  const canHire = !premium || userPlan === 'premium' || userPlan === 'max' || userPlan === 'admin';
  const requiresUpgrade = premium && !canHire;

  // Get badge label
  const getBadgeLabel = (badge: string) => {
    const labels: Record<string, string> = {
      datahub: 'DataHub',
      charts: 'Charts',
      news: 'News DB',
      ai: 'AI',
      code: 'Code Interpreter',
    };
    return labels[badge] || badge;
  };

  return (
    <div
      className={`agent-card ${isHired ? 'agent-card--hired' : ''}`}
      data-color={color}
      style={{
        position: 'relative',
        borderRadius: '20px',
        padding: '1.25rem',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
        minHeight: '160px',
        overflow: 'hidden',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      {/* Premium Badge */}
      {premium && !isHired && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            background: '#FFA726',
            color: 'white',
            fontSize: '0.625rem',
            fontWeight: '700',
            letterSpacing: '0.05em',
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            zIndex: 3,
            boxShadow: 'none',
          }}
        >
          PREMIUM
        </div>
      )}

      {/* Checkmark when hired */}
      <div
        className="agent-card__check"
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isHired ? 1 : 0,
          transform: isHired ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-180deg)',
          transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          zIndex: 3,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Header with initial and name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        {/* Initial circle */}
        <div
          className="agent-card__initial"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '1.375rem',
            fontWeight: '600',
            letterSpacing: '-0.02em',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
          }}
        >
          {initial}
        </div>

        {/* Name and role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            className="agent-card__name"
            style={{
              fontSize: '1rem',
              fontWeight: '500',
              color: isHired ? 'white' : '#1e293b',
              margin: 0,
              letterSpacing: '-0.02em',
              transition: 'color 0.3s ease',
              lineHeight: '1.3',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            }}
          >
            {name}
          </h3>
          <p
            className="agent-card__role"
            style={{
              fontSize: '0.625rem',
              fontWeight: '500',
              color: isHired ? 'rgba(255, 255, 255, 0.85)' : '#64748b',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              transition: 'color 0.3s ease',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            }}
          >
            {role}
          </p>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {/* Badges */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.3rem',
            marginBottom: '0.125rem',
          }}
        >
          {badges.map((badge) => (
            <span
              key={badge}
              className={`agent-card__badge agent-card__badge--${badge}`}
              style={{
                display: 'inline-block',
                fontSize: '0.625rem',
                fontWeight: '500',
                padding: '0.3rem 0.625rem',
                borderRadius: '9999px',
                border: '1px solid',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {getBadgeLabel(badge)}
            </span>
          ))}
        </div>

        {/* Description */}
        <p
          className="agent-card__description"
          style={{
            fontSize: '0.75rem',
            color: isHired ? 'rgba(255, 255, 255, 0.9)' : '#64748b',
            lineHeight: '1.5',
            margin: 0,
            flex: 1,
            fontWeight: '300',
            transition: 'color 0.3s ease',
            letterSpacing: '-0.01em',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
          }}
        >
          {description}
        </p>
      </div>

      {/* Hire/Unhire button */}
      <button
        onClick={() => !requiresUpgrade && onToggleHire(agentType)}
        disabled={requiresUpgrade}
        className={`agent-card__btn ${isHired ? 'agent-card__btn--hired' : ''}`}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: requiresUpgrade
            ? '#E0E0E0'
            : isHired
              ? 'rgba(255, 255, 255, 0.2)'
              : '#5C6BC0',
          color: requiresUpgrade ? '#9E9E9E' : 'white',
          border: isHired ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
          borderRadius: '9999px',
          fontSize: '0.8125rem',
          fontWeight: '500',
          cursor: requiresUpgrade ? 'not-allowed' : 'pointer',
          opacity: requiresUpgrade ? 0.6 : 1,
          transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.375rem',
          marginTop: '0.375rem',
          boxShadow: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!requiresUpgrade && isHired) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!requiresUpgrade && isHired) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
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

        {requiresUpgrade ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <span style={{ position: 'relative', zIndex: 1 }}>Upgrade Required</span>
          </>
        ) : isHired ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ position: 'relative', zIndex: 1 }}>Hired</span>
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span style={{ position: 'relative', zIndex: 1 }}>Hire Agent</span>
          </>
        )}
      </button>

      <style>{`
        /* MD3 State Layer for button hover */
        .agent-card__btn:hover::before {
          opacity: 0.08;
        }

        .agent-card__btn:active::before {
          opacity: 0.12;
        }
      `}</style>
    </div>
  );
}
