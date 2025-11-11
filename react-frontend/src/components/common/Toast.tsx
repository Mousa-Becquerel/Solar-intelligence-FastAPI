/**
 * Toast Notification Component
 *
 * Simple toast notifications matching Material Design 3
 * Shows success/error messages that auto-dismiss
 * Matches Flask notification style
 */

import { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '1rem 1.75rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '500',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        background: type === 'success' ? '#10b981' : '#ef4444',
        color: 'white',
        animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
      }}
    >
      {message}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}
