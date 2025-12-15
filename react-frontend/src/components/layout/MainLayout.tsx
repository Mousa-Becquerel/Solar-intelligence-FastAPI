/**
 * Main Layout
 *
 * CSS Grid 3-zone layout: Sidebar | Chat | Artifact
 * Matches Flask layout exactly
 */

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useUIStore } from '../../stores';
import SidebarPanel from '../sidebar/SidebarPanel';

export default function MainLayout() {
  const { sidebarExpanded, artifactOpen, artifactContent, closeArtifact } = useUIStore();


  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  // Reset inline grid styles when sidebar state changes
  useEffect(() => {
    const mainLayout = document.querySelector('.main-layout');
    if (mainLayout && mainLayout instanceof HTMLElement) {
      // Clear any inline grid styles when sidebar toggles
      mainLayout.style.gridTemplateColumns = '';
    }
  }, [sidebarExpanded]);

  // Reset inline grid styles when artifact panel closes
  useEffect(() => {
    if (!artifactOpen) {
      const mainLayout = document.querySelector('.main-layout');
      if (mainLayout && mainLayout instanceof HTMLElement) {
        // Clear inline grid styles when artifact closes
        // This allows CSS to take over with default grid layout
        mainLayout.style.gridTemplateColumns = '';
      }
    }
  }, [artifactOpen]);

  // Handle artifact panel resizing
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();

    const artifactPanel = document.querySelector('.artifact-panel');
    const mainLayout = document.querySelector('.main-layout');

    // Get the ACTUAL computed sidebar width at the start
    const actualSidebarWidth = mainLayout ?
      getComputedStyle(mainLayout).gridTemplateColumns.split(' ')[0] :
      (sidebarExpanded ? '280px' : '72px');

    // IMMEDIATELY disable transitions for instant response
    if (mainLayout && mainLayout instanceof HTMLElement) {
      mainLayout.style.transition = 'none';
    }
    if (artifactPanel) {
      artifactPanel.classList.add('resizing');
    }

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Prevent default to avoid any browser lag
      moveEvent.preventDefault();

      // Calculate distance from right edge of viewport
      const distanceFromRight = window.innerWidth - moveEvent.clientX;
      const newWidthPercent = Math.min(Math.max((distanceFromRight / window.innerWidth) * 100, 25), 50);

      // Update grid directly - sidebar stays fixed
      if (mainLayout && mainLayout instanceof HTMLElement) {
        mainLayout.style.gridTemplateColumns = `${actualSidebarWidth} 1fr ${newWidthPercent}%`;
      }

      // Also update CSS variable for consistency
      const root = document.documentElement;
      root.style.setProperty('--artifact-width', `${newWidthPercent}%`);
    };

    const handleMouseUp = () => {

      // Re-enable transitions
      if (mainLayout && mainLayout instanceof HTMLElement) {
        mainLayout.style.transition = '';
      }

      // Remove active class
      artifactPanel?.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="app-shell">
      <div
        className="main-layout"
        data-sidebar-expanded={sidebarExpanded}
        data-artifact-open={artifactOpen}
      >
        {/* Sidebar Panel */}
        <div className="sidebar-panel">
          <SidebarPanel />
        </div>

        {/* Chat Panel (main content area) */}
        <div className="chat-panel">
          <Outlet />
        </div>

        {/* Artifact Panel */}
        <div className="artifact-panel">
          {artifactOpen && artifactContent && (
            <>
              {/* Resize handle */}
              <div
                className="artifact-resize-handle"
                onMouseDown={handleResizeStart}
              />

              {/* Close button */}
              <button
                onClick={closeArtifact}
                className="artifact-close-btn"
                aria-label="Close panel"
              >
                ✕
              </button>

              {/* Dynamic content from store */}
              {artifactContent}
            </>
          )}
        </div>
      </div>

      <style>{`
        /* ============================================
           ROOT: CSS Variables for Dynamic Widths
           ============================================ */
        :root {
          /* Default state: sidebar EXPANDED, no artifact */
          --sidebar-width: 280px;
          --artifact-width: 0px;

          /* Transition timing */
          --layout-transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ============================================
           APP SHELL - Root Container
           ============================================ */
        .app-shell {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* ============================================
           MAIN LAYOUT - CSS Grid Container
           3 Columns: [Sidebar] [Chat] [Artifact]
           ============================================ */
        .main-layout {
          display: grid;
          /* Always 3 columns - artifact starts at 0 width */
          grid-template-columns: var(--sidebar-width) 1fr 0px;
          grid-template-rows: 1fr;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          transition: grid-template-columns var(--layout-transition);
        }

        /* State: Sidebar collapsed */
        .main-layout[data-sidebar-expanded="false"] {
          --sidebar-width: 72px;
        }

        /* State: Sidebar expanded */
        .main-layout[data-sidebar-expanded="true"] {
          --sidebar-width: 280px;
        }

        /* State: Artifact open - expand third column */
        .main-layout[data-artifact-open="true"] {
          --artifact-width: 50%;
          grid-template-columns: var(--sidebar-width) 1fr var(--artifact-width);
        }

        /* ============================================
           ZONE 1: SIDEBAR PANEL
           ============================================ */
        .sidebar-panel {
          grid-column: 1;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: #F5F5F5;
          border-top-right-radius: 16px;
          border-bottom-right-radius: 16px;
          display: flex;
          flex-direction: column;
          position: relative;
          min-width: 0;
        }

        /* ============================================
           ZONE 2: CHAT PANEL
           ============================================ */
        .chat-panel {
          grid-column: 2;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          min-width: 0;
        }

        /* ============================================
           ZONE 3: ARTIFACT PANEL
           ============================================ */
        .artifact-panel {
          grid-column: 3;
          height: 100vh;
          overflow: hidden;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          padding: 0;
          position: relative;
          transition: padding 0.3s ease;
        }

        /* When artifact is open, add padding and enable scroll */
        .main-layout[data-artifact-open="true"] .artifact-panel {
          padding: 1.5rem;
          padding-right: 1rem;
          overflow-y: auto;
          overflow-x: hidden;
        }

        /* Resize handle for artifact panel - visible divider like Claude.ai */
        .artifact-resize-handle {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          cursor: ew-resize;
          background: rgba(0, 0, 0, 0.12);
          z-index: 1000;
          transition: all 0.2s ease;
        }

        /* Add wider invisible hit area for easier grabbing */
        .artifact-resize-handle::after {
          content: '';
          position: absolute;
          left: -6px;
          top: 0;
          bottom: 0;
          width: 14px;
          background: transparent;
        }

        .artifact-resize-handle:hover {
          background: rgba(251, 191, 36, 0.8);
          width: 3px;
          left: -0.5px;
        }

        .artifact-resize-handle:active {
          background: rgba(251, 191, 36, 1);
          width: 4px;
          left: -1px;
        }

        /* Visual grip indicator - shown on hover */
        .artifact-resize-handle::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 5px;
          height: 64px;
          background: rgba(251, 191, 36, 1);
          border-radius: 3px;
          opacity: 0;
          transition: opacity 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .artifact-resize-handle:hover::before {
          opacity: 1;
        }

        /* Active resizing state */
        .artifact-panel.resizing {
          transition: none;
        }

        .artifact-panel.resizing .artifact-resize-handle {
          background: rgba(251, 191, 36, 0.15);
        }

        .artifact-panel.resizing .artifact-resize-handle::before {
          opacity: 1;
          background: rgba(251, 191, 36, 1);
        }

        /* Close button - Absolute position within artifact panel */
        .artifact-close-btn {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 1.5rem;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }

        .artifact-close-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .artifact-close-btn:active {
          background: rgba(0, 0, 0, 0.08);
        }

        /* Nearly invisible scrollbar styling */
        .sidebar-panel::-webkit-scrollbar,
        .artifact-panel::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-panel::-webkit-scrollbar-track,
        .artifact-panel::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-panel::-webkit-scrollbar-thumb,
        .artifact-panel::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 2px;
        }

        .sidebar-panel::-webkit-scrollbar-thumb:hover,
        .artifact-panel::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.15);
        }

        /* ============================================
           RESPONSIVE BEHAVIOR
           ============================================ */

        /* Tablet: Artifact becomes overlay */
        @media (max-width: 1200px) {
          .main-layout[data-artifact-open="true"] {
            --artifact-width: 0px;
          }

          .artifact-panel {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 50%;
            min-width: 400px;
            max-width: 600px;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 1;
            visibility: hidden;
          }

          .main-layout[data-artifact-open="true"] .artifact-panel {
            transform: translateX(0);
            visibility: visible;
          }

          /* Backdrop overlay */
          .main-layout::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }

          .main-layout[data-artifact-open="true"]::after {
            opacity: 1;
            pointer-events: auto;
          }
        }

        /* Mobile: Full-width artifact */
        @media (max-width: 768px) {
          .artifact-panel {
            width: 100%;
            min-width: unset;
            max-width: unset;
            display: none;
          }

          .main-layout[data-artifact-open="true"] .artifact-panel {
            display: flex;
          }

          /* Force sidebar collapsed on mobile */
          .main-layout {
            --sidebar-width: 60px;
          }
        }

        /* Very small mobile */
        @media (max-width: 480px) {
          .main-layout {
            --sidebar-width: 50px;
          }
        }

        /* GPU acceleration for smooth transitions */
        .sidebar-panel,
        .chat-panel,
        .artifact-panel {
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        /* Accessibility - Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .main-layout,
          .sidebar-panel,
          .artifact-panel {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
