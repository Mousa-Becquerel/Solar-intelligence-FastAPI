/**
 * Sidebar Panel
 *
 * Grid structure: header | content | footer
 * Matches Flask sidebar exactly with MD3 styling
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useAuthStore } from '../../stores';
import NewConversationButton from './NewConversationButton';
import ConversationList from './ConversationList';

export default function SidebarPanel() {
  const navigate = useNavigate();
  const { sidebarExpanded, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Get user initials
  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    return user.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className="sidebar-panel-grid"
      data-expanded={sidebarExpanded}
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gridTemplateAreas: '"header" "content" "footer"',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ===== HEADER SECTION ===== */}
      <div
        className="sidebar-top"
        style={{
          gridArea: 'header',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarExpanded ? 'space-between' : 'center',
          padding: sidebarExpanded ? '24px 16px' : '1rem 0.5rem',
          background: '#F5F5F5',
          flexShrink: 0,
        }}
      >
        {/* Logo - visible when expanded */}
        {sidebarExpanded && (
          <div style={{ marginBottom: '0', flex: 1 }}>
            <img
              src="/new_logo.svg"
              alt="Solar Intelligence"
              style={{
                height: '50px',
                width: 'auto',
                opacity: 1,
                filter: 'none',
              }}
            />
          </div>
        )}

        {/* Collapse button (visible when expanded) */}
        {sidebarExpanded && (
          <button
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            style={{
              width: '36px',
              height: '36px',
              border: 'none',
              background: 'transparent',
              color: '#2563eb',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6"></path>
            </svg>
          </button>
        )}

        {/* Expand button (visible when collapsed) */}
        {!sidebarExpanded && (
          <button
            className="sidebar-expand-btn"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            style={{
              width: '40px',
              height: '40px',
              border: 'none',
              background: 'white',
              color: '#5C6BC0',
              cursor: 'pointer',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: 'none',
              margin: '0 auto',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E8EAF6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6"></path>
            </svg>
          </button>
        )}
      </div>

      {/* ===== CONTENT SECTION ===== */}
      <div
        className="sidebar-content"
        style={{
          gridArea: 'content',
          display: 'flex',
          flexDirection: 'column',
          padding: sidebarExpanded ? '16px' : '0.5rem 0',
          overflowY: 'auto',
          overflowX: 'hidden',
          gap: '8px',
          alignItems: sidebarExpanded ? 'stretch' : 'center',
          width: sidebarExpanded ? '100%' : '72px',
        }}
      >
        {/* Collapsed state icons */}
        {!sidebarExpanded && (
          <>
            {/* New Chat Icon */}
            <button
              className="sidebar-icon-btn"
              title="New Chat"
              aria-label="New Chat"
              onClick={() => {
                // Navigate to new chat without conversation ID
                navigate('/chat');
              }}
              style={{
                width: '40px',
                height: '40px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0.5rem 0',
              }}
            >
              <svg
                width="22"
                height="22"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="10" stroke="#2563eb" fill="#fff" />
                <path d="M11 7v8M7 11h8" />
              </svg>
            </button>

            {/* PV Data Hub Link */}
            <a
              href="https://datahub.becquerelinstitute.eu/Home"
              target="_blank"
              rel="noopener"
              className="sidebar-icon-btn"
              title="PV Data Hub"
              style={{
                width: '40px',
                height: '40px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                margin: '0.5rem 0',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="7" rx="2" fill="#fbbf24" stroke="#2563eb" />
                <rect x="7" y="4" width="10" height="7" rx="2" fill="#fff" stroke="#2563eb" />
                <path d="M12 11V4" stroke="#2563eb" />
              </svg>
            </a>
          </>
        )}

        {/* Expanded state content */}
        {sidebarExpanded && (
          <>
            {/* New Chat Tab */}
            <button
              onClick={() => {
                // Navigate to new chat without conversation ID
                navigate('/chat');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                color: '#010654',
                fontSize: '0.875rem',
                fontWeight: '500',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Chat
            </button>

            {/* Back to Agents Tab */}
            <a
              href="/agents"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                color: '#6B7280',
                fontSize: '0.875rem',
                fontWeight: '400',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M9 21V9"/>
              </svg>
              Agents
            </a>

            {/* Recent Section Title */}
            <div
              className="sidebar-section-title"
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0.5rem 0.75rem',
                marginTop: '0.5rem',
              }}
            >
              Recent
            </div>

            {/* Conversation List */}
            <ConversationList isExpanded={true} />

            {/* Spacer */}
            <div style={{ flex: 1 }} />
          </>
        )}
      </div>

      {/* ===== FOOTER SECTION - User Profile ===== */}
      <div
        className="sidebar-footer"
        style={{
          gridArea: 'footer',
          padding: sidebarExpanded ? '12px 16px' : '0.5rem',
          background: '#F5F5F5',
          borderTop: '1px solid #E5E7EB',
          position: 'relative',
        }}
      >
        <button
          className="sidebar-user-profile"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          type="button"
          style={{
            width: sidebarExpanded ? '100%' : '40px',
            height: sidebarExpanded ? 'auto' : '40px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '0',
            display: 'flex',
            alignItems: 'center',
            gap: sidebarExpanded ? '12px' : '0',
            padding: sidebarExpanded ? '0' : '0',
            margin: sidebarExpanded ? '0' : '0 auto',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            justifyContent: sidebarExpanded ? 'flex-start' : 'center',
            position: 'relative',
            overflow: 'visible',
            boxShadow: 'none',
          }}
        >
          {/* User Avatar */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#010654',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: '600',
              flexShrink: 0,
            }}
          >
            {getUserInitials()}
          </div>

          {/* User Info (visible when expanded) */}
          {sidebarExpanded && (
            <div
              style={{
                flex: 1,
                textAlign: 'left',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#111827',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.full_name || 'User'}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.plan_type || 'Free'} Plan
              </div>
            </div>
          )}
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && sidebarExpanded && (
          <div
            className="user-dropdown-menu"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '16px',
              right: '16px',
              marginBottom: '8px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              zIndex: 1000,
            }}
          >
            <a
              href="/profile"
              className="dropdown-menu-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                textDecoration: 'none',
                color: '#111827',
                fontSize: '0.875rem',
                fontWeight: '400',
                transition: 'background 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                borderBottom: '1px solid #E5E7EB',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Profile</span>
            </a>

            {/* Admin Link - Only visible for admin users */}
            {user?.role === 'admin' && (
              <a
                href="/admin/users"
                className="dropdown-menu-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  textDecoration: 'none',
                  color: '#111827',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  transition: 'background 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderBottom: '1px solid #E5E7EB',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                </svg>
                <span>Admin</span>
              </a>
            )}

            <button
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="dropdown-menu-item"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                color: '#111827',
                fontSize: '0.875rem',
                fontWeight: '400',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        /* Subtle scrollbar for sidebar content */
        .sidebar-content::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-content::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }

        .sidebar-content::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        /* Hover effects for icon buttons */
        .sidebar-icon-btn:hover {
          background: rgba(37, 99, 235, 0.08);
        }
      `}</style>
    </div>
  );
}
