/**
 * Sidebar Expand/Collapse Button
 *
 * Positioned at the top of the sidebar with MD3 styling
 */

import { useUIStore } from '../../stores';

export default function ExpandButton() {
  const { sidebarExpanded, toggleSidebar } = useUIStore();

  return (
    <button
      onClick={toggleSidebar}
      className="expand-button"
      aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      style={{
        position: 'relative',
        width: '40px',
        height: '40px',
        background: '#ffffff',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#5C6BC0',
        fontSize: '20px',
        fontWeight: '500',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        margin: sidebarExpanded ? '16px auto 0 16px' : '16px auto 0 auto',
      }}
    >
      {/* Arrow icon */}
      <span
        style={{
          display: 'inline-block',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: sidebarExpanded ? 'rotate(0deg)' : 'rotate(180deg)',
        }}
      >
        ‹
      </span>

      <style>{`
        .expand-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #5C6BC0;
          opacity: 0;
          border-radius: 12px;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .expand-button:hover::before {
          opacity: 0.08;
        }

        .expand-button:active::before {
          opacity: 0.12;
        }

        .expand-button:focus-visible {
          outline: 2px solid #5C6BC0;
          outline-offset: 2px;
        }
      `}</style>
    </button>
  );
}
