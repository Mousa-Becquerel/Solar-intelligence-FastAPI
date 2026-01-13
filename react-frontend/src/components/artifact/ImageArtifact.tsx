/**
 * Image Artifact Component
 *
 * Displays generated BIPV images in the artifact panel
 * with zoom controls and download functionality
 */

import { useState } from 'react';

interface ImageArtifactProps {
  imageData: string; // base64 encoded
  mimeType: string;
  title?: string;
  description?: string;
}

export default function ImageArtifact({
  imageData,
  mimeType,
  title = 'Generated BIPV Visualization',
  description,
}: ImageArtifactProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleDownload = () => {
    // Create blob from base64
    const byteCharacters = atob(imageData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    link.download = `bipv-design-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const imageUrl = `data:${mimeType};base64,${imageData}`;

  return (
    <div className="image-artifact">
      {/* Title */}
      {title && <h3 className="image-title">{title}</h3>}

      {/* Description */}
      {description && <p className="image-description">{description}</p>}

      {/* Toolbar */}
      <div className="image-toolbar">
        <div className="zoom-controls">
          <button
            className="toolbar-btn"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            title="Zoom out"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button
            className="toolbar-btn"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            title="Zoom in"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button
            className="toolbar-btn"
            onClick={handleResetZoom}
            title="Reset zoom"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        <div className="action-controls">
          <button
            className="toolbar-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isFullscreen ? (
                <>
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </>
              ) : (
                <>
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </>
              )}
            </svg>
          </button>
          <button
            className="toolbar-btn download-btn"
            onClick={handleDownload}
            title="Download image"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Image container */}
      <div className={`image-container ${isFullscreen ? 'fullscreen' : ''}`}>
        <div
          className="image-wrapper"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="generated-image"
          />
        </div>
        {isFullscreen && (
          <button
            className="fullscreen-close"
            onClick={toggleFullscreen}
            title="Close fullscreen"
          >
            ✕
          </button>
        )}
      </div>

      <style>{`
        .image-artifact {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .image-title {
          font-size: 1.125rem;
          font-weight: 500;
          color: #1e293b;
          margin: 0;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .image-description {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .image-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .zoom-controls,
        .action-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .zoom-level {
          font-size: 0.875rem;
          color: #64748b;
          min-width: 50px;
          text-align: center;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border: none;
          background: transparent;
          color: #475569;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toolbar-btn:hover:not(:disabled) {
          background: #e2e8f0;
          color: #1e293b;
        }

        .toolbar-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .download-btn {
          background: #010654;
          color: white;
          padding: 0.5rem 1rem;
        }

        .download-btn:hover {
          background: #020970;
          color: white;
        }

        .image-container {
          position: relative;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          background: #f1f5f9;
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-container.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2000;
          border-radius: 0;
          background: rgba(0, 0, 0, 0.95);
        }

        .image-wrapper {
          transition: transform 0.2s ease;
          transform-origin: center center;
        }

        .generated-image {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
          display: block;
        }

        .fullscreen .generated-image {
          max-height: 95vh;
        }

        .fullscreen-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 44px;
          height: 44px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .fullscreen-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        @media (max-width: 640px) {
          .image-toolbar {
            flex-direction: column;
            gap: 0.75rem;
          }

          .zoom-controls,
          .action-controls {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
