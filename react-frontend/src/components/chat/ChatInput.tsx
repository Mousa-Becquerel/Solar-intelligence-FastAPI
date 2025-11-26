/**
 * Chat Input
 *
 * Auto-resizing textarea with send button and suggested queries
 * Matches Flask design with MD3 styling
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { type AgentType } from '../../constants/agents';
import SuggestedQueries from './SuggestedQueries';

interface ChatInputProps {
  agentType?: AgentType;
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  showSuggestions?: boolean;
}

export default function ChatInput({
  agentType = 'market',
  onSend,
  onStop,
  disabled = false,
  isStreaming = false,
  placeholder = 'Ask about solar market intelligence...',
  showSuggestions = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Submit on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQueryClick = (query: string) => {
    onSend(query);
  };

  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        padding: '1.5rem 2rem',
        background: '#ffffff',
        zIndex: 100,
      }}
    >
      {/* Input content wrapper - matches Flask max-width: 800px */}
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        {/* Suggested Queries - shown above input */}
        <SuggestedQueries
          agentType={agentType}
          onQueryClick={handleQueryClick}
          visible={showSuggestions}
        />

        {/* Input wrapper - MD3 flat design */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '900px',
            margin: '0 auto',
            background: '#F5F5F5',
            borderRadius: '16px',
            padding: '0.8rem',
            boxShadow: 'none',
            border: 'none',
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              position: 'relative',
            }}
          >
            {/* Input container with flex: 1 */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={placeholder}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0.875rem 1.125rem',
                  fontSize: '0.9375rem',
                  fontWeight: '300',
                  letterSpacing: '-0.01em',
                  lineHeight: '1.5',
                  border: 'none',
                  borderRadius: '12px',
                  outline: 'none',
                  fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                  background: disabled ? '#f3f4f6' : '#ffffff',
                  color: '#1e293b',
                  transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.background = disabled ? '#f3f4f6' : '#fafafa';
                }}
                onBlur={(e) => {
                  e.target.style.background = disabled ? '#f3f4f6' : '#ffffff';
                }}
              />
            </div>

            {/* Send/Stop button - MD3 circular flat design */}
            <button
              onClick={isStreaming ? onStop : handleSubmit}
              disabled={!isStreaming && (disabled || !message.trim())}
              className="send-btn"
              style={{
                width: '48px',
                height: '48px',
                background: isStreaming ? '#dc2626' : '#5C6BC0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                cursor: isStreaming ? 'pointer' : (disabled || !message.trim() ? 'not-allowed' : 'pointer'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
                transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'none',
                marginLeft: '0.75rem',
                opacity: isStreaming ? 1 : (disabled || !message.trim() ? 0.38 : 1),
              }}
              aria-label={isStreaming ? "Stop generating" : "Send message"}
            >
              {isStreaming ? (
                // Stop icon (square)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : disabled ? (
                <span
                  style={{
                    display: 'inline-block',
                    width: '18px',
                    height: '18px',
                    border: '2px solid #ffffff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                </svg>
              )}

              <style>{`
                @keyframes spin {
                  to {
                    transform: rotate(360deg);
                  }
                }

                .send-btn::before {
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

                .send-btn:not(:disabled):hover {
                  background: #5C6BC0;
                  transform: none;
                  box-shadow: none;
                }

                .send-btn:not(:disabled):hover::before {
                  opacity: 0.08;
                }

                .send-btn:not(:disabled):active {
                  transform: none;
                  box-shadow: none;
                }

                .send-btn:not(:disabled):active::before {
                  opacity: 0.12;
                }

                .send-btn:disabled::before {
                  display: none;
                }

                .send-btn svg {
                  transition: none;
                  position: relative;
                  z-index: 1;
                }

                .send-btn:hover svg {
                  transform: none;
                }

                .send-btn:focus-visible {
                  outline: 2px solid #5C6BC0;
                  outline-offset: 2px;
                }
              `}</style>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
