/**
 * Admin Users Page
 * User management dashboard for administrators
 */

import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import type { User, UpdateUserRequest } from '../../types/admin';
import styles from './Admin.module.css';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: '',
    password: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, pendingData] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getPendingUsers(),
      ]);
      setUsers(usersData);
      setPendingCount(pendingData.length);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name,
      role: user.role,
      password: '',
    });
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setEditForm({ full_name: '', role: '', password: '' });
  };

  const handleUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: UpdateUserRequest = {
        full_name: editForm.full_name,
        role: editForm.role,
      };

      // Only include password if it was changed
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      await apiClient.updateUser(editingUser.id, updateData);
      toast.success('User updated successfully');
      handleCloseModal();
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleToggleStatus = async (userId: number) => {
    try {
      await apiClient.toggleUserStatus(userId);
      toast.success('User status updated');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle user status');
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) {
      return;
    }

    try {
      await apiClient.deleteUser(userId);
      toast.success(`${userName} has been deleted`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: styles.roleAdmin,
      analyst: styles.roleAnalyst,
      researcher: styles.roleResearcher,
      demo: styles.roleDemo,
    };
    return `${styles.roleBadge} ${roleMap[role] || styles.roleDemo}`;
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          User Management
        </h1>
        <div className={styles.adminActions}>
          <Link to="/admin/users/create" className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            Create User
          </Link>
          <Link to="/agents" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"></path>
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Pending Users Alert */}
      {pendingCount > 0 && (
        <div className={`${styles.alert} ${styles.alertWarning}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>
            There {pendingCount === 1 ? 'is' : 'are'} <strong>{pendingCount}</strong> pending user{pendingCount !== 1 ? 's' : ''} awaiting approval.{' '}
            <Link to="/admin/users/pending" style={{ textDecoration: 'underline', fontWeight: 600 }}>
              View pending users
            </Link>
          </span>
        </div>
      )}

      {/* Users Table */}
      <div className={styles.usersTable}>
        <div className={styles.tableHeader}>
          <div>ID</div>
          <div>User Info</div>
          <div>Role</div>
          <div>Status</div>
          <div>Created</div>
          <div>Actions</div>
        </div>

        {users.map((user) => (
          <div key={user.id} className={styles.userRow}>
            <div>{user.id}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.full_name}</div>
              <div className={styles.userUsername}>{user.username}</div>
            </div>
            <div>
              <span className={getRoleBadgeClass(user.role)}>{user.role.toUpperCase()}</span>
            </div>
            <div>
              <span className={user.is_active ? styles.statusActive : styles.statusInactive}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>{new Date(user.created_at).toLocaleDateString()}</div>
            <div className={styles.userActions}>
              <button
                className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                onClick={() => handleEdit(user)}
                title="Edit User"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button
                className={`${styles.btn} ${styles.btnSm} ${user.is_active ? styles.btnWarning : styles.btnSuccess}`}
                onClick={() => handleToggleStatus(user.id)}
                title={user.is_active ? 'Deactivate' : 'Activate'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {user.is_active ? (
                    <path d="M18 6L6 18M6 6l12 12"></path>
                  ) : (
                    <polyline points="20 6 9 17 4 12"></polyline>
                  )}
                </svg>
              </button>
              <button
                className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                onClick={() => handleDeleteUser(user.id, user.full_name)}
                title="Delete User"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className={styles.modal} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit User</h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateUser}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Full Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Role</label>
                <select
                  className={styles.formSelect}
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="analyst">Analyst</option>
                  <option value="researcher">Researcher</option>
                  <option value="demo">Demo</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>New Password</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Leave blank to keep current password"
                />
                <div className={styles.formHelp}>Leave blank to keep current password</div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
