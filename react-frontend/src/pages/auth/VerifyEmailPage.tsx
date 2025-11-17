/**
 * Email Verification Page
 *
 * Verifies user email using token from URL query params
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '../../services/auth';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        toast.error('Invalid verification link');
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(response.message || 'Email verified successfully!');
        toast.success('Email verified! You can now log in.');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { message: 'Email verified successfully! Please log in.' }
          });
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to verify email');
        toast.error('Verification failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="verify-email-container">
      <div className="verify-email-card">
        {/* Logo Section */}
        <div className="logo-section">
          <a href="/">
            <img
              src="/new_logo.svg"
              alt="Solar Intelligence"
              className="logo"
              style={{
                height: '50px',
                width: 'auto',
                margin: '0 auto 20px',
                display: 'block'
              }}
            />
          </a>
          <h1 className="verify-title">Email Verification</h1>
        </div>

        {/* Status Content */}
        <div className="status-content">
          {status === 'verifying' && (
            <>
              <div className="loading-spinner"></div>
              <p className="status-message">Verifying your email...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="success-icon">✅</div>
              <h2 className="status-title">Success!</h2>
              <p className="status-message">{message}</p>
              <p className="redirect-message">Redirecting to login page...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="error-icon">❌</div>
              <h2 className="status-title">Verification Failed</h2>
              <p className="status-message">{message}</p>
              <div className="action-buttons">
                <button
                  onClick={() => navigate('/login')}
                  className="btn-secondary"
                >
                  Go to Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="btn-primary"
                >
                  Create New Account
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        /* Verify Email Container - MD3 Background */
        .verify-email-container {
          min-height: 100vh;
          padding: 40px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #010654 0%, #060B5A 100%);
          background-attachment: fixed;
        }

        /* Verify Email Card */
        .verify-email-card {
          background: #FFFFFF;
          border-radius: 28px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          box-shadow:
            0px 2px 4px -1px rgba(0, 0, 0, 0.2),
            0px 4px 5px 0px rgba(0, 0, 0, 0.14),
            0px 1px 10px 0px rgba(0, 0, 0, 0.12);
          text-align: center;
        }

        .logo-section {
          margin-bottom: 30px;
        }

        .verify-title {
          font-size: 1.75rem;
          font-weight: 400;
          color: #010654;
          margin: 0;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .status-content {
          padding: 20px 0;
        }

        /* Loading Spinner */
        .loading-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(1, 6, 84, 0.1);
          border-top-color: #010654;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Status Icons */
        .success-icon,
        .error-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .status-title {
          font-size: 1.5rem;
          font-weight: 500;
          color: #010654;
          margin: 0 0 12px 0;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .status-message {
          font-size: 1rem;
          color: rgba(1, 6, 84, 0.7);
          margin: 0 0 12px 0;
          line-height: 1.5;
        }

        .redirect-message {
          font-size: 0.875rem;
          color: rgba(1, 6, 84, 0.5);
          margin: 20px 0 0 0;
          font-style: italic;
        }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 24px;
          min-height: 40px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
          border: none;
          flex: 1;
          min-width: 140px;
        }

        .btn-primary {
          background: #010654;
          color: #FFFFFF;
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15);
        }

        .btn-primary:hover {
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15);
        }

        .btn-secondary {
          background: transparent;
          color: #010654;
          border: 1px solid rgba(1, 6, 84, 0.38);
        }

        .btn-secondary:hover {
          background: rgba(1, 6, 84, 0.04);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .verify-email-card {
            padding: 30px 20px;
          }

          .verify-title {
            font-size: 1.5rem;
          }

          .action-buttons {
            flex-direction: column;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
