/**
 * Conversation Item
 *
 * Individual conversation in the sidebar list
 * Shows title, last message preview, timestamp
 * Supports both expanded and collapsed states
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Conversation } from '../../types/api';

interface ConversationItemProps {
  conversation: Conversation;
  isActive?: boolean;
  isExpanded: boolean;
  onDelete?: (id: number) => void;
}

export default function ConversationItem({
  conversation,
  isActive = false,
  isExpanded,
  onDelete,
}: ConversationItemProps) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleClick = () => {
    console.log(`🖱️  [ConversationItem] Clicked conversation ${conversation.id}:`, {
      title: conversation.title,
      preview: conversation.preview,
      agent_type: conversation.agent_type,
    });
    navigate(`/app?conversation=${conversation.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDeleteConfirm) {
      onDelete?.(conversation.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  if (!isExpanded) {
    // Collapsed state - show just an icon
    return (
      <button
        onClick={handleClick}
        className="conversation-item-collapsed"
        aria-label={conversation.preview || 'Untitled conversation'}
        style={{
          width: '48px',
          height: '48px',
          background: isActive ? '#ffffff' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isActive ? '#5C6BC0' : 'rgba(0, 0, 0, 0.54)',
          fontSize: '20px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        💬

        <style>{`
          .conversation-item-collapsed::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: ${isActive ? '#5C6BC0' : 'rgba(0, 0, 0, 0.87)'};
            opacity: 0;
            border-radius: 12px;
            transition: opacity 0.2s ease;
            pointer-events: none;
          }

          .conversation-item-collapsed:hover::before {
            opacity: ${isActive ? '0.04' : '0.08'};
          }

          .conversation-item-collapsed:active::before {
            opacity: 0.12;
          }
        `}</style>
      </button>
    );
  }

  // Expanded state - full conversation card
  return (
    <div
      className="conversation-item-expanded"
      style={{
        position: 'relative',
        background: isActive ? '#ffffff' : 'transparent',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={handleClick}
        style={{
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          position: 'relative',
        }}
      >
        {/* Title - using preview from first user message */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: 'rgba(0, 0, 0, 0.87)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {conversation.preview || 'New conversation'}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="delete-btn"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '28px',
          height: '28px',
          background: showDeleteConfirm ? '#DC2626' : 'transparent',
          color: showDeleteConfirm ? '#ffffff' : 'rgba(0, 0, 0, 0.38)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          transition: 'all 0.2s ease',
          opacity: 0,
        }}
      >
        {showDeleteConfirm ? '✓' : '×'}
      </button>

      <style>{`
        .conversation-item-expanded::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${isActive ? '#5C6BC0' : 'rgba(0, 0, 0, 0.87)'};
          opacity: 0;
          border-radius: 12px;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .conversation-item-expanded:hover::before {
          opacity: ${isActive ? '0.04' : '0.08'};
        }

        .conversation-item-expanded:active::before {
          opacity: 0.12;
        }

        .conversation-item-expanded:hover .delete-btn {
          opacity: 1;
        }

        .delete-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${showDeleteConfirm ? '#ffffff' : 'rgba(0, 0, 0, 0.87)'};
          opacity: 0;
          border-radius: 8px;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .delete-btn:hover::before {
          opacity: ${showDeleteConfirm ? '0.12' : '0.08'};
        }

        .delete-btn:active::before {
          opacity: 0.12;
        }
      `}</style>
    </div>
  );
}
