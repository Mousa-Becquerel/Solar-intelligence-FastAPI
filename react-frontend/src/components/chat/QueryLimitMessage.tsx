/**
 * Query Limit Reached Message
 *
 * Material Design 3 styled message shown when user hits query limit
 * Offers options to upgrade or complete survey for more queries
 */

interface QueryLimitMessageProps {
  onUpgrade: () => void;
  onTakeSurvey: () => void;
  surveyStage: 1 | 2;
  bothSurveysCompleted?: boolean;
}

export default function QueryLimitMessage({ onUpgrade, onTakeSurvey, surveyStage, bothSurveysCompleted = false }: QueryLimitMessageProps) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
        {/* Icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFB74D 0%, #FF9800 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#0a1850',
            textAlign: 'center',
            margin: '0 0 0.5rem 0',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            letterSpacing: '-0.02em',
          }}
        >
          Query Limit Reached
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '0.875rem',
            color: 'rgba(10, 24, 80, 0.7)',
            textAlign: 'center',
            lineHeight: '1.5',
            margin: '0 0 1.5rem 0',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
          }}
        >
          {bothSurveysCompleted
            ? "You've reached your maximum free query limit. Upgrade to premium to continue:"
            : "You've reached your free query limit. Choose an option below to continue:"}
        </p>

        {/* Options Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: bothSurveysCompleted ? '1fr' : '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          {/* Survey Option - Only show if surveys are not completed */}
          {!bothSurveysCompleted && (
            <button
            onClick={onTakeSurvey}
            style={{
              background: '#FFB74D',
              color: '#1e3a8a',
              border: 'none',
              borderRadius: '12px',
              padding: '1rem 0.75rem',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.125rem', lineHeight: 1.3 }}>
              Take Survey
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, lineHeight: 1.2 }}>
              Get +5 queries
            </div>
          </button>
          )}

          {/* Upgrade Option */}
          <button
            onClick={onUpgrade}
            style={{
              background: '#1e3a8a',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '1rem 0.75rem',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.125rem', lineHeight: 1.3 }}>
              Upgrade Plan
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, lineHeight: 1.2 }}>
              Unlimited queries
            </div>
          </button>
        </div>

        {/* Info text */}
        {!bothSurveysCompleted && (
          <p
            style={{
              fontSize: '0.75rem',
              color: 'rgba(10, 24, 80, 0.5)',
              textAlign: 'center',
              margin: '0.75rem 0 0 0',
              fontStyle: 'italic',
            }}
          >
            {surveyStage === 1
              ? 'Complete a quick 5-step survey to unlock 5 more queries'
              : 'One more survey to go! Get 5 additional queries'}
          </p>
        )}
        {bothSurveysCompleted && (
          <p
            style={{
              fontSize: '0.75rem',
              color: 'rgba(10, 24, 80, 0.5)',
              textAlign: 'center',
              margin: '0.75rem 0 0 0',
              fontStyle: 'italic',
            }}
          >
            Upgrade to premium to continue using our services
          </p>
        )}
    </div>
  );
}
