/**
 * Admin Pending Users Page
 * Manage pending user approvals
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import type { PendingUser } from '../../types/admin';
import styles from './Admin.module.css';

export default function AdminPendingUsersPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getPendingUsers();
      setPendingUsers(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load pending users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to approve ${userName}?`)) {
      return;
    }

    try {
      await apiClient.approveUser(userId);
      toast.success(`${userName} has been approved`);
      // Remove the user from the list
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve user');
    }
  };

  const handleReject = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to reject ${userName}? This will delete their account permanently.`)) {
      return;
    }

    try {
      await apiClient.deleteUser(userId);
      toast.success(`${userName} has been rejected and removed`);
      // Remove the user from the list
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject user');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.adminContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      {/* Header */}
      <div className={styles.adminHeader}>
        <h1 className={styles.adminTitle}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Pending User Approvals
        </h1>
        <div className={styles.adminActions}>
          <Link to="/admin/users" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            All Users
          </Link>
          <Link to="/agents" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"></path>
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{pendingUsers.length}</div>
          <div className={styles.statLabel}>Pending Approvals</div>
        </div>
      </div>

      {/* Pending Users List */}
      <div>
        {pendingUsers.length > 0 ? (
          pendingUsers.map((user) => (
            <div key={user.id} className={styles.pendingCard}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: '#0a1850', fontWeight: 600, marginBottom: '0.25rem' }}>{user.full_name}</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                    <strong>Email:</strong> {user.username}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                    <strong>Role:</strong> {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                    <span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ display: 'inline', marginRight: '0.25rem' }}
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      Registered: {new Date(user.created_at).toLocaleString()}
                    </span>
                    <span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ display: 'inline', marginRight: '0.25rem' }}
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      ID: {user.id}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className={`${styles.btn} ${styles.btnSuccess}`}
                    onClick={() => handleApprove(user.id, user.full_name)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Approve
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    onClick={() => handleReject(user.id, user.full_name)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h3>No Pending Approvals</h3>
            <p>All user registrations are up to date!</p>
          </div>
        )}
      </div>
    </div>
  );
}
