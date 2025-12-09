/**
 * Profile Page - Material Design 3
 *
 * Complete profile management matching Flask design:
 * - Account information (with editing)
 * - Change password
 * - Usage statistics
 * - Plan badge
 * - Contact requests display
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { apiClient } from '../api';
import { changePasswordSchema, type ChangePasswordFormData } from '../schemas/auth.schema';
import { PASSWORD_HELP_TEXT } from '../utils/passwordValidation';
import PasswordStrengthIndicator from '../components/forms/PasswordStrengthIndicator';

interface ProfileData {
  user: {
    username: string;
    full_name: string;
    role: string;
    created_at: string;
    plan_type: string;
  };
  plan_info: {
    type: string;
    status: string;
    end_date: string | null;
  };
  usage_stats: {
    monthly_queries: number;
    query_limit: string;
    queries_remaining: string;
    total_queries: number;
    total_conversations: number;
    total_messages: number;
    account_age_days: number;
    last_query_date: string | null;
  };
  contact_requests: Array<{
    id: number;
    name: string;
    email: string;
    company: string | null;
    message: string;
    source: string;
    status: string;
    created_at: string;
  }>;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFullName, setEditedFullName] = useState('');

  // Change password form with React Hook Form + Zod
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    reset: resetPasswordForm,
    watch,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onBlur', // Real-time validation on blur
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const newPassword = watch('new_password');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await apiClient.request<ProfileData>('profile');
      setProfileData(data);
      setEditedFullName(data.user.full_name);
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };


  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedFullName(profileData?.user.full_name || '');
  };

  const handleSaveProfile = async () => {
    try {
      await apiClient.request('profile', {
        method: 'PUT',
        body: JSON.stringify({ full_name: editedFullName }),
      });
      toast.success('Profile updated successfully');
      setIsEditing(false);
      await loadProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    try {
      await apiClient.request('profile/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: data.current_password,
          new_password: data.new_password,
          confirm_password: data.confirm_password,
        }),
      });
      toast.success('Password changed successfully');
      resetPasswordForm();
    } catch (error: any) {
      console.error('Failed to change password:', error);
      const message = error?.response?.data?.detail || 'Failed to change password';
      toast.error(message);
    }
  };

  const handleExportData = async () => {
    try {
      toast.info('Preparing your data export...');

      // Get the access token for authentication
      const token = localStorage.getItem('access_token');

      // Call the export endpoint
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/profile/export-data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get the JSON data
      const data = await response.json();

      // Create a blob and download it
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `solar_intelligence_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Data exported successfully! Check your downloads folder.');
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Failed to export data. Please try again.');
    }
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getProgressPercentage = () => {
    if (!profileData) return 0;
    const { monthly_queries, query_limit } = profileData.usage_stats;
    if (query_limit === 'Unlimited') return 100;
    const limit = parseInt(query_limit);
    return (monthly_queries / limit) * 100;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="profile-header">
        <div className="profile-header-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="/agents" style={{ textDecoration: 'none' }}>
              <img
                src="/new_logo.svg"
                alt="Solar Intelligence"
                className="logo"
                style={{
                  height: '50px',
                  width: 'auto',
                  opacity: 1,
                  filter: 'none'
                }}
              />
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={() => navigate('/agents')} className="header-btn">
                Dashboard
              </button>
              <button onClick={() => navigate('/chat')} className="header-btn">
                Chat
              </button>
              <button onClick={() => { apiClient.logout(); navigate('/login'); }} className="header-btn">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="profile-main">
        {/* Page Header */}
        <div style={{ marginBottom: '48px' }}>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account settings and view usage statistics</p>
        </div>

        <div className="profile-grid">
          {/* Left Column */}
          <div className="profile-column">
            {/* Account Information */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Account Information</h2>
                {!isEditing && (
                  <button onClick={handleEditProfile} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8125rem' }}>
                    Edit
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <span className="label">Username</span>
                  <p className="value">{profileData.user.username}</p>
                </div>
                <div>
                  <span className="label">Full Name</span>
                  {!isEditing ? (
                    <p className="value">{profileData.user.full_name || 'Not set'}</p>
                  ) : (
                    <input
                      type="text"
                      className="input-field"
                      value={editedFullName}
                      onChange={(e) => setEditedFullName(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <span className="label">Member Since</span>
                  <p className="value">{formatDate(profileData.user.created_at)}</p>
                </div>
                {isEditing && (
                  <div style={{ paddingTop: '8px' }}>
                    <button onClick={handleSaveProfile} className="btn-primary" style={{ marginRight: '12px' }}>
                      Save Changes
                    </button>
                    <button onClick={handleCancelEdit} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Change Password */}
            <div className="glass-card">
              <h2 className="section-title">Change Password</h2>

              <form onSubmit={handlePasswordSubmit(handleChangePassword)} style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label htmlFor="current-password" className="label">Current Password</label>
                  <input
                    type="password"
                    id="current-password"
                    className="input-field"
                    autoComplete="current-password"
                    {...registerPassword('current_password')}
                  />
                  {passwordErrors.current_password && (
                    <p style={{ marginTop: '6px', fontSize: '0.8125rem', color: '#dc2626' }}>
                      {passwordErrors.current_password.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="new-password" className="label">New Password</label>
                  <input
                    type="password"
                    id="new-password"
                    className="input-field"
                    autoComplete="new-password"
                    {...registerPassword('new_password')}
                  />
                  {passwordErrors.new_password && (
                    <p style={{ marginTop: '6px', fontSize: '0.8125rem', color: '#dc2626' }}>
                      {passwordErrors.new_password.message}
                    </p>
                  )}
                  {!passwordErrors.new_password && (
                    <p style={{ marginTop: '6px', fontSize: '0.75rem', color: '#9ca3af' }}>{PASSWORD_HELP_TEXT}</p>
                  )}
                  <PasswordStrengthIndicator password={newPassword || ''} showRequirements={true} />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="label">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirm-password"
                    className="input-field"
                    autoComplete="new-password"
                    {...registerPassword('confirm_password')}
                  />
                  {passwordErrors.confirm_password && (
                    <p style={{ marginTop: '6px', fontSize: '0.8125rem', color: '#dc2626' }}>
                      {passwordErrors.confirm_password.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={isPasswordSubmitting}
                >
                  {isPasswordSubmitting ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* Data & Privacy */}
            <div className="glass-card">
              <h2 className="section-title">Data & Privacy</h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px', fontWeight: 400 }}>
                Download a copy of your data, or request account deletion.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-primary" onClick={handleExportData} title="Export all your data (GDPR Art. 20)">
                  Export My Data
                </button>
                <button className="btn-danger" onClick={() => navigate('/request-deletion')}>
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="profile-column">
            {/* Current Plan */}
            <div className="plan-badge">
              <p className="plan-type">{profileData.plan_info.type}</p>
              <p className="plan-status">
                {/* Show appropriate status based on plan type */}
                {profileData.plan_info.type === 'free' || profileData.plan_info.type === 'scout'
                  ? 'Free Tier'
                  : profileData.plan_info.type === 'analyst'
                    ? 'Analyst Plan'
                    : profileData.plan_info.type === 'strategist'
                      ? 'Strategist Plan'
                      : profileData.plan_info.type === 'enterprise'
                        ? 'Enterprise Plan'
                        : profileData.plan_info.status}
              </p>
              {(profileData.plan_info.type === 'free' || profileData.plan_info.type === 'scout') ? (
                <button
                  className="upgrade-button"
                  onClick={() => window.open('https://www.becquerelinstitute.eu/shop/solarintelligence-ai-monthly-subscription-70#attr=96', '_blank', 'noopener,noreferrer')}
                >
                  Upgrade to Premium
                </button>
              ) : (
                profileData.plan_info.end_date && (
                  <p style={{ marginTop: '16px', fontSize: '0.875rem', color: '#475569', fontWeight: 400 }}>
                    Expires: {formatDate(profileData.plan_info.end_date)}
                  </p>
                )
              )}
            </div>

            {/* Usage Statistics */}
            <div className="glass-card">
              <h2 className="section-title">Usage Statistics</h2>

              {/* Queries This Month - Hide limit section for unlimited plans */}
              {profileData.usage_stats.query_limit === 'Unlimited' || parseInt(profileData.usage_stats.query_limit) >= 999999 ? (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Queries This Month</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFB74D' }}>
                      {profileData.usage_stats.monthly_queries}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Unlimited queries available
                  </p>
                </div>
              ) : (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Queries This Month</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFB74D' }}>
                      {profileData.usage_stats.monthly_queries} / {profileData.usage_stats.query_limit}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${getProgressPercentage()}%` }}></div>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.75rem', color: '#9ca3af' }}>
                    {profileData.usage_stats.queries_remaining} queries remaining
                  </p>
                </div>
              )}

              {/* Stats List */}
              <div>
                <div className="stat-item">
                  <span className="stat-label">Total Queries</span>
                  <span className="stat-value">{profileData.usage_stats.total_queries}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Conversations</span>
                  <span className="stat-value">{profileData.usage_stats.total_conversations}</span>
                </div>
              </div>

              {profileData.usage_stats.last_query_date && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Last activity: {formatDateTime(profileData.usage_stats.last_query_date)}
                  </p>
                </div>
              )}
            </div>

            {/* Contact Requests */}
            <div className="glass-card">
              <h2 className="section-title">Contact Requests</h2>
              {profileData.contact_requests && profileData.contact_requests.length > 0 ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {profileData.contact_requests.map((request) => (
                    <div key={request.id} className="activity-item">
                      {/* Header with status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#FFB74D', textTransform: 'capitalize', fontWeight: 600 }}>
                            {request.source.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>•</span>
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            {formatDate(request.created_at)}
                          </span>
                        </div>
                        <span className={`status-badge status-${request.status}`}>
                          {request.status}
                        </span>
                      </div>

                      {/* Message */}
                      <div style={{ marginBottom: '12px' }}>
                        <div className="message-box">
                          {request.message.substring(0, 150)}
                          {request.message.length > 150 && '...'}
                        </div>
                      </div>

                      {/* Sender info */}
                      <div className="sender-info">
                        <div className="sender-avatar">
                          {request.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="sender-name">{request.name}</p>
                          <p className="sender-details">
                            {request.email}
                            {request.company && ` • ${request.company}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <svg style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  <p style={{ fontSize: '0.875rem' }}>No contact requests yet</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Your contact form submissions will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        /* Material Design 3 Profile Page */
        .profile-page {
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          background: #f5f5f5;
          min-height: 100vh;
          color: #1e293b;
        }

        /* Header - MD3 flat design */
        .profile-header {
          padding: 24px 0;
          position: relative;
          z-index: 10;
          background: white;
          border-bottom: none;
        }

        .profile-header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .logo {
          height: 50px;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-btn {
          padding: 10px 20px;
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          cursor: pointer;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          position: relative;
          overflow: hidden;
        }

        .header-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        /* Main Content */
        .profile-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }

        /* Page Title - MD3 typography */
        .page-title {
          font-size: 2.5rem;
          font-weight: 400;
          color: #1e293b;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          font-size: 1.125rem;
          color: #64748b;
          font-weight: 300;
        }

        /* Grid Layout */
        .profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .profile-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Card - MD3 flat design */
        .glass-card {
          background: white;
          border: none;
          border-radius: var(--md-sys-shape-corner-large, 16px);
          padding: 32px;
          transition: none;
          box-shadow: none;
        }

        /* Section Title - MD3 typography */
        .section-title {
          font-size: 1.25rem;
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 24px;
        }

        /* Input Fields - MD3 flat design */
        .input-field {
          width: 100%;
          padding: 12px 16px;
          background: #f5f5f5;
          border: none;
          border-radius: var(--md-sys-shape-corner-small, 8px);
          color: #1e293b;
          font-size: 0.875rem;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .input-field:focus {
          outline: none;
          background: #eeeeee;
          border: none;
          box-shadow: none;
        }

        .input-field::placeholder {
          color: #9ca3af;
        }

        /* Buttons - MD3 flat design with state layers */
        .btn-primary {
          padding: 12px 24px;
          background: #FFB74D;
          color: #1e293b;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          border: none;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          cursor: pointer;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: none;
          position: relative;
          overflow: hidden;
        }

        .btn-primary::before {
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

        .btn-primary:hover::before {
          opacity: 0.08;
        }

        .btn-secondary {
          padding: 12px 24px;
          background: #f5f5f5;
          border: none;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          cursor: pointer;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: none;
        }

        .btn-secondary:hover {
          background: #eeeeee;
        }

        .btn-danger {
          padding: 12px 24px;
          background: #fee2e2;
          border: none;
          color: #dc2626;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          cursor: pointer;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: none;
        }

        .btn-danger:hover {
          background: #fecaca;
        }

        /* Label - MD3 typography */
        .label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 8px;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .value {
          font-size: 0.95rem;
          color: #1e293b;
          font-weight: 400;
        }

        /* Stats Grid - MD3 flat design */
        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .stat-item:last-child {
          border-bottom: none;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 400;
        }

        .stat-value {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1e293b;
        }

        /* Progress Bar - MD3 flat design */
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #FFB74D;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Plan Badge - MD3 flat design */
        .plan-badge {
          background: #FFB74D;
          padding: 24px;
          border-radius: var(--md-sys-shape-corner-large, 16px);
          text-align: center;
          box-shadow: none;
        }

        .plan-type {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          text-transform: capitalize;
          margin-bottom: 8px;
        }

        .plan-status {
          font-size: 0.875rem;
          color: #475569;
          font-weight: 400;
        }

        .upgrade-button {
          margin-top: 20px;
          width: 100%;
          padding: 12px;
          background: white;
          color: #1e293b;
          border: none;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .upgrade-button:hover {
          background: rgba(255, 255, 255, 0.9);
        }

        /* Activity Item - MD3 flat design */
        .activity-item {
          padding: 16px;
          background: #f5f5f5;
          border: none;
          border-radius: var(--md-sys-shape-corner-small, 8px);
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .activity-item:hover {
          background: #eeeeee;
        }

        .status-badge {
          font-size: 0.75rem;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 500;
          white-space: nowrap;
          text-transform: capitalize;
        }

        .status-pending {
          background: #FEF3C7;
          color: #92400E;
        }

        .status-contacted {
          background: #DBEAFE;
          color: #1E40AF;
        }

        .status-completed {
          background: #D1FAE5;
          color: #065F46;
        }

        .message-box {
          font-size: 0.875rem;
          font-weight: 400;
          color: #1e293b;
          line-height: 1.6;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 3px solid #FFB74D;
        }

        .sender-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }

        .sender-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFB74D 0%, #E8BF4F 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.75rem;
        }

        .sender-name {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 2px;
        }

        .sender-details {
          font-size: 0.75rem;
          color: #64748b;
        }

        .empty-state {
          text-align: center;
          padding: 32px;
          color: #9ca3af;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .page-title {
            font-size: 2rem;
          }

          .glass-card {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
}
