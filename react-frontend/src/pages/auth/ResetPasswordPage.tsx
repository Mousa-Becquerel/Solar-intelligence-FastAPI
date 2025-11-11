/**
 * ResetPasswordPage Component
 * Ported from templates/reset_password.html
 */

import { useState, FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import styles from './AuthPage.module.css';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match.',
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 8 characters long.',
      });
      setIsLoading(false);
      return;
    }

    try {
      await authService.resetPassword(token, password);
      setMessage({
        type: 'success',
        text: 'Password reset successfully! Redirecting to login...',
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to reset password. The link may have expired.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoSection}>
          <img src="/logos/new_logo.svg" alt="Solar Intelligence" className={styles.logo} />
          <h1 className={styles.title}>
            Reset <span className={styles.accentColor}>Password</span>
          </h1>
          <p className={styles.subtitle}>Choose a new password for your account.</p>
        </div>

        {message && (
          <div className={message.type === 'error' ? styles.alertError : styles.alertSuccess}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              New Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className={styles.formInput}
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
              disabled={isLoading}
            />
            <p className={styles.passwordHint}>Must be at least 8 characters long</p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirm_password" className={styles.formLabel}>
              Confirm Password
            </label>
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              className={styles.formInput}
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <Link to="/login" className={styles.backLink}>
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
