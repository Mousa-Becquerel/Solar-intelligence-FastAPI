/**
 * Hired Agents List
 *
 * Sidebar component showing hired agents
 * Includes "My Team" header, agent list, and "Start Chat" button
 * Matches Flask design exactly
 */

import { useState } from 'react';
import { useAuthStore, useUIStore } from '../../stores';
import type { AgentType } from '../../constants/agents';

interface HiredAgentsListProps {
  hiredAgents: AgentType[];
  onUnhire?: (agentType: AgentType) => void;
}

export default function HiredAgentsList({
  hiredAgents,
}: HiredAgentsListProps) {
  const { user, logout } = useAuthStore();
  const { sidebarExpanded, toggleSidebar } = useUIStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Get user initials
  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    return user.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: sidebarExpanded ? '220px' : '72px',
        background: '#FAFAFA',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: sidebarExpanded ? '16px 16px 24px 16px' : '16px 8px 24px 8px',
          gap: '8px',
          minHeight: 0,
          transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Logo */}
        <div style={{
          marginBottom: sidebarExpanded ? '16px' : '16px',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: sidebarExpanded ? '50px' : '40px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {sidebarExpanded ? (
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
          ) : (
            <button
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              style={{
                width: '40px',
                height: '40px',
                border: 'none',
                background: 'white',
                color: '#1e3a8a',
                cursor: 'pointer',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
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
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6"></path>
              </svg>
            </button>
          )}
        </div>

        {/* Collapse Button - Only shown when expanded */}
        {sidebarExpanded && (
          <button
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #E5E7EB',
              background: 'white',
              color: '#1e3a8a',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              marginBottom: '16px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
              e.currentTarget.style.borderColor = '#1e3a8a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6"></path>
            </svg>
            <span>Collapse</span>
          </button>
        )}

        {/* Menu Items - Simple List */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {/* Agents (Active) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              gap: sidebarExpanded ? '12px' : '0',
              padding: sidebarExpanded ? '10px 12px' : '10px',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
              color: '#010654',
              fontSize: '0.875rem',
              fontWeight: '500',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease',
            }}
            title={!sidebarExpanded ? 'Agents' : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18"/>
              <path d="M9 21V9"/>
            </svg>
            {sidebarExpanded && <span>Agents</span>}
          </div>

          {/* Exports (formerly Documents) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              gap: sidebarExpanded ? '12px' : '0',
              padding: sidebarExpanded ? '10px 12px' : '10px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: '#6B7280',
              fontSize: '0.875rem',
              fontWeight: '400',
            }}
            title={!sidebarExpanded ? 'Exports' : undefined}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            {sidebarExpanded && <span>Exports</span>}
          </div>

          {/* Requests (New) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              gap: sidebarExpanded ? '12px' : '0',
              padding: sidebarExpanded ? '10px 12px' : '10px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: '#6B7280',
              fontSize: '0.875rem',
              fontWeight: '400',
            }}
            title={!sidebarExpanded ? 'Requests' : undefined}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            {sidebarExpanded && <span>Requests</span>}
          </div>

          <div style={{ flex: 1 }} />
        </div>

        {/* User Profile at Bottom */}
        <div
          style={{
            borderTop: '1px solid #E5E7EB',
            marginTop: '16px',
            padding: sidebarExpanded ? '12px 16px' : '12px 8px',
            position: 'relative',
            transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
            title={!sidebarExpanded ? user?.full_name || 'User' : undefined}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              gap: sidebarExpanded ? '12px' : '0',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#010654',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                flexShrink: 0,
              }}
            >
              {getUserInitials()}
            </div>
            {sidebarExpanded && (
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.full_name || 'User'}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.plan_type ? `${user.plan_type.charAt(0).toUpperCase() + user.plan_type.slice(1)} Plan` : 'Free Plan'}
                </div>
              </div>
            )}
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
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
      </div>

      <style>{`
        /* Custom scrollbar for hired agents list */
        div::-webkit-scrollbar {
          width: 6px;
        }

        div::-webkit-scrollbar-track {
          background: transparent;
        }

        div::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
