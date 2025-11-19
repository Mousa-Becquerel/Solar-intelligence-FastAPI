/**
 * ForgotPasswordPage Component
 * Material Design 3 - Matches sign-in/sign-up style
 */

import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await authService.forgotPassword(email);
      setMessage({
        type: 'success',
        text: 'Password reset link has been sent to your email.',
      });
      setEmail('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to send reset link. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        {/* Logo Section */}
        <div className="logo-section">
          <a href="/">
            <img
              src="/new_logo.svg"
              alt="Solar Intelligence"
              className="logo"
              style={{
                height: '60px',
                width: 'auto',
                margin: '0 auto 16px',
                display: 'block'
              }}
            />
          </a>
          <h1 className="forgot-password-title">
            Forgot <span className="accent-color">Password</span>
          </h1>
          <p className="forgot-password-subtitle">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Alert Messages */}
        {message && (
          <div className={message.type === 'error' ? 'alert-error' : 'alert-success'}>
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="loading-spinner-small" />
                Sending...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="form-footer">
          <Link to="/login" className="back-link">
            ← Back to Sign In
          </Link>
        </div>
      </div>

      <style>{`
        /* Forgot Password Container - MD3 Background with Brand Colors */
        .forgot-password-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          position: relative;
          overflow-y: auto;
          /* MD3: Clean gradient with brand Federal Blue and Dark Blue */
          background: linear-gradient(135deg, #010654 0%, #060B5A 100%);
          background-attachment: fixed;
        }

        /* Forgot Password Card - MD3 Surface with Elevation Level 2 */
        .forgot-password-card {
          /* MD3: Surface color with proper elevation */
          background: #FFFFFF; /* MD3 surface color */
          border: none;
          border-radius: 28px; /* MD3: Extra-large corner radius for cards */
          padding: 32px;
          max-width: 420px;
          width: 100%;
          /* MD3: Elevation level 2 shadow for raised surface */
          box-shadow:
            0px 2px 4px -1px rgba(0, 0, 0, 0.2),
            0px 4px 5px 0px rgba(0, 0, 0, 0.14),
            0px 1px 10px 0px rgba(0, 0, 0, 0.12);
          position: relative;
          z-index: 10;
        }

        /* Logo Section */
        .logo-section {
          text-align: center;
          margin-bottom: 24px;
        }

        .forgot-password-title {
          font-size: 1.5rem;
          font-weight: 400; /* MD3: Regular weight for headlines */
          color: #010654; /* MD3: on-surface (Federal Blue) */
          margin-bottom: 6px;
          letter-spacing: -0.02em;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .forgot-password-subtitle {
          font-size: 0.875rem;
          color: rgba(1, 6, 84, 0.7); /* MD3: on-surface with opacity */
          font-weight: 400;
          line-height: 1.6;
        }

        .accent-color {
          color: #E89C43; /* Brand: Butterscotch */
        }

        /* Alert Messages */
        .alert-error,
        .alert-success {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          font-weight: 400;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #dc2626;
        }

        .alert-success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #16a34a;
        }

        /* Form Styles */
        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500; /* MD3: Medium weight for labels */
          color: #010654; /* MD3: on-surface (Federal Blue) */
          margin-bottom: 8px;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .form-input {
          width: 100%;
          padding: 12px 14px;
          background: #FFFFFF; /* MD3: Surface */
          border: 1px solid rgba(1, 6, 84, 0.38); /* MD3: Outline */
          border-radius: 4px; /* MD3: Small corner radius for text fields */
          color: #010654; /* MD3: on-surface */
          font-size: 0.875rem;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); /* MD3: Standard easing */
        }

        .form-input::placeholder {
          color: rgba(1, 6, 84, 0.6); /* MD3: on-surface variant */
        }

        .form-input:focus {
          outline: none;
          border-color: #010654; /* MD3: Primary (Federal Blue) */
          border-width: 2px;
          padding: 11px 13px; /* Adjusted for border width */
          box-shadow: none; /* MD3: No shadow on text fields */
        }

        /* MD3: Filled button with primary color */
        .submit-button {
          width: 100%;
          padding: 10px 24px;
          min-height: 40px; /* MD3: Minimum touch target */
          background: #010654; /* MD3: Primary (Federal Blue) */
          border: none;
          border-radius: 20px; /* MD3: Full corner radius for filled buttons */
          color: #FFFFFF; /* MD3: on-primary */
          font-size: 0.875rem;
          font-weight: 500; /* MD3: Medium weight for buttons */
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          letter-spacing: 0.1px; /* MD3: Slight letter spacing for buttons */
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1); /* MD3: Emphasized easing for interactions */
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15); /* MD3: Elevation level 1 */
          position: relative;
          overflow: hidden;
        }

        /* MD3: State layer for button */
        .submit-button::before {
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

        .submit-button:hover:not(:disabled) {
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15); /* MD3: Elevation level 2 on hover */
        }

        .submit-button:hover:not(:disabled)::before {
          opacity: 0.08; /* MD3: State layer on hover */
        }

        .submit-button:active:not(:disabled) {
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15); /* MD3: Back to elevation 1 on press */
        }

        .submit-button:active:not(:disabled)::before {
          opacity: 0.12; /* MD3: State layer on press */
        }

        .submit-button:disabled {
          background: rgba(1, 6, 84, 0.12); /* MD3: Disabled surface */
          color: rgba(1, 6, 84, 0.38); /* MD3: Disabled on-surface */
          box-shadow: none;
          cursor: not-allowed;
        }

        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
          vertical-align: middle;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .flex {
          display: flex;
        }

        .items-center {
          align-items: center;
        }

        .justify-center {
          justify-content: center;
        }

        .gap-2 {
          gap: 8px;
        }

        /* Form Footer */
        .form-footer {
          margin-top: 20px;
          text-align: center;
        }

        .back-link {
          color: #E89C43; /* Brand: Butterscotch */
          font-size: 0.875rem;
          text-decoration: none;
          transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1); /* MD3: Standard easing */
        }

        .back-link:hover {
          color: #D68A34; /* Darker Butterscotch for hover */
          text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .forgot-password-card {
            padding: 32px 24px;
          }

          .forgot-password-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ForgotPasswordPage;
