/**
 * Agent Card Component
 *
 * Individual agent card with Material Design 3 styling
 * Shows agent info, badges, and hire/unhire button
 * Matches Flask design exactly
 */

import { useNavigate } from 'react-router-dom';
import './AgentCard.css';
import type { AgentType } from '../../constants/agents';
import type { AgentMetadata } from '../../constants/agentMetadata';

interface AgentCardProps {
  agentType: AgentType;
  metadata: AgentMetadata;
  isHired: boolean;
  userPlan: string;
  userRole?: string;  // User's role for admin-only agents
  onToggleHire: (agentType: AgentType) => Promise<void> | void;
  onCardClick?: (agentType: AgentType) => void;
  isRecommended?: boolean;
  isInFallbackMode?: boolean;  // True if free user has exhausted trial queries
}

export default function AgentCard({
  agentType,
  metadata,
  isHired,
  userPlan,
  userRole = 'demo',
  onToggleHire,
  onCardClick,
  isRecommended = false,
  isInFallbackMode = false,
}: AgentCardProps) {
  const navigate = useNavigate();
  const { name, role, color, initial, premium } = metadata;

  // Check if this is an admin-only agent (Eco/storage_optimization)
  const isAdminOnly = agentType === 'storage_optimization';
  const isAdmin = userRole === 'admin';

  // Free users in fallback mode can ONLY hire Sam (seamless agent)
  // Free users in trial can hire ALL agents
  // Analyst users cannot hire strategist agents (Nova/Nina)
  // Strategist/Enterprise/Admin users can hire all agents
  // Admin-only agents (Eco) require admin role
  const isSamAgent = agentType === 'seamless';
  const canHire = isAdminOnly
    ? isAdmin  // Admin-only agents require admin role
    : (userPlan === 'free' && isInFallbackMode)
      ? isSamAgent  // In fallback mode, only Sam is available
      : (
          !premium ||
          (userPlan === 'free' && !isInFallbackMode) ||  // Free users can try all agents during trial
          ['strategist', 'enterprise', 'admin', 'premium', 'max'].includes(userPlan)
        );
  // Show upgrade prompt for agents that can't be hired (or admin-only for non-admins)
  const requiresUpgrade = !canHire;

  // Unified color scheme: Yellow background with blue icon
  const badgeColors = { bg: '#FFB74D', text: '#1e3a8a' };

  return (
    <div
      className={`agent-card ${isHired ? 'agent-card--hired' : ''}`}
      data-color={color}
      onClick={() => onCardClick?.(agentType)}
      style={{
        position: 'relative',
        borderRadius: '16px', // MD3 large corner radius
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: '140px',
        height: '100%', // Fill parent container
        overflow: 'hidden', // Prevent content overflow
        boxSizing: 'border-box',
        boxShadow: 'none',
        border: 'none', // MD3 flat design - no borders
        background: 'white',
        // Add top border for recommended agents
        borderTop: isRecommended ? '3px solid #FFB74D' : 'none',
        paddingTop: isRecommended ? '17px' : '20px', // Adjust padding to maintain height
        paddingLeft: '20px',
      }}
    >
      {/* Tier Badge - Top Right - MD3 Chip Style */}
      {/* Strategist badge for premium agents (Nova, Nina) */}
      {/* Analyst badge for non-premium, non-Sam agents */}
      {/* No badge for Sam (seamless) */}
      {premium ? (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'linear-gradient(135deg, #FFB74D 0%, #F59E0B 100%)',
            color: '#1e293b',
            fontSize: '0.6875rem',
            fontWeight: '600',
            padding: '5px 10px',
            borderRadius: '16px',
            zIndex: 3,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          Strategist
        </div>
      ) : !isSamAgent ? (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'linear-gradient(135deg, #E8F0FE 0%, #DBEAFE 100%)',
            color: '#1e3a8a',
            fontSize: '0.6875rem',
            fontWeight: '600',
            padding: '5px 10px',
            borderRadius: '16px',
            zIndex: 3,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            border: '1px solid rgba(30, 58, 138, 0.1)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Analyst
        </div>
      ) : null}

      {/* Header with small square icon and name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          marginTop: '24px', // Space for tier badge
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Small Square Icon - Image or Letter */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: badgeColors.bg,
            color: badgeColors.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.125rem',
            fontWeight: '600',
            flexShrink: 0,
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            padding: '6px',
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
              filter: 'brightness(0) saturate(100%) invert(18%) sepia(85%) saturate(2476%) hue-rotate(215deg) brightness(93%) contrast(98%)', // Make SVG blue (#1e3a8a)
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

      {/* Action Buttons - Chat and Hire */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: 'auto',
          flexShrink: 0,
        }}
      >
        {/* Chat Button - Left side */}
        <button
          onClick={async (e) => {
            e.stopPropagation(); // Prevent card click
            // Auto-hire if not already hired (and user can hire)
            if (!isHired && !requiresUpgrade) {
              await onToggleHire(agentType);
            }
            // Navigate to chat with this agent selected
            if (!requiresUpgrade) {
              navigate(`/chat?agent=${agentType}`);
            }
          }}
          disabled={requiresUpgrade}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: requiresUpgrade ? '#f5f5f5' : '#1e3a8a', // Blue for chat
            color: requiresUpgrade ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '9999px', // Full rounded
            fontSize: '0.8125rem',
            fontWeight: '500',
            cursor: requiresUpgrade ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            minHeight: '36px',
            boxShadow: 'none',
          }}
          onMouseEnter={(e) => {
            if (!requiresUpgrade) {
              e.currentTarget.style.background = '#1e40af'; // Lighter blue on hover
            }
          }}
          onMouseLeave={(e) => {
            if (!requiresUpgrade) {
              e.currentTarget.style.background = '#1e3a8a';
            }
          }}
        >
          Chat
        </button>

        {/* Hire/Unhire Button - Right side */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            if (!requiresUpgrade) onToggleHire(agentType);
          }}
          disabled={requiresUpgrade}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: requiresUpgrade
              ? '#f5f5f5'
              : isHired
                ? '#FFB74D' // Yellow for hired state (to unhire)
                : '#f5f5f5', // Gray for not hired
            color: requiresUpgrade
              ? '#9ca3af'
              : isHired
                ? 'white'
                : '#64748b',
            border: 'none',
            borderRadius: '9999px', // Full rounded
            fontSize: '0.8125rem',
            fontWeight: '500',
            cursor: requiresUpgrade ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            minHeight: '36px',
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
              e.currentTarget.style.background = '#F5A73B'; // Darker yellow on hover
            } else {
              e.currentTarget.style.background = '#eeeeee';
            }
          }}
          onMouseLeave={(e) => {
            if (requiresUpgrade) {
              e.currentTarget.style.background = '#f5f5f5';
              return;
            }
            if (isHired) {
              e.currentTarget.style.background = '#FFB74D';
            } else {
              e.currentTarget.style.background = '#f5f5f5';
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
              <span>{isAdminOnly ? 'Admin Only' : 'Upgrade'}</span>
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
