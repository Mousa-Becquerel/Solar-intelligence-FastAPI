/**
 * New Conversation Button
 *
 * Creates a new conversation and navigates to it
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../../api';

export default function NewConversationButton() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleNewConversation = async () => {
    try {
      setCreating(true);
      // Create conversation with default agent (market)
      const result = await apiClient.createConversation('market');
      toast.success('New conversation created');
      // Navigate to the new conversation
      navigate(`/app?conversation=${result.conversation_id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <button
      onClick={handleNewConversation}
      disabled={creating}
      className="new-conversation-btn"
      style={{
        width: '100%',
        height: '44px',
        background: creating ? '#9FA8DA' : '#5C6BC0',
        color: '#ffffff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: creating ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {creating ? (
        <>
          <span
            style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid #ffffff',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>Creating...</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: '18px' }}>+</span>
          <span>New Conversation</span>
        </>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .new-conversation-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #ffffff;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .new-conversation-btn:not(:disabled):hover::before {
          opacity: 0.08;
        }

        .new-conversation-btn:not(:disabled):active::before {
          opacity: 0.12;
        }

        .new-conversation-btn:focus-visible {
          outline: 2px solid #5C6BC0;
          outline-offset: 2px;
        }
      `}</style>
    </button>
  );
}
