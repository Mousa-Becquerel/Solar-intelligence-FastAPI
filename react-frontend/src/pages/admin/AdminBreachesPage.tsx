/**
 * Admin Data Breach Management Page
 * GDPR Articles 33-34 compliance
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../../api';
import './AdminBreachesPage.css';

interface Breach {
  id: number;
  breach_type: string;
  severity: string;
  description: string;
  risk_level: string;
  status: string;
  discovered_at: string;
  estimated_affected_users: number | null;
  internal_team_notified: boolean;
  dpa_notified: boolean;
  users_notified: boolean;
}

export default function AdminBreachesPage() {
  const [breaches, setBreaches] = useState<Breach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBreach, setSelectedBreach] = useState<Breach | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    breach_type: 'unauthorized_access',
    severity: 'medium',
    risk_level: 'moderate',
    description: '',
    affected_data_categories: ['email', 'profile'],
    estimated_affected_users: 0,
    discovered_by: '',
    discovery_method: 'automated_monitoring',
  });

  useEffect(() => {
    loadBreaches();
  }, []);

  const loadBreaches = async () => {
    try {
      setLoading(true);
      const data = await apiClient.request<Breach[]>('admin/breach/active');
      setBreaches(data);
    } catch (error) {
      console.error('Failed to load breaches:', error);
      toast.error('Failed to load breaches');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBreach = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await apiClient.request('admin/breach/create', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      toast.success('Breach created successfully');
      setShowCreateModal(false);
      loadBreaches();

      // Reset form
      setFormData({
        breach_type: 'unauthorized_access',
        severity: 'medium',
        risk_level: 'moderate',
        description: '',
        affected_data_categories: ['email', 'profile'],
        estimated_affected_users: 0,
        discovered_by: '',
        discovery_method: 'automated_monitoring',
      });
    } catch (error) {
      console.error('Failed to create breach:', error);
      toast.error('Failed to create breach');
    }
  };

  const handleNotifyDPA = async (breachId: number) => {
    const consequences = prompt('Enter likely consequences:');
    if (!consequences) return;

    const technical = prompt('Enter technical measures in place:');
    if (!technical) return;

    const organizational = prompt('Enter organizational measures:');
    if (!organizational) return;

    const remediation = prompt('Enter remediation steps taken:');
    if (!remediation) return;

    try {
      await apiClient.request('admin/breach/notify-dpa', {
        method: 'POST',
        body: JSON.stringify({
          breach_id: breachId,
          likely_consequences: consequences,
          technical_measures: technical,
          organizational_measures: organizational,
          remediation_steps: remediation,
        }),
      });

      toast.success('DPA notified successfully');
      loadBreaches();
    } catch (error) {
      console.error('Failed to notify DPA:', error);
      toast.error('Failed to notify DPA');
    }
  };

  const handleNotifyUsers = async (breachId: number) => {
    const userActions = prompt(
      'Enter recommended actions for users (separate with newlines):\n\nExample:\n1. Change your password immediately\n2. Enable two-factor authentication\n3. Review account activity'
    );
    if (!userActions) return;

    try {
      const result = await apiClient.request<{ users_notified: number }>('admin/breach/notify-users', {
        method: 'POST',
        body: JSON.stringify({
          breach_id: breachId,
          user_actions: userActions,
        }),
      });

      toast.success(`Notified ${result.users_notified} users successfully`);
      loadBreaches();
    } catch (error) {
      console.error('Failed to notify users:', error);
      toast.error('Failed to notify users');
    }
  };

  const handleUpdateStatus = async (breachId: number, newStatus: string) => {
    const notes = prompt(`Update status to "${newStatus}".\n\nEnter notes (optional):`);

    try {
      await apiClient.request(`admin/breach/${breachId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          notes: notes || undefined,
          contained_at: newStatus === 'contained' ? new Date().toISOString() : undefined,
          resolved_at: newStatus === 'resolved' ? new Date().toISOString() : undefined,
        }),
      });

      toast.success(`Breach status updated to ${newStatus}`);
      loadBreaches();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#84cc16';
      default:
        return '#64748b';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#dc2626';
      case 'investigating':
        return '#f59e0b';
      case 'contained':
        return '#3b82f6';
      case 'resolved':
        return '#10b981';
      case 'closed':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading breaches...</p>
      </div>
    );
  }

  return (
    <div className="admin-breaches-page">
      <div className="page-header">
        <div>
          <h1>Data Breach Management</h1>
          <p className="page-subtitle">GDPR Articles 33-34 Compliance</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Report Breach
        </button>
      </div>

      {breaches.length === 0 ? (
        <div className="empty-state">
          <p>No active breaches</p>
          <p className="empty-subtitle">Create a breach report when a security incident occurs</p>
        </div>
      ) : (
        <div className="breaches-grid">
          {breaches.map((breach) => (
            <div key={breach.id} className="breach-card">
              <div className="breach-header">
                <div className="breach-title">
                  <h3>Breach #{breach.id}</h3>
                  <span
                    className="breach-severity"
                    style={{ backgroundColor: getSeverityColor(breach.severity) }}
                  >
                    {breach.severity.toUpperCase()}
                  </span>
                  <span
                    className="breach-status"
                    style={{ backgroundColor: getStatusColor(breach.status) }}
                  >
                    {breach.status}
                  </span>
                </div>
                <p className="breach-type">{breach.breach_type.replace(/_/g, ' ').toUpperCase()}</p>
              </div>

              <div className="breach-details">
                <p className="breach-description">{breach.description}</p>

                <div className="breach-meta">
                  <div className="meta-item">
                    <span className="meta-label">Risk Level:</span>
                    <span className="meta-value">{breach.risk_level}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Affected Users:</span>
                    <span className="meta-value">{breach.estimated_affected_users || 'Unknown'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Discovered:</span>
                    <span className="meta-value">
                      {new Date(breach.discovered_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="notification-status">
                  <div className={`status-badge ${breach.internal_team_notified ? 'notified' : 'pending'}`}>
                    {breach.internal_team_notified ? '✓' : '○'} Internal Team
                  </div>
                  <div className={`status-badge ${breach.dpa_notified ? 'notified' : 'pending'}`}>
                    {breach.dpa_notified ? '✓' : '○'} DPA
                  </div>
                  <div className={`status-badge ${breach.users_notified ? 'notified' : 'pending'}`}>
                    {breach.users_notified ? '✓' : '○'} Users
                  </div>
                </div>
              </div>

              <div className="breach-actions">
                {!breach.dpa_notified && (
                  <button
                    className="btn-warning"
                    onClick={() => handleNotifyDPA(breach.id)}
                    title="Notify Data Protection Authority (72-hour window)"
                  >
                    Notify DPA
                  </button>
                )}

                {!breach.users_notified && breach.risk_level === 'high' && (
                  <button
                    className="btn-danger"
                    onClick={() => handleNotifyUsers(breach.id)}
                    title="Notify affected users"
                  >
                    Notify Users
                  </button>
                )}

                {breach.status === 'open' && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleUpdateStatus(breach.id, 'investigating')}
                  >
                    Start Investigation
                  </button>
                )}

                {breach.status === 'investigating' && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleUpdateStatus(breach.id, 'contained')}
                  >
                    Mark Contained
                  </button>
                )}

                {breach.status === 'contained' && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleUpdateStatus(breach.id, 'resolved')}
                  >
                    Mark Resolved
                  </button>
                )}

                {breach.status === 'resolved' && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleUpdateStatus(breach.id, 'closed')}
                  >
                    Close Breach
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Breach Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report Data Breach</h2>
              <button className="close-button" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBreach}>
              <div className="form-group">
                <label>Breach Type</label>
                <select
                  value={formData.breach_type}
                  onChange={(e) => setFormData({ ...formData, breach_type: e.target.value })}
                  required
                >
                  <option value="unauthorized_access">Unauthorized Access</option>
                  <option value="data_leak">Data Leak</option>
                  <option value="system_compromise">System Compromise</option>
                  <option value="accidental_disclosure">Accidental Disclosure</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Risk Level</label>
                  <select
                    value={formData.risk_level}
                    onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what happened..."
                  rows={4}
                  required
                />
              </div>

              <div className="form-group">
                <label>Estimated Affected Users</label>
                <input
                  type="number"
                  value={formData.estimated_affected_users}
                  onChange={(e) =>
                    setFormData({ ...formData, estimated_affected_users: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Discovered By</label>
                  <input
                    type="text"
                    value={formData.discovered_by}
                    onChange={(e) => setFormData({ ...formData, discovered_by: e.target.value })}
                    placeholder="Security Team"
                  />
                </div>

                <div className="form-group">
                  <label>Discovery Method</label>
                  <select
                    value={formData.discovery_method}
                    onChange={(e) => setFormData({ ...formData, discovery_method: e.target.value })}
                  >
                    <option value="automated_monitoring">Automated Monitoring</option>
                    <option value="user_report">User Report</option>
                    <option value="audit">Security Audit</option>
                    <option value="penetration_test">Penetration Test</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Breach Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
