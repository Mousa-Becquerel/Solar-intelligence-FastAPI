/**
 * Artifact Panel Component
 *
 * Side panel that slides in from the right for displaying dynamic content
 * Used for contact forms, maps, dashboards, visualizations, etc.
 * Matches Flask design exactly
 */

import { useState, useEffect, ReactNode } from 'react';

interface ArtifactPanelProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export default function ArtifactPanel({
  isOpen,
  title,
  children,
  onClose,
}: ArtifactPanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  console.log('🎨 [ArtifactPanel] Render:', { isOpen, isVisible, title });

  useEffect(() => {
    console.log('🎨 [ArtifactPanel] useEffect triggered, isOpen:', isOpen);
    if (isOpen) {
      // Delay to allow CSS transition
      setTimeout(() => {
        console.log('🎨 [ArtifactPanel] Setting isVisible=true');
        setIsVisible(true);
      }, 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen && !isVisible) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`artifact-backdrop ${isVisible ? 'visible' : ''}`}
        onClick={onClose}
      />

      {/* Side panel */}
      <div className={`artifact-panel ${isVisible ? 'open' : ''}`}>
        {/* Header */}
        <div className="artifact-header">
          <h2 className="artifact-title">{title}</h2>
          <button
            className="artifact-close-btn"
            onClick={onClose}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="artifact-content">{children}</div>
      </div>

      <style>{`
        /* Backdrop */
        .artifact-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 999;
          pointer-events: none;
        }

        .artifact-backdrop.visible {
          opacity: 1;
          pointer-events: auto;
        }

        /* Panel */
        .artifact-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 600px;
          max-width: 100%;
          background: white;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .artifact-panel.open {
          transform: translateX(0);
        }

        /* Header */
        .artifact-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          background: white;
        }

        .artifact-title {
          font-size: 1.25rem;
          font-weight: 500;
          color: #1e293b;
          margin: 0;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .artifact-close-btn {
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
          transition: background-color 0.2s;
        }

        .artifact-close-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        /* Content */
        .artifact-content {
          flex: 1;
          overflow-y: auto;
          padding: 2rem 1.5rem;
        }

        /* Scrollbar styling */
        .artifact-content::-webkit-scrollbar {
          width: 6px;
        }

        .artifact-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .artifact-content::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }

        .artifact-content::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .artifact-panel {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
