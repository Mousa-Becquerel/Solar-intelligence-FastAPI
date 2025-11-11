/**
 * Admin Create User Page
 * Create new users with role selection
 */

import { useState, FormEvent, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import type { CreateUserRequest } from '../../types/admin';
import styles from './Admin.module.css';

interface RoleOption {
  value: 'admin' | 'analyst' | 'researcher' | 'demo';
  name: string;
  icon: string;
  description: string;
}

const roleOptions: RoleOption[] = [
  {
    value: 'admin',
    name: 'Administrator',
    icon: '👑',
    description: 'Full system access and user management',
  },
  {
    value: 'analyst',
    name: 'Analyst',
    icon: '📊',
    description: 'Market analysis and research capabilities',
  },
  {
    value: 'researcher',
    name: 'Researcher',
    icon: '🔬',
    description: 'Research and data exploration tools',
  },
  {
    value: 'demo',
    name: 'Demo User',
    icon: '👁️',
    description: 'Limited access for demonstration purposes',
  },
];

export default function AdminCreateUserPage() {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    confirm_password: '',
  });
  const [selectedRole, setSelectedRole] = useState<'admin' | 'analyst' | 'researcher' | 'demo'>('demo');
  const [isLoading, setIsLoading] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus username field
    usernameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 3) {
      toast.error('Password must be at least 3 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const userData: CreateUserRequest = {
        username: formData.username,
        full_name: formData.full_name,
        password: formData.password,
        role: selectedRole,
      };

      await apiClient.createUser(userData);
      toast.success('User created successfully!');

      // Reset form
      setFormData({
        username: '',
        full_name: '',
        password: '',
        confirm_password: '',
      });
      setSelectedRole('demo');
      usernameInputRef.current?.focus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', background: '#ffffff', minHeight: '100vh' }}>
      <Link to="/admin/users" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6"></path>
        </svg>
        Back to User Management
      </Link>

      <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid rgba(251, 191, 36, 0.2)' }}>
        <h1 className={styles.adminTitle} style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          Create New User
        </h1>
        <p style={{ color: '#64748b', fontSize: '1rem' }}>Add a new user to the DH Agents platform</p>
      </div>

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.formLabel}>
              Username
            </label>
            <input
              ref={usernameInputRef}
              type="text"
              id="username"
              className={styles.formInput}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <div className={styles.formHelp}>Username must be unique and will be used for login</div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="full_name" className={styles.formLabel}>
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              className={styles.formInput}
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
            <div className={styles.formHelp}>Display name shown in the interface</div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password
            </label>
            <input
              type="password"
              id="password"
              className={styles.formInput}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <div className={styles.formHelp}>Minimum 3 characters required</div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirm_password" className={styles.formLabel}>
              Confirm Password
            </label>
            <input
              type="password"
              id="confirm_password"
              className={styles.formInput}
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              required
            />
            <div className={styles.formHelp}>Re-enter the password to confirm</div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>User Role</label>
            <div className={styles.roleInfo}>
              {roleOptions.map((role) => (
                <div
                  key={role.value}
                  className={`${styles.roleCard} ${selectedRole === role.value ? styles.selected : ''}`}
                  onClick={() => setSelectedRole(role.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.roleName}>
                    <span style={{ marginRight: '0.5rem' }}>{role.icon}</span>
                    {role.name}
                  </div>
                  <div className={styles.roleDescription}>{role.description}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={isLoading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            {isLoading ? 'Creating User...' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  );
}
