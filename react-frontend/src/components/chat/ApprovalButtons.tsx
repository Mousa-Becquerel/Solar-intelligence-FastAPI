/**
 * Approval Buttons Component
 *
 * Displays Yes/No buttons for approval requests (e.g., expert contact)
 * Matches Flask design exactly with Material Design 3 styling
 */

import { useState } from 'react';
import { apiClient } from '../../api';
import { toast } from 'sonner';

interface ApprovalButtonsProps {
  conversationId: number;
  context: string;
  onApproved: () => void;
  onRejected: () => void;
}

export default function ApprovalButtons({
  conversationId,
  context,
  onApproved,
  onRejected,
}: ApprovalButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [responded, setResponded] = useState(false);

  const handleResponse = async (approved: boolean) => {
    if (responded || loading) return;

    setLoading(true);

    try {
      // Send approval response to backend
      const response = await fetch(`${apiClient['baseUrl']}/chat/approval_response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiClient['getAuthHeader'](),
        },
        body: JSON.stringify({
          approved,
          conversation_id: conversationId,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send approval response');
      }

      const result = await response.json();

      setResponded(true);

      // Call appropriate callback
      if (approved) {
        onApproved();
        // Show success message after a delay to open contact form
        setTimeout(() => {
          toast.success('Opening contact form...');
        }, 500);
      } else {
        onRejected();
      }
    } catch (error) {
      console.error('Error sending approval:', error);
      toast.error('Failed to process your response');
      setLoading(false);
    }
  };

  if (responded) {
    return null; // Hide buttons after response
  }

  return (
    <div className="approval-buttons">
      <button
        className="approval-btn approval-yes"
        onClick={() => handleResponse(true)}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Yes, contact expert'}
      </button>
      <button
        className="approval-btn approval-no"
        onClick={() => handleResponse(false)}
        disabled={loading}
      >
        No, thanks
      </button>

      <style>{`
        .approval-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          justify-content: flex-start;
          align-items: center;
        }

        .approval-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          box-shadow: none;
          min-width: 140px;
          text-align: center;
          letter-spacing: -0.01em;
          position: relative;
          overflow: hidden;
        }

        .approval-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          opacity: 0;
          transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }

        .approval-yes {
          background: #FFB74D;
          color: #1e293b;
        }

        .approval-yes:hover:not(:disabled) {
          background: #FFB74D;
          transform: none;
          box-shadow: none;
        }

        .approval-yes:hover:not(:disabled)::before {
          opacity: 0.08;
        }

        .approval-no {
          background: #F5F5F5;
          color: #64748b;
          border: none;
        }

        .approval-no::before {
          background: currentColor;
        }

        .approval-no:hover:not(:disabled) {
          background: #EEEEEE;
          transform: none;
          box-shadow: none;
        }

        .approval-no:hover:not(:disabled)::before {
          opacity: 0.08;
        }

        .approval-btn:disabled {
          opacity: 0.38;
          cursor: not-allowed;
        }

        .approval-btn:disabled::before {
          display: none;
        }
      `}</style>
    </div>
  );
}
