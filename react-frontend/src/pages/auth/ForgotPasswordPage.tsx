/**
 * ForgotPasswordPage Component
 * Ported from templates/forgot_password.html
 */

import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import styles from './AuthPage.module.css';

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
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoSection}>
          <img src="/logos/new_logo.svg" alt="Solar Intelligence" className={styles.logo} />
          <h1 className={styles.title}>
            Forgot <span className={styles.accentColor}>Password</span>
          </h1>
          <p className={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {message && (
          <div className={message.type === 'error' ? styles.alertError : styles.alertSuccess}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className={styles.formInput}
              placeholder="your.email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={isLoading}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <Link to="/login" className={styles.backLink}>
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
