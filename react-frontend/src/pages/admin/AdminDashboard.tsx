/**
 * Admin Dashboard - Landing page for all admin features
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores';
import { apiClient } from '../../api/client';
import './AdminDashboard.css';

interface DashboardStats {
  totalUsers: number;
  pendingVerifications: number;
  activeBreaches: number;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingVerifications: 0,
    activeBreaches: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const [usersData, pendingData] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getPendingUsers(),
      ]);
      setStats({
        totalUsers: usersData.length,
        pendingVerifications: pendingData.length,
        activeBreaches: 0, // Breach count from breaches endpoint if implemented
      });
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      links: [
        { to: '/admin/users', label: 'All Users', badge: null },
        { to: '/admin/users/pending', label: 'Pending Verifications', badge: stats.pendingVerifications > 0 ? stats.pendingVerifications.toString() : null },
        { to: '/admin/users/create', label: 'Create New User', badge: null },
      ],
      color: '#F57C00',
    },
    {
      title: 'Platform Analytics',
      description: 'Track platform usage with anonymized user data',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 20V10"></path>
          <path d="M12 20V4"></path>
          <path d="M6 20v-6"></path>
        </svg>
      ),
      links: [
        { to: '/admin/analytics', label: 'View Analytics Dashboard', badge: null },
      ],
      color: '#F57C00',
    },
    {
      title: 'Data Breach Management',
      description: 'GDPR Articles 33-34: Monitor and manage security incidents',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
      ),
      links: [
        { to: '/admin/breaches', label: 'Active Breaches', badge: null },
        { to: '/admin/breaches', label: 'Report New Breach', badge: null },
      ],
      color: '#F57C00',
    },
  ];

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="admin-subtitle">
            Welcome back, {user?.full_name || 'Administrator'}
          </p>
        </div>
        <Link to="/agents" className="back-to-app-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"></path>
          </svg>
          Back to App
        </Link>
      </div>

      {/* Admin Sections Grid */}
      <div className="admin-sections-grid">
        {adminSections.map((section) => (
          <div key={section.title} className="admin-section-card">
            <div className="section-icon" style={{ color: section.color }}>
              {section.icon}
            </div>
            <h2 className="section-title">{section.title}</h2>
            <p className="section-description">{section.description}</p>

            <div className="section-links">
              {section.links.map((link) => (
                <Link
                  key={link.to + link.label}
                  to={link.to}
                  className="section-link"
                  style={{ borderLeftColor: section.color }}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="link-badge" style={{ backgroundColor: section.color }}>
                      {link.badge}
                    </span>
                  )}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FFF3E0', color: '#F57C00' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">TOTAL USERS</p>
            <p className="stat-value">{isLoading ? '...' : stats.totalUsers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FFF3E0', color: '#F57C00' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">ACTIVE BREACHES</p>
            <p className="stat-value">{isLoading ? '...' : stats.activeBreaches}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FFF3E0', color: '#F57C00' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">PENDING VERIFICATIONS</p>
            <p className="stat-value">{isLoading ? '...' : stats.pendingVerifications}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
