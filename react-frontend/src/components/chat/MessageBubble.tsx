/**
 * Message Bubble
 *
 * Displays a single message (user or bot)
 * Matches Flask design with MD3 styling
 * Supports plot/chart messages
 */

import { useState, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../types/api';
import type { AgentType } from '../../constants/agents';
import { AGENT_METADATA } from '../../constants/agentMetadata';
import PlotMessage from './PlotMessage';
import ApprovalButtons from './ApprovalButtons';
import QueryLimitMessage from './QueryLimitMessage';
import { ArtifactContext } from '../../pages/ChatPage';

interface MessageBubbleProps {
  message: Message & { isQueryLimitMessage?: boolean };
  agentType?: AgentType;
  queryLimitProps?: {
    onUpgrade: () => void;
    onTakeSurvey: () => void;
    surveyStage: 1 | 2;
    bothSurveysCompleted: boolean;
  };
}

export default function MessageBubble({ message, agentType, queryLimitProps }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';
  const artifactContext = useContext(ArtifactContext);

  // Get agent metadata if this is a bot message
  const agentMetadata = agentType && !isUser ? AGENT_METADATA[agentType] : null;

  // Check if this is a query limit message
  if (message.isQueryLimitMessage && queryLimitProps) {
    return (
      <div style={{ marginBottom: '16px', width: '100%' }}>
        <QueryLimitMessage {...queryLimitProps} />
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '8px',
        animation: 'messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          minWidth: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Agent Name and Icon - Only for bot messages */}
        {!isUser && agentMetadata && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
              paddingLeft: '4px',
            }}
          >
            {/* Agent Icon */}
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: agentMetadata.color === 'navy' ? '#010654' :
                           agentMetadata.color === 'gold' ? '#E89C43' :
                           agentMetadata.color === 'purple' ? '#9C27B0' :
                           agentMetadata.color === 'navy-light' ? '#5C6BC0' :
                           agentMetadata.color === 'emerald' ? '#10B981' :
                           agentMetadata.color === 'teal' ? '#14B8A6' :
                           agentMetadata.color === 'indigo' ? '#6366F1' : '#E4C154',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                flexShrink: 0,
              }}
            >
              <img
                src={`/agents/${agentMetadata.name}.svg`}
                alt={agentMetadata.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1)',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = agentMetadata.initial;
                    parent.style.fontSize = '0.75rem';
                    parent.style.fontWeight = '600';
                    parent.style.color = 'white';
                  }
                }}
              />
            </div>
            {/* Agent Name */}
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: '600',
                color: '#111827',
                fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              }}
            >
              {agentMetadata.name}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={isUser ? 'user-message-bubble' : 'bot-message-bubble'}
          style={{
            background: isUser ? '#fbbf24' : '#ffffff', /* becq-gold for user messages */
            color: '#1e293b',
            borderRadius: '18px',
            borderBottomRightRadius: isUser ? '6px' : '18px',
            borderBottomLeftRadius: isUser ? '18px' : '6px',
            padding: '12px 16px',
            border: isUser ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: 'none',
            position: 'relative',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            fontSize: '0.9375rem',
            fontWeight: isUser ? '400' : '300',
            letterSpacing: '-0.01em',
            lineHeight: '1.6',
          }}
        >
          {/* Message content */}
          {isUser ? (
            <div
              style={{
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
              }}
            >
              {message.content}
            </div>
          ) : (
            <>
              {/* Text content */}
              {message.content && (
                <div
                  className="bot-message-content"
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                  }}
                >
                  <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Style markdown elements to match Flask
                  p: ({ children }) => (
                    <p style={{ margin: '0.8em 0', lineHeight: '1.6' }}>{children}</p>
                  ),
                  h1: ({ children }) => (
                    <h1
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: '500',
                        margin: '1.2em 0 0.6em 0',
                        lineHeight: '1.3',
                        letterSpacing: '-0.015em',
                        color: '#1e293b',
                      }}
                    >
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: '500',
                        margin: '1.2em 0 0.6em 0',
                        lineHeight: '1.3',
                        letterSpacing: '-0.015em',
                        color: '#1e293b',
                      }}
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3
                      style={{
                        fontSize: '1.125rem',
                        fontWeight: '500',
                        margin: '1.2em 0 0.6em 0',
                        lineHeight: '1.3',
                        letterSpacing: '-0.015em',
                        color: '#1e293b',
                      }}
                    >
                      {children}
                    </h3>
                  ),
                  code: ({ inline, children }: any) =>
                    inline ? (
                      <code
                        style={{
                          background: '#f3f4f6',
                          color: '#0a1850', /* becq-blue */
                          padding: '0.2em 0.4em',
                          borderRadius: '4px',
                          fontSize: '0.9em',
                          fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        {children}
                      </code>
                    ) : (
                      <pre
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '1em',
                          overflow: 'auto',
                          margin: '1em 0',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        <code
                          style={{
                            fontSize: '13px',
                            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                            color: '#374151',
                          }}
                        >
                          {children}
                        </code>
                      </pre>
                    ),
                  ul: ({ children }) => (
                    <ul
                      className="message-list"
                      style={{
                        listStyleType: 'none',
                        paddingLeft: '0',
                        margin: '0.8em 0',
                      }}
                    >
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol
                      style={{
                        margin: '0.8em 0',
                        paddingLeft: '1.5em',
                      }}
                    >
                      {children}
                    </ol>
                  ),
                  li: ({ children, ordered, node }: any) => (
                    <li
                      className={ordered ? '' : 'custom-bullet'}
                      style={{
                        position: 'relative',
                        paddingLeft: '1.5em',
                        marginBottom: '0.5em',
                        lineHeight: '1.6',
                      }}
                    >
                      {children}
                    </li>
                  ),
                  blockquote: ({ children }) => (
                    <div style={{ margin: '0.8em 0', padding: 0 }}>
                      {children}
                    </div>
                  ),
                  table: ({ children }) => (
                    <div style={{ overflowX: 'auto', margin: '1em 0' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'separate',
                          borderSpacing: 0,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead>{children}</thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody>{children}</tbody>
                  ),
                  tr: ({ children, isHeader }: any) => (
                    <tr
                      style={{
                        background: isHeader ? '#fbbf24' : undefined, /* becq-gold */
                      }}
                    >
                      {children}
                    </tr>
                  ),
                  th: ({ children }) => (
                    <th
                      style={{
                        background: '#fbbf24', /* becq-gold */
                        color: '#1e293b',
                        fontWeight: '500',
                        padding: '0.8em',
                        textAlign: 'left',
                        border: '1px solid #e5e7eb',
                        fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                      }}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td
                      style={{
                        padding: '0.8em',
                        border: '1px solid #e5e7eb',
                        textAlign: 'left',
                      }}
                    >
                      {children}
                    </td>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#0a1850', /* becq-blue */
                        textDecoration: 'underline',
                      }}
                    >
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => (
                    <strong style={{ color: '#1e293b', fontWeight: '600' }}>
                      {children}
                    </strong>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
                </div>
              )}

              {/* Plot/Chart visualization */}
              {message.plotData && <PlotMessage plotData={message.plotData} />}

              {/* Approval Buttons */}
              {message.approvalData && (
                <div style={{ marginTop: '1rem' }}>
                  <ApprovalButtons
                    conversationId={message.approvalData.conversationId}
                    context={message.approvalData.context}
                    onApproved={() => {
                      console.log('Approval approved - opening contact form');
                      // Open artifact panel with contact form
                      artifactContext?.openContactForm();
                    }}
                    onRejected={() => {
                      console.log('Approval rejected - backend will send rejection message');
                      // Backend sends a rejection message automatically
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Copy button for bot messages */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="copy-btn"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                color: 'rgba(0, 0, 0, 0.38)',
                fontSize: '16px',
                opacity: 0,
                transition: 'all 0.2s ease',
              }}
              aria-label="Copy message"
            >
              {copied ? '✓' : '⎘'}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(0, 0, 0, 0.38)',
            marginTop: '4px',
            padding: '0 4px',
          }}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>

      <style>{`
        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .bot-message-bubble:hover .copy-btn {
          opacity: 1;
        }

        .copy-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.87);
          opacity: 0;
          border-radius: 6px;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .copy-btn:hover::before {
          opacity: 0.08;
        }

        .copy-btn:active::before {
          opacity: 0.12;
        }

        /* Remove default margin from last paragraph in markdown */
        .bot-message-content p:last-child {
          margin-bottom: 0;
        }

        /* Custom bullet points with brand gold color */
        .message-list .custom-bullet::before {
          content: "•";
          color: #fbbf24; /* becq-gold */
          font-weight: bold;
          position: absolute;
          left: 0;
          font-size: 1.2em;
        }

        /* Table row striping - matching Flask */
        .bot-message-content table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }

        .bot-message-content table tbody tr:nth-child(odd) {
          background-color: #fff;
        }

        .bot-message-content table tbody tr:hover {
          background-color: rgba(251, 191, 36, 0.1);
        }

        /* Smooth scrollbar for code blocks */
        .bot-message-content pre::-webkit-scrollbar {
          height: 6px;
        }

        .bot-message-content pre::-webkit-scrollbar-track {
          background: transparent;
        }

        .bot-message-content pre::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        /* Horizontal rule styling - matching Flask */
        .bot-message-content hr {
          border: none;
          height: 1px;
          background: #e5e7eb;
          margin: 1.5em 0;
          border-radius: 0;
        }
      `}</style>
    </div>
  );
}
