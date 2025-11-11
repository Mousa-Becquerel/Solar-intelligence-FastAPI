/**
 * Suggested Queries Component
 *
 * MD3 flat pill-shaped query suggestions
 * Matches Flask design exactly
 */

import { AGENT_PROMPTS, type AgentType } from '../../constants/agents';

interface SuggestedQueriesProps {
  agentType: AgentType;
  onQueryClick: (query: string) => void;
  visible: boolean;
}

export default function SuggestedQueries({
  agentType,
  onQueryClick,
  visible,
}: SuggestedQueriesProps) {
  const queries = AGENT_PROMPTS[agentType] || AGENT_PROMPTS.market;

  // Don't render at all when not visible
  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto 1.5rem auto',
        padding: '0 1rem',
        animation: 'fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.75rem',
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onQueryClick(query.prompt)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.75rem 1.125rem',
              background: '#F3F4F9',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              fontSize: '0.8125rem',
              fontWeight: '400',
              color: '#1e293b',
              letterSpacing: '-0.01em',
              boxShadow: 'none',
              position: 'relative',
              overflow: 'hidden',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E8EAF6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F3F4F9';
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
                background: '#5C6BC0',
                opacity: 0,
                transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: 'none',
              }}
            />

            {/* Icon */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: '20px',
                height: '20px',
                position: 'relative',
                zIndex: 1,
              }}
              dangerouslySetInnerHTML={{ __html: query.icon }}
            />

            {/* Text */}
            <span
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '500px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {query.prompt}
            </span>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
