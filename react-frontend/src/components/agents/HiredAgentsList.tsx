/**
 * Hired Agents List
 *
 * Sidebar component showing hired agents
 * Includes "My Team" header, agent list, and "Start Chat" button
 * Matches Flask design exactly
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores';
import type { AgentType } from '../../constants/agents';

interface HiredAgentsListProps {
  hiredAgents: AgentType[];
  onUnhire?: (agentType: AgentType) => void;
}

export default function HiredAgentsList({
  hiredAgents,
}: HiredAgentsListProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
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

  const handleStartChat = () => {
    if (hiredAgents.length > 0) {
      // Navigate to chat with first hired agent
      navigate(`/chat?agent=${hiredAgents[0]}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '220px',
        background: '#FAFAFA',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 16px 24px 16px', // Match top padding with top bar (16px)
          gap: '8px',
          minHeight: 0,
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: '32px', padding: '0', display: 'flex', alignItems: 'center', minHeight: '32px' }}>
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
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
              color: '#010654',
              fontSize: '0.875rem',
              fontWeight: '500',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18"/>
              <path d="M9 21V9"/>
            </svg>
            Agents
          </div>

          {/* Exports (formerly Documents) */}
          <div
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
            }}
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
            Exports
          </div>

          {/* Requests (New) */}
          <div
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
            }}
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
            Requests
          </div>

          <div style={{ flex: 1 }} />

          {/* Chat Button - Only active when agents are hired */}
          <button
            onClick={handleStartChat}
            disabled={hiredAgents.length === 0}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: hiredAgents.length > 0 ? '#FFB74D' : '#f5f5f5',
              color: hiredAgents.length > 0 ? '#1e293b' : '#9ca3af',
              border: 'none',
              borderRadius: '9999px', // Full rounded button
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: hiredAgents.length > 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
              boxShadow: 'none',
              marginTop: 'auto',
            }}
            onMouseEnter={(e) => {
              if (hiredAgents.length > 0) {
                e.currentTarget.style.background = '#F5A73B';
              } else {
                e.currentTarget.style.background = '#eeeeee';
              }
            }}
            onMouseLeave={(e) => {
              if (hiredAgents.length > 0) {
                e.currentTarget.style.background = '#FFB74D';
              } else {
                e.currentTarget.style.background = '#f5f5f5';
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Chat {hiredAgents.length > 0 && `(${hiredAgents.length})`}</span>
          </button>
        </div>

        {/* User Profile at Bottom */}
        <div
          style={{
            borderTop: '1px solid #E5E7EB',
            marginTop: '16px',
            padding: '12px 16px',
            position: 'relative',
          }}
        >
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
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
