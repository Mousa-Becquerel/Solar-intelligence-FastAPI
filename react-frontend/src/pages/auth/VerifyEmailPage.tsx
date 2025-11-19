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
              <div className="success-icon">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="40" fill="#010654" fillOpacity="0.1"/>
                  <circle cx="40" cy="40" r="32" fill="#010654"/>
                  <path d="M28 40L36 48L52 32" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="status-title">Success!</h2>
              <p className="status-message">{message}</p>
              <p className="redirect-message">Redirecting to login page...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="error-icon">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="40" fill="#ef4444" fillOpacity="0.15"/>
                  <circle cx="40" cy="40" r="32" fill="#ef4444" fillOpacity="0.2"/>
                  <path d="M32 32L48 48M48 32L32 48" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"/>
                </svg>
              </div>
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
        /* Verify Email Container - MD3 Background with Brand Colors */
        .verify-email-container {
          min-height: 100vh;
          padding: 40px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow-y: auto;
          /* MD3: Clean gradient with brand Federal Blue and Dark Blue */
          background: linear-gradient(135deg, #010654 0%, #060B5A 100%);
          background-attachment: fixed;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        /* Verify Email Card - MD3 Surface with Elevation Level 2 */
        .verify-email-card {
          /* MD3: Surface color with proper elevation */
          background: #FFFFFF; /* MD3 surface color */
          border: none;
          border-radius: 28px; /* MD3: Extra-large corner radius for cards */
          padding: 40px;
          max-width: 500px;
          width: 100%;
          /* MD3: Elevation level 2 shadow for raised surface */
          box-shadow:
            0px 2px 4px -1px rgba(0, 0, 0, 0.2),
            0px 4px 5px 0px rgba(0, 0, 0, 0.14),
            0px 1px 10px 0px rgba(0, 0, 0, 0.12);
          position: relative;
          z-index: 10;
          text-align: center;
        }

        .logo-section {
          margin-bottom: 30px;
        }

        .verify-title {
          font-size: 1.5rem;
          font-weight: 400; /* MD3: Regular weight for headlines */
          color: #010654; /* MD3: on-surface (Federal Blue) */
          margin: 0;
          letter-spacing: -0.02em;
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
          border-top-color: #010654; /* Brand Federal Blue */
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
          margin-bottom: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .status-title {
          font-size: 1.5rem;
          font-weight: 400;
          color: #010654; /* MD3: on-surface (Federal Blue) */
          margin: 0 0 12px 0;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .status-message {
          font-size: 1rem;
          color: rgba(1, 6, 84, 0.7); /* MD3: on-surface with opacity */
          margin: 0 0 12px 0;
          line-height: 1.5;
          font-weight: 400;
        }

        .redirect-message {
          font-size: 0.875rem;
          color: rgba(1, 6, 84, 0.6); /* MD3: on-surface variant */
          margin: 20px 0 0 0;
          font-style: italic;
          font-weight: 300;
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
          min-height: 40px; /* MD3: Minimum touch target */
          border-radius: 20px; /* MD3: Full corner radius for filled buttons */
          font-size: 0.875rem;
          font-weight: 500; /* MD3: Medium weight for buttons */
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          letter-spacing: 0.1px; /* MD3: Slight letter spacing for buttons */
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1); /* MD3: Emphasized easing for interactions */
          border: none;
          flex: 1;
          min-width: 140px;
          position: relative;
          overflow: hidden;
        }

        .btn-primary {
          background: #010654; /* MD3: Primary (Federal Blue) */
          color: #FFFFFF; /* MD3: on-primary */
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15); /* MD3: Elevation level 1 */
        }

        /* MD3: State layer for primary button */
        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #FFFFFF; /* MD3: on-primary for state layer */
          opacity: 0;
          transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-primary:hover {
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15); /* MD3: Elevation level 2 on hover */
        }

        .btn-primary:hover::before {
          opacity: 0.08; /* MD3: State layer on hover */
        }

        .btn-secondary {
          background: transparent;
          color: #010654; /* MD3: Primary (Federal Blue) */
          border: 1px solid rgba(1, 6, 84, 0.38); /* MD3: Outline */
          box-shadow: none;
        }

        .btn-secondary:hover {
          background: rgba(1, 6, 84, 0.04); /* MD3: State layer */
          box-shadow: none;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .verify-email-card {
            padding: 32px 24px;
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
