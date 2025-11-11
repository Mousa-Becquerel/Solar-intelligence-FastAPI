/**
 * Request Account Deletion Page
 *
 * GDPR-compliant account deletion with 30-day grace period
 * Article 17 - Right to Erasure
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../api';
import { useAuthStore } from '../stores';

interface DeletionStatus {
  alreadyDeleted: boolean;
  daysRemaining: number;
  permanentDeletionDate: string | null;
}

export default function RequestDeletionPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);
  const [reason, setReason] = useState('');
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [confirmGDPR, setConfirmGDPR] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadDeletionStatus();
  }, []);

  const loadDeletionStatus = async () => {
    try {
      setLoading(true);
      const currentUser = await apiClient.getCurrentUser();

      if (currentUser.deletion_requested_at) {
        const deletionDate = new Date(currentUser.deletion_requested_at);
        const permanentDate = new Date(deletionDate);
        permanentDate.setDate(permanentDate.getDate() + 30);

        const today = new Date();
        const daysRemaining = Math.ceil((permanentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        setDeletionStatus({
          alreadyDeleted: true,
          daysRemaining: Math.max(0, daysRemaining),
          permanentDeletionDate: permanentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        });
      } else {
        setDeletionStatus({
          alreadyDeleted: false,
          daysRemaining: 0,
          permanentDeletionDate: null
        });
      }
    } catch (error) {
      console.error('Failed to load deletion status:', error);
      toast.error('Failed to load account status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  const confirmAccountDeletion = async () => {
    try {
      await apiClient.request('auth/request-deletion', {
        method: 'POST',
        body: JSON.stringify({ reason: reason || null })
      });

      toast.success('Account deletion requested. You have 30 days to cancel.');
      setShowModal(false);
      loadDeletionStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to request account deletion');
      setShowModal(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!confirm('Are you sure you want to cancel the deletion request and restore your account?')) {
      return;
    }

    try {
      await apiClient.request('auth/cancel-deletion', {
        method: 'POST'
      });

      toast.success('Account deletion cancelled. Your account is safe!');
      navigate('/profile');
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel deletion');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="deletion-page">
      {/* Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon">
                <svg width="32" height="32" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
              <h2 className="modal-title">Delete Account?</h2>
              <p className="modal-subtitle">This action cannot be undone</p>
            </div>
            <div className="modal-body">
              <div className="modal-warning">
                <p className="modal-warning-title">⚠️ Permanent Deletion After 30 Days</p>
                <p>Your account will be deactivated immediately, and all data will be permanently deleted after the 30-day grace period.</p>
              </div>
              <p style={{ marginBottom: '1rem' }}>The following will be permanently removed:</p>
              <ul className="modal-list">
                <li>Your account and all personal information</li>
                <li>All conversation history</li>
                <li>Generated charts and reports</li>
                <li>All associated data</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setShowModal(false)}>
                Cancel - Keep My Account
              </button>
              <button type="button" className="modal-btn modal-btn-confirm" onClick={confirmAccountDeletion}>
                Yes, Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="nav-header">
              <div className="logo-section">
                <img src="/new_logo.svg" alt="Solar Intelligence" className="logo" />
              </div>
              <button onClick={() => navigate('/agents')} className="back-link">
                ← Back to Dashboard
              </button>
            </div>

            <div className="hero-title">
              <div className="warning-icon">
                <svg width="32" height="32" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
              <h1>Delete Account</h1>
              {deletionStatus?.alreadyDeleted ? (
                <p>Your account is scheduled for deletion. You have {deletionStatus.daysRemaining} days remaining to cancel this request.</p>
              ) : (
                <p>Request account deletion with a 30-day grace period. You can cancel anytime within 30 days if you change your mind.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          <div className="content-card">
            {deletionStatus?.alreadyDeleted ? (
              <>
                {/* Account Already Scheduled for Deletion */}
                <div className="warning-box">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                  <div>
                    <h3>Account Deletion Scheduled</h3>
                    <p>
                      Your account is scheduled for permanent deletion on <strong>{deletionStatus.permanentDeletionDate}</strong>.
                      You have <strong>{deletionStatus.daysRemaining} days</strong> remaining to cancel this request.
                    </p>
                  </div>
                </div>

                <div className="info-box">
                  <h3>Changed your mind?</h3>
                  <p>
                    You can restore your account within the 30-day grace period. Click the button below to cancel the deletion.
                  </p>
                  <button onClick={handleCancelDeletion} className="cancel-deletion-btn">
                    Cancel Deletion - Restore My Account
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Normal Deletion Request */}
                <div className="info-box safety-net">
                  <h3>🛡️ 30-Day Safety Net</h3>
                  <p>
                    We understand that sometimes people act in haste. That's why we've implemented a <strong>30-day grace period</strong>:
                  </p>
                  <ul>
                    <li>
                      <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      Your account will be deactivated immediately
                    </li>
                    <li>
                      <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      You can cancel deletion within 30 days
                    </li>
                    <li>
                      <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      After 30 days, deletion becomes permanent
                    </li>
                  </ul>
                </div>

                <div className="warning-box">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <div>
                    <h3>After 30 Days: Permanent Deletion</h3>
                    <p>Once the grace period expires, all of your data will be permanently removed from our servers and cannot be recovered.</p>
                  </div>
                </div>

                <div className="info-box">
                  <h3>What will be deleted:</h3>
                  <ul>
                    <li>
                      <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      Your user account and profile information
                    </li>
                    <li>
                      <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      All your conversations and chat history
                    </li>
                    <li>
                      <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      Generated charts and analysis reports
                    </li>
                    <li>
                      <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      Usage logs and technical data
                    </li>
                  </ul>
                </div>

                <div className="export-box">
                  <h3>Before you delete your account:</h3>
                  <p>Consider downloading your data first. Under GDPR, you have the right to export all your data.</p>
                  <button disabled className="export-btn" title="Export feature coming soon">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Export My Data First (Coming Soon)
                  </button>
                </div>

                {/* Deletion Form */}
                <form onSubmit={handleSubmit} className="deletion-form">
                  <div className="form-section">
                    <label className="form-label">
                      Optional: Why are you leaving? (helps us improve)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      className="form-textarea"
                      placeholder="e.g., Not using the service, Found alternative, Too expensive, etc."
                    />

                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={confirmDeletion}
                          onChange={(e) => setConfirmDeletion(e.target.checked)}
                          required
                          className="checkbox-input"
                        />
                        <span>
                          I understand that my account will be deactivated immediately, with permanent deletion after 30 days.
                        </span>
                      </label>
                    </div>

                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={confirmGDPR}
                          onChange={(e) => setConfirmGDPR(e.target.checked)}
                          required
                          className="checkbox-input"
                        />
                        <span>
                          I acknowledge my GDPR rights and understand this deletion is performed under Article 17 (Right to Erasure).
                        </span>
                      </label>
                    </div>

                    <div className="button-group">
                      <button type="button" onClick={() => navigate('/agents')} className="btn btn-secondary">
                        Cancel - Keep My Account
                      </button>
                      <button type="submit" className="btn btn-danger">
                        Schedule Account Deletion
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-links">
              <a href="/terms">Terms of Service</a>
              <a href="/privacy">Privacy Policy</a>
              <a href="mailto:info@becquerelinstitute.eu">Contact</a>
            </div>
            <div className="copyright">
              © 2025 Solar Intelligence - Becquerel Institute. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        :root {
          --becq-blue: #1e3a8a;
          --becq-gold: #f59e0b;
          --becq-light-blue: #3b82f6;
          --text-primary: #1f2937;
          --text-secondary: #6b7280;
          --text-muted: #9ca3af;
        }

        .deletion-page {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.6;
          color: var(--text-primary);
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          min-height: 100vh;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .hero-section {
          background: linear-gradient(135deg, var(--becq-blue) 0%, var(--becq-light-blue) 100%);
          color: white;
          padding: 4rem 0;
          position: relative;
          overflow: hidden;
        }

        .hero-content {
          position: relative;
          z-index: 1;
        }

        .nav-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 3rem;
        }

        .logo {
          height: 60px;
          width: auto;
        }

        .back-link {
          background: rgba(255, 255, 255, 0.15);
          padding: 0.75rem 1.5rem;
          border-radius: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .back-link:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        .hero-title {
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
        }

        .warning-icon {
          width: 4rem;
          height: 4rem;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 2rem;
          backdrop-filter: blur(10px);
          color: white;
        }

        .hero-title h1 {
          font-size: 3.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #ffffff 0%, var(--becq-gold) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-title p {
          font-size: 1.25rem;
          opacity: 0.9;
          font-weight: 300;
          line-height: 1.7;
        }

        .main-content {
          padding: 4rem 0;
        }

        .content-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 1.5rem;
          padding: 3rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .warning-box {
          background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 20%);
          border: 1px solid var(--becq-gold);
          border-radius: 1rem;
          padding: 1.5rem;
          margin: 2rem 0;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .warning-box svg {
          flex-shrink: 0;
          color: var(--becq-gold);
        }

        .warning-box h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }

        .warning-box p {
          color: var(--text-secondary);
          margin: 0;
        }

        .info-box {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 20%);
          border: 1px solid var(--becq-light-blue);
          border-radius: 1rem;
          padding: 1.5rem;
          margin: 2rem 0;
        }

        .info-box.safety-net {
          background: linear-gradient(135deg, #eff6ff 0%, #93c5fd 20%);
        }

        .info-box h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        .info-box p {
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }

        .info-box ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .info-box li {
          display: flex;
          align-items: center;
          margin-bottom: 0.75rem;
          color: var(--text-secondary);
        }

        .check-icon {
          width: 1.25rem;
          height: 1.25rem;
          margin-right: 0.75rem;
          color: #059669;
          flex-shrink: 0;
        }

        .export-box {
          background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 20%);
          border: 1px solid var(--becq-gold);
          border-radius: 1rem;
          padding: 1.5rem;
          margin: 2rem 0;
        }

        .export-box h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        .export-box p {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }

        .export-btn, .cancel-deletion-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--becq-gold) 0%, #f97316 100%);
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          font-size: 1rem;
        }

        .export-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .export-btn:not(:disabled):hover, .cancel-deletion-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .deletion-form {
          border-top: 1px solid #e5e7eb;
          padding-top: 2rem;
          margin-top: 2rem;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-label {
          display: block;
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .form-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-family: inherit;
          font-size: 0.9rem;
          resize: vertical;
        }

        .checkbox-group {
          display: flex;
          align-items: flex-start;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          cursor: pointer;
        }

        .checkbox-input {
          width: 1rem;
          height: 1rem;
          margin-top: 0.25rem;
          accent-color: var(--becq-blue);
          cursor: pointer;
        }

        .checkbox-label span {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 1rem;
        }

        .btn {
          padding: 0.875rem 2rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: var(--text-primary);
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-danger {
          background: linear-gradient(135deg, var(--becq-gold) 0%, #f97316 100%);
          color: white;
        }

        .btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(251, 191, 36, 0.3);
        }

        .footer {
          background: rgba(255, 255, 255, 0.95);
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          padding: 3rem 0;
          margin-top: 4rem;
          backdrop-filter: blur(20px);
        }

        .footer-content {
          text-align: center;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .footer-links a {
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          transition: all 0.3s ease;
        }

        .footer-links a:hover {
          color: var(--becq-blue);
          background: rgba(59, 130, 246, 0.1);
        }

        .copyright {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: white;
          border-radius: 1.5rem;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
          overflow: hidden;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          background: linear-gradient(135deg, var(--becq-blue) 0%, var(--becq-light-blue) 100%);
          padding: 2rem;
          text-align: center;
        }

        .modal-icon {
          width: 4rem;
          height: 4rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          color: white;
        }

        .modal-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.5rem;
        }

        .modal-subtitle {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.9);
        }

        .modal-body {
          padding: 2rem;
        }

        .modal-warning {
          background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 20%);
          border: 1px solid var(--becq-gold);
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .modal-warning-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .modal-warning p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin: 0;
        }

        .modal-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .modal-list li {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          padding-left: 1.5rem;
          position: relative;
        }

        .modal-list li:before {
          content: '•';
          position: absolute;
          left: 0.5rem;
          color: var(--becq-gold);
          font-weight: bold;
        }

        .modal-footer {
          padding: 0 2rem 2rem;
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .modal-btn {
          padding: 0.875rem 2rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 140px;
          font-family: inherit;
        }

        .modal-btn-cancel {
          background: #f3f4f6;
          color: var(--text-primary);
        }

        .modal-btn-cancel:hover {
          background: #e5e7eb;
        }

        .modal-btn-confirm {
          background: linear-gradient(135deg, var(--becq-gold) 0%, #f97316 100%);
          color: white;
        }

        .modal-btn-confirm:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(251, 191, 36, 0.3);
        }

        @media (max-width: 768px) {
          .container {
            padding: 0 1rem;
          }

          .hero-title h1 {
            font-size: 2.5rem;
          }

          .content-card {
            padding: 2rem;
          }

          .nav-header {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }

          .button-group, .modal-footer {
            flex-direction: column;
          }

          .modal-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
