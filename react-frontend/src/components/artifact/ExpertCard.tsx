/**
 * Expert Card Component
 *
 * Individual expert selection card with icon and description
 * Matches Flask design exactly with Material Design 3 styling
 */

interface ExpertCardProps {
  expert: {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: 'navy' | 'gold' | 'navy-light' | 'gold-dark';
  };
  selected: boolean;
  onToggle: () => void;
}

// SVG Icons for experts
const ICONS = {
  chart: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10"></line>
      <line x1="18" y1="20" x2="18" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="16"></line>
    </svg>
  ),
  solar: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="m4.93 4.93 1.41 1.41"></path>
      <path d="m17.66 17.66 1.41 1.41"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
      <path d="m6.34 17.66-1.41 1.41"></path>
      <path d="m19.07 4.93-1.41 1.41"></path>
    </svg>
  ),
  ai: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
      <path d="M16 3l-4 4-4-4"></path>
      <circle cx="8" cy="14" r="1"></circle>
      <circle cx="16" cy="14" r="1"></circle>
      <path d="M9 17h6"></path>
    </svg>
  ),
  briefcase: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </svg>
  ),
};

export default function ExpertCard({ expert, selected, onToggle }: ExpertCardProps) {
  // Color schemes from Flask expert-cards.css
  const colorSchemes = {
    navy: {
      unselected: { bg: '#E8EAF6', iconBg: '#C5CAE9', iconColor: '#3F51B5' },
      selected: { bg: '#5C6BC0', iconBg: 'white', iconColor: '#3F51B5', checkColor: '#000A55' },
    },
    gold: {
      unselected: { bg: '#FFF8E1', iconBg: '#FFE082', iconColor: '#F57C00' },
      selected: { bg: '#FFB74D', iconBg: 'white', iconColor: '#F57C00', checkColor: '#fbbf24' },
    },
    'navy-light': {
      unselected: { bg: '#F3F4F9', iconBg: '#D1D5E8', iconColor: '#5C6BC0' },
      selected: { bg: '#7986CB', iconBg: 'white', iconColor: '#3F51B5', checkColor: '#000A55' },
    },
    'gold-dark': {
      unselected: { bg: '#FFE9D5', iconBg: '#FFCC80', iconColor: '#F57C00' },
      selected: { bg: '#FFA726', iconBg: 'white', iconColor: '#F57C00', checkColor: '#fbbf24' },
    },
  };

  const colors = colorSchemes[expert.color];
  const scheme = selected ? colors.selected : colors.unselected;

  return (
    <div
      onClick={onToggle}
      style={{
        position: 'relative',
        background: scheme.bg,
        border: 'none',
        borderRadius: '28px',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        minHeight: '160px',
        overflow: 'hidden',
        boxShadow: 'none',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: scheme.iconBg,
          color: scheme.iconColor,
        }}
      >
        {ICONS[expert.icon as keyof typeof ICONS] || ICONS.chart}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <h4
          style={{
            fontSize: '0.9375rem',
            fontWeight: 500,
            color: selected ? 'white' : '#1e293b',
            margin: '0 0 0.5rem 0',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            lineHeight: 1.4,
            letterSpacing: '-0.01em',
            transition: 'color 0.3s ease',
          }}
        >
          {expert.title}
        </h4>
        <p
          style={{
            fontSize: '0.8125rem',
            fontWeight: 300,
            color: selected ? 'rgba(255, 255, 255, 0.9)' : '#64748b',
            lineHeight: 1.6,
            margin: 0,
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            letterSpacing: '-0.005em',
            transition: 'color 0.3s ease',
          }}
        >
          {expert.description}
        </p>
      </div>

      {/* Checkmark badge */}
      <div
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
          opacity: selected ? 1 : 0,
          transform: selected ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-180deg)',
          transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={selected ? (colors.selected.checkColor || '#000A55') : 'currentColor'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    </div>
  );
}
