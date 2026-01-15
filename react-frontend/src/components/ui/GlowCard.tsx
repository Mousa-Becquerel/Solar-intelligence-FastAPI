/**
 * Glowing Card Component
 *
 * A modern card wrapper with soft diffused shadows and animated glow effects
 * Features a prominent resting shadow that intensifies on hover
 */

import { type ReactNode, type CSSProperties } from 'react';

interface GlowCardProps {
  children: ReactNode;
  /** Primary glow color - defaults to brand blue */
  glowColor?: string;
  /** Secondary accent color - defaults to brand gold */
  accentColor?: string;
  /** Whether the card is in "active" state (e.g., hired) */
  isActive?: boolean;
  /** Whether to show recommended highlight */
  isRecommended?: boolean;
  /** Custom className */
  className?: string;
  /** Custom inline styles */
  style?: CSSProperties;
  /** Click handler */
  onClick?: () => void;
}

export function GlowCard({
  children,
  glowColor = '#1e3a8a',
  accentColor = '#FFB74D',
  isActive = false,
  isRecommended = false,
  className = '',
  style = {},
  onClick,
}: GlowCardProps) {
  return (
    <>
      <style>{`
        @property --glow-hue {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
        }
        @property --glow-x {
          syntax: "<number>";
          inherits: true;
          initial-value: 50;
        }
        @property --glow-y {
          syntax: "<number>";
          inherits: true;
          initial-value: 50;
        }
        @property --glow-opacity {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
        }
        @property --border-opacity {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
        }
        @property --shadow-spread {
          syntax: "<number>";
          inherits: true;
          initial-value: 1;
        }

        .glow-card-wrapper {
          --glow-primary: ${glowColor};
          --glow-accent: ${accentColor};
          --animation-speed: 4s;
          --interaction-speed: 0.35s;
          --shadow-spread: 1;

          position: relative;
          border-radius: 20px;
          cursor: pointer;
          transition: transform var(--interaction-speed) cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow var(--interaction-speed) cubic-bezier(0.4, 0, 0.2, 1);

          /* Modern diffused shadow - resting state */
          box-shadow:
            0 4px 6px -1px rgba(30, 58, 138, 0.08),
            0 10px 15px -3px rgba(30, 58, 138, 0.12),
            0 20px 25px -5px rgba(30, 58, 138, 0.08),
            0 0 0 1px rgba(30, 58, 138, 0.04);
        }

        /* Soft glow layer behind the card */
        .glow-card-wrapper::before {
          content: "";
          position: absolute;
          inset: -8px;
          border-radius: 28px;
          background: radial-gradient(
            ellipse at center,
            rgba(30, 58, 138, 0.12) 0%,
            rgba(255, 183, 77, 0.06) 40%,
            transparent 70%
          );
          opacity: 0.8;
          filter: blur(12px);
          z-index: -2;
          transition: all var(--interaction-speed) ease;
        }

        /* Animated border gradient (hidden by default) */
        .glow-card-wrapper::after {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 22px;
          background: conic-gradient(
            from calc(var(--glow-hue) * 1deg),
            var(--glow-primary),
            var(--glow-accent),
            var(--glow-primary),
            var(--glow-accent),
            var(--glow-primary)
          );
          opacity: var(--border-opacity);
          transition: opacity var(--interaction-speed) ease;
          z-index: -1;
          animation: rotate-glow var(--animation-speed) linear infinite paused;
        }

        .glow-card-wrapper:hover {
          transform: translateY(-6px) scale(1.02);

          /* Enhanced shadow on hover */
          box-shadow:
            0 8px 10px -2px rgba(30, 58, 138, 0.1),
            0 20px 25px -5px rgba(30, 58, 138, 0.15),
            0 40px 50px -12px rgba(30, 58, 138, 0.12),
            0 0 60px -10px rgba(255, 183, 77, 0.2),
            0 0 0 1px rgba(30, 58, 138, 0.06);

          --glow-opacity: 1;
          --border-opacity: 0.5;
        }

        .glow-card-wrapper:hover::before {
          opacity: 1;
          filter: blur(20px);
          inset: -15px;
          background: radial-gradient(
            ellipse at center,
            rgba(30, 58, 138, 0.18) 0%,
            rgba(255, 183, 77, 0.12) 50%,
            transparent 80%
          );
        }

        .glow-card-wrapper:hover::after {
          animation-play-state: running;
        }

        .glow-card-wrapper:active {
          transform: translateY(-3px) scale(1.01);
        }

        /* Active state (hired) - subtle gold glow */
        .glow-card-wrapper.is-active {
          box-shadow:
            0 4px 6px -1px rgba(245, 158, 11, 0.1),
            0 10px 15px -3px rgba(245, 158, 11, 0.12),
            0 20px 25px -5px rgba(245, 158, 11, 0.1),
            0 0 30px -5px rgba(255, 183, 77, 0.25),
            0 0 0 1px rgba(245, 158, 11, 0.1);
          --border-opacity: 0.3;
        }

        .glow-card-wrapper.is-active::before {
          background: radial-gradient(
            ellipse at center,
            rgba(255, 183, 77, 0.15) 0%,
            rgba(245, 158, 11, 0.08) 40%,
            transparent 70%
          );
        }

        .glow-card-wrapper.is-active::after {
          animation-play-state: running;
        }

        .glow-card-wrapper.is-active:hover {
          box-shadow:
            0 8px 10px -2px rgba(245, 158, 11, 0.12),
            0 20px 25px -5px rgba(245, 158, 11, 0.18),
            0 40px 50px -12px rgba(245, 158, 11, 0.15),
            0 0 70px -10px rgba(255, 183, 77, 0.35),
            0 0 0 1px rgba(245, 158, 11, 0.15);
          --border-opacity: 0.7;
        }

        /* Recommended highlight - gold emphasis */
        .glow-card-wrapper.is-recommended {
          box-shadow:
            0 4px 6px -1px rgba(245, 158, 11, 0.12),
            0 10px 15px -3px rgba(245, 158, 11, 0.15),
            0 20px 25px -5px rgba(245, 158, 11, 0.12),
            0 0 40px -5px rgba(255, 183, 77, 0.3),
            0 0 0 2px rgba(255, 183, 77, 0.4);
        }

        .glow-card-wrapper.is-recommended::before {
          background: radial-gradient(
            ellipse at center,
            rgba(255, 183, 77, 0.2) 0%,
            rgba(245, 158, 11, 0.1) 40%,
            transparent 70%
          );
          opacity: 1;
        }

        .glow-card-wrapper.is-recommended::after {
          background: conic-gradient(
            from calc(var(--glow-hue) * 1deg),
            #FFB74D,
            #F59E0B,
            #FFB74D,
            #F59E0B,
            #FFB74D
          );
          --border-opacity: 0.6;
          animation-play-state: running;
        }

        /* Inner card content */
        .glow-card-content {
          position: relative;
          background: white;
          border-radius: 18px;
          height: 100%;
          z-index: 2;
          overflow: hidden;
        }

        /* Inner highlight gradient */
        .glow-card-content::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 18px;
          background: radial-gradient(
            circle at calc(var(--glow-x, 50) * 1%) calc(var(--glow-y, 50) * 1%),
            rgba(255, 183, 77, 0.08) 0%,
            rgba(30, 58, 138, 0.04) 30%,
            transparent 60%
          );
          opacity: var(--glow-opacity);
          pointer-events: none;
          transition: opacity var(--interaction-speed) ease;
          z-index: 10;
        }

        /* Shimmer effect on hover */
        .glow-card-content::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transition: left 0.6s ease;
          z-index: 11;
          pointer-events: none;
        }

        .glow-card-wrapper:hover .glow-card-content::before {
          left: 100%;
        }

        @keyframes rotate-glow {
          from {
            --glow-hue: 0;
          }
          to {
            --glow-hue: 360;
          }
        }

        /* Mouse tracking CSS variables */
        .glow-card-wrapper {
          --glow-x: 50;
          --glow-y: 50;
        }
      `}</style>

      <div
        className={`glow-card-wrapper ${isActive ? 'is-active' : ''} ${isRecommended ? 'is-recommended' : ''} ${className}`}
        style={style}
        onClick={onClick}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          e.currentTarget.style.setProperty('--glow-x', String(x));
          e.currentTarget.style.setProperty('--glow-y', String(y));
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.setProperty('--glow-x', '50');
          e.currentTarget.style.setProperty('--glow-y', '50');
        }}
      >
        <div className="glow-card-content">
          {children}
        </div>
      </div>
    </>
  );
}

export default GlowCard;