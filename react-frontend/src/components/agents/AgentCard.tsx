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
  onCardClick?: (agentType: AgentType) => void;
}

export default function AgentCard({
  agentType,
  metadata,
  isHired,
  userPlan,
  onToggleHire,
  onCardClick,
}: AgentCardProps) {
  const { name, role, color, initial, description, premium } = metadata;

  // Check if user can hire this agent
  const canHire = !premium || userPlan === 'premium' || userPlan === 'max' || userPlan === 'admin';
  const requiresUpgrade = premium && !canHire;

  // Get color mapping for circular badge
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

  return (
    <div
      className={`agent-card ${isHired ? 'agent-card--hired' : ''}`}
      data-color={color}
      onClick={() => onCardClick?.(agentType)}
      style={{
        position: 'relative',
        borderRadius: '16px', // MD3 large corner radius
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: '140px',
        overflow: 'hidden',
        boxShadow: 'none',
        border: 'none', // MD3 flat design - no borders
        background: 'white',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f5f5f5'; // Slightly darker on hover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white';
      }}
    >
      {/* Hired Indicator - Top Right (takes priority over premium badge) */}
      {isHired && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: '#10B981',
            color: 'white',
            fontSize: '0.625rem',
            fontWeight: '600',
            padding: '4px 8px',
            borderRadius: '4px',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Hired
        </div>
      )}

      {/* Premium Badge - Top Right (only shown when not hired) */}
      {premium && !isHired && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: '#E89C43',
            color: 'white',
            fontSize: '0.625rem',
            fontWeight: '600',
            padding: '4px 8px',
            borderRadius: '4px',
            zIndex: 3,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Premium
        </div>
      )}

      {/* Header with small square icon and name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        {/* Small Square Icon - Image or Letter */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            background: badgeColors.bg,
            color: badgeColors.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: '600',
            flexShrink: 0,
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            padding: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Try to load agent icon, fallback to initial */}
          <img
            src={`/agents/${name}.svg`}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'brightness(0) invert(1)', // Make SVG white
            }}
            onError={(e) => {
              // Hide image and show initial letter on error
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = initial;
              }
            }}
          />
        </div>

        {/* Name, Provider, and Role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: '0.9375rem',
              fontWeight: '600',
              color: '#1e3a8a', // Same blue as chat screen
              margin: '0 0 4px 0',
              letterSpacing: '-0.01em',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              lineHeight: '1.3',
            }}
          >
            {name}
          </h3>
          <p
            style={{
              fontSize: '0.6875rem',
              color: '#9CA3AF',
              lineHeight: '1.3',
              margin: '0 0 4px 0',
              fontWeight: '500',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}
          >
            {metadata.provider}
          </p>
          <p
            style={{
              fontSize: '0.8125rem',
              color: '#6B7280',
              lineHeight: '1.4',
              margin: '0 0 8px 0',
              fontWeight: '400',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            }}
          >
            {role}
          </p>
          {/* Feature Badges */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
            }}
          >
            {metadata.badges.map((badge) => (
              <span
                key={badge}
                style={{
                  fontSize: '0.625rem',
                  fontWeight: '500',
                  color: '#6B7280',
                  background: '#F3F4F6',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                {badge === 'datahub' ? 'Data' : badge === 'charts' ? 'Charts' : badge}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons - Hire and Explore */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: 'auto',
        }}
      >
        {/* Hire/Unhire Button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            if (!requiresUpgrade) onToggleHire(agentType);
          }}
          disabled={requiresUpgrade}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: requiresUpgrade
              ? '#f5f5f5'
              : isHired
                ? '#10B981'
                : '#FFB74D', // Butterscotch - matching profile page
            color: requiresUpgrade ? '#9ca3af' : isHired ? 'white' : '#1e293b', // Dark text on butterscotch
            border: 'none',
            borderRadius: '9999px', // Full rounded
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: requiresUpgrade ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            minHeight: '40px',
            boxShadow: 'none',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            if (requiresUpgrade) {
              e.currentTarget.style.background = '#eeeeee';
              return;
            }
            if (isHired) {
              e.currentTarget.style.background = '#059669';
            } else {
              e.currentTarget.style.background = '#F5A73B'; // Slightly darker butterscotch
            }
          }}
          onMouseLeave={(e) => {
            if (requiresUpgrade) {
              e.currentTarget.style.background = '#f5f5f5';
              return;
            }
            if (isHired) {
              e.currentTarget.style.background = '#10B981';
            } else {
              e.currentTarget.style.background = '#FFB74D';
            }
          }}
        >
          {requiresUpgrade ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Upgrade</span>
            </>
          ) : isHired ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Hired</span>
            </>
          ) : (
            <span>Hire</span>
          )}
        </button>

        {/* Explore Button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            onCardClick?.(agentType);
          }}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: '#f5f5f5', // MD3 secondary button background
            color: '#64748b',
            border: 'none',
            borderRadius: '9999px', // Full rounded
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            minHeight: '40px',
            boxShadow: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#eeeeee';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f5f5f5';
          }}
        >
          <span>Explore</span>
        </button>
      </div>

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
