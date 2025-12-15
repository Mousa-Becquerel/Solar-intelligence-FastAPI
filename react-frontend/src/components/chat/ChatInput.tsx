/**
 * Chat Input
 *
 * Auto-resizing textarea with send button, file upload, and suggested queries
 * Matches Flask design with MD3 styling
 * Special layout for storage optimization agent with action buttons below input
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { type AgentType } from '../../constants/agents';
import SuggestedQueries from './SuggestedQueries';

// Allowed file types for upload
const ALLOWED_FILE_TYPES = [
  '.csv',
  '.xlsx',
  '.xls',
  '.json',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/json',
];

const MAX_FILE_SIZE_MB = 10;

// Menu item configuration for the plus button popup
interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface ChatInputProps {
  agentType?: AgentType;
  onSend: (message: string, file?: File) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  showSuggestions?: boolean;
  /** Whether this is the first message (welcome screen) - affects expansion direction */
  isFirstMessage?: boolean;
}

export default function ChatInput({
  agentType = 'market',
  onSend,
  onStop,
  disabled = false,
  isStreaming = false,
  placeholder = 'Ask about solar market intelligence...',
  showSuggestions = false,
  isFirstMessage = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if this is the storage optimization agent
  const isOptimizationAgent = agentType === 'storage_optimization';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        plusButtonRef.current &&
        !plusButtonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if ((trimmed || uploadedFile) && !disabled) {
      onSend(trimmed, uploadedFile || undefined);
      setMessage('');
      setUploadedFile(null);
      setFileError(null);
      // Reset file input so the same file can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate line height (approximately 24px per line)
    const lineHeight = 24;
    const minHeight = 48; // Single line height
    const maxLines = isFirstMessage ? 6 : 6; // 6 lines for first message, 6 for active chat
    const maxHeight = lineHeight * maxLines;

    // Set the height based on content, capped at maxHeight
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  // Adjust height when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, isFirstMessage]);

  const handleQueryClick = (query: string) => {
    onSend(query);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = ALLOWED_FILE_TYPES.some(
      (type) => type === file.type || type === fileExtension
    );

    if (!isValidType) {
      setFileError('Please upload a CSV, Excel, or JSON file');
      return;
    }

    setUploadedFile(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Get file extension
  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toUpperCase() || 'FILE';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file type color based on extension
  const getFileTypeColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return { bg: '#dcfce7', text: '#166534', border: '#86efac' }; // Green
    if (ext === 'xlsx' || ext === 'xls') return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }; // Blue
    if (ext === 'json') return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }; // Yellow
    return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }; // Gray
  };

  // Menu items for the plus button popup (optimization agent only)
  const menuItems: MenuItem[] = [
    {
      id: 'upload',
      label: 'Upload data',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
      onClick: triggerFileInput,
      disabled: disabled,
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        padding: isOptimizationAgent ? '1rem 2rem' : '1.5rem 2rem',
        background: '#ffffff',
        zIndex: 100,
      }}
    >
      {/* Hidden file input */}
      {isOptimizationAgent && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      )}

      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        {/* Suggested Queries - hidden for optimization agent */}
        {!isOptimizationAgent && (
          <SuggestedQueries
            agentType={agentType}
            onQueryClick={handleQueryClick}
            visible={showSuggestions}
          />
        )}

        {/* File preview - Claude-style card when file is uploaded */}
        {isOptimizationAgent && (uploadedFile || fileError) && (
          <div style={{ marginBottom: '0.75rem' }}>
            {fileError ? (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #fecaca',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
                    {fileError}
                  </span>
                </div>
                <button
                  onClick={handleRemoveFile}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                  }}
                  aria-label="Dismiss error"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* File icon with type badge */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '48px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* Document icon */}
                    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                      <path
                        d="M2 4C2 2.89543 2.89543 2 4 2H12L18 8V20C18 21.1046 17.1046 22 16 22H4C2.89543 22 2 21.1046 2 20V4Z"
                        fill="#e5e7eb"
                        stroke="#d1d5db"
                        strokeWidth="1"
                      />
                      <path d="M12 2V8H18" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1"/>
                      <rect x="5" y="12" width="10" height="1.5" rx="0.75" fill="#9ca3af"/>
                      <rect x="5" y="15" width="7" height="1.5" rx="0.75" fill="#9ca3af"/>
                    </svg>
                  </div>
                  {/* File type badge */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: getFileTypeColor(uploadedFile!.name).bg,
                      color: getFileTypeColor(uploadedFile!.name).text,
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: `1px solid ${getFileTypeColor(uploadedFile!.name).border}`,
                      letterSpacing: '0.5px',
                    }}
                  >
                    {getFileExtension(uploadedFile!.name)}
                  </div>
                </div>

                {/* File info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#1f2937',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {uploadedFile!.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '2px',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {formatFileSize(uploadedFile!.size)}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={handleRemoveFile}
                  className="file-remove-btn"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  aria-label="Remove file"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input wrapper */}
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
              alignItems: 'flex-end', // Keep buttons at bottom when textarea expands
              gap: '0.5rem',
              position: 'relative',
            }}
          >
            {/* Plus button for optimization agent - positioned at start */}
            {isOptimizationAgent && (
              <div style={{ position: 'relative' }}>
                <button
                  ref={plusButtonRef}
                  onClick={toggleMenu}
                  disabled={disabled}
                  className="plus-btn"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: menuOpen ? '#f3f4f6' : 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '50%',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    opacity: disabled ? 0.5 : 1,
                  }}
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: menuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                {/* Popup menu */}
                {menuOpen && (
                  <div
                    ref={menuRef}
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '0',
                      marginBottom: '8px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                      border: '1px solid #e5e7eb',
                      padding: '8px 0',
                      minWidth: '180px',
                      zIndex: 1000,
                      animation: 'menuFadeIn 0.15s ease-out',
                    }}
                  >
                    {menuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={item.onClick}
                        disabled={item.disabled}
                        className="menu-item"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          cursor: item.disabled ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '400',
                          color: item.disabled ? '#9ca3af' : '#374151',
                          fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                          textAlign: 'left',
                          transition: 'background-color 0.15s ease',
                          opacity: item.disabled ? 0.6 : 1,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Input container */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                display: 'flex',
              }}
            >
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={isOptimizationAgent && uploadedFile ? 'Add a message about your data...' : placeholder}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                rows={1}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  maxHeight: '144px', // 6 lines for both first message and active chat
                  padding: '0.75rem 1.125rem',
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
                  resize: 'none',
                  overflow: 'auto',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db transparent',
                }}
                onFocus={(e) => {
                  e.target.style.background = disabled ? '#f3f4f6' : '#fafafa';
                }}
                onBlur={(e) => {
                  e.target.style.background = disabled ? '#f3f4f6' : '#ffffff';
                }}
              />
            </div>

            {/* Send/Stop button */}
            <button
              onClick={isStreaming ? onStop : handleSubmit}
              disabled={!isStreaming && (disabled || (!message.trim() && !uploadedFile))}
              className="send-btn"
              style={{
                width: '48px',
                height: '48px',
                background: isStreaming ? '#dc2626' : '#5C6BC0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                cursor: isStreaming ? 'pointer' : (disabled || (!message.trim() && !uploadedFile) ? 'not-allowed' : 'pointer'),
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
                opacity: isStreaming ? 1 : (disabled || (!message.trim() && !uploadedFile) ? 0.38 : 1),
              }}
              aria-label={isStreaming ? "Stop generating" : "Send message"}
            >
              {isStreaming ? (
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
            </button>
          </div>
        </div>

      </div>

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

        /* Plus button styles */
        .plus-btn:not(:disabled):hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .plus-btn:focus-visible {
          outline: 2px solid #5C6BC0;
          outline-offset: 2px;
        }

        /* Menu animation */
        @keyframes menuFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Menu item hover */
        .menu-item:not(:disabled):hover {
          background: #f9fafb;
        }

        .menu-item:not(:disabled):active {
          background: #f3f4f6;
        }

        .menu-item:focus-visible {
          outline: none;
          background: #f3f4f6;
        }

        /* File remove button hover */
        .file-remove-btn:hover {
          background: #f3f4f6;
          color: #6b7280;
        }

        .file-remove-btn:active {
          background: #e5e7eb;
        }

        /* Textarea scrollbar styling */
        textarea::-webkit-scrollbar {
          width: 6px;
        }

        textarea::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 3px;
        }

        textarea::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        textarea::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}
