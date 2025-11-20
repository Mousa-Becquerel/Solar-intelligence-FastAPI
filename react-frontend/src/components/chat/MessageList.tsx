/**
 * Message List
 *
 * Scrollable container for all messages in a conversation
 * Auto-scrolls to bottom on new messages
 */

import { useEffect, useRef } from 'react';
import type { Message } from '../../types/api';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  queryLimitProps?: {
    onUpgrade: () => void;
    onTakeSurvey: () => void;
    surveyStage: 1 | 2;
    bothSurveysCompleted: boolean;
  };
}

export default function MessageList({ messages, isStreaming = false, queryLimitProps }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  // Only scroll if messages were actually added (not on initial render or transitions)
  useEffect(() => {
    const currentMessageCount = messages.length;
    const shouldScroll = currentMessageCount > prevMessageCountRef.current;

    if (shouldScroll && messagesEndRef.current && containerRef.current) {
      // Use requestAnimationFrame to ensure the DOM has updated
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      });
    }

    prevMessageCountRef.current = currentMessageCount;
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      className="message-list-container"
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '2rem',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
        scrollBehavior: 'smooth',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
      {/* Messages */}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          agentType={message.agent_type as any}
          queryLimitProps={queryLimitProps}
        />
      ))}

      {/* Streaming indicator */}
      {isStreaming && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: '16px',
              borderBottomLeftRadius: '6px',
              padding: '12px 16px',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
      </div>

      <style>{`
        /* Nearly invisible scrollbar - MD3 */
        .message-list-container::-webkit-scrollbar {
          width: 4px;
        }

        .message-list-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .message-list-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 2px;
        }

        .message-list-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.15);
        }

        /* Typing indicator animation */
        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.38);
          animation: typingBounce 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) {
          animation-delay: 0s;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typingBounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
