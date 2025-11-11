/**
 * Login Page
 *
 * Login form with gradient background matching Flask design
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';

interface LoginFormData {
  username: string;
  password: string;
  remember: boolean;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.username, data.password);

      toast.success('Login successful! Redirecting...');

      // Redirect to the page they were trying to access, or agents page
      const from = (location.state as any)?.from?.pathname || '/agents';
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <div className="login-container">
      {/* Gradient Background - Exact match to Flask */}
      <div className="login-card">
        {/* Logo Section */}
        <div className="logo-section">
          <a href="/">
            <img
              src="/new_logo.svg"
              alt="Solar Intelligence"
              className="logo"
              style={{
                height: '80px',
                width: 'auto',
                margin: '0 auto 20px',
                filter: 'brightness(0) invert(1)',
                opacity: 0.95,
                display: 'block'
              }}
            />
          </a>
          <h1 className="login-title">Welcome <span className="accent-color">Back</span></h1>
          <p className="login-subtitle">
            Sign in to access your solar market intelligence
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email/Username Field */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Email Address
            </label>
            <input
              id="username"
              type="email"
              autoComplete="email"
              autoFocus
              className="form-input"
              placeholder="you@example.com"
              {...register('username', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />
            {errors.username && (
              <p className="form-error">{errors.username.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="form-input"
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && (
              <p className="form-error">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                className="checkbox-input"
                {...register('remember')}
              />
              <span>Remember me</span>
            </label>
            <a href="/forgot-password" className="link-text">
              Forgot password?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="submit-button"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="loading-spinner-small" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="form-footer">
          <p className="footer-text">
            Don't have an account?{' '}
            <a href="/register" className="link-text accent-color">
              Sign up
            </a>
          </p>
        </div>

        {/* Footer Links */}
        <div className="form-footer-links">
          <a href="/privacy" className="footer-link">
            Privacy
          </a>
          <span className="text-white/30">•</span>
          <a href="/terms" className="footer-link">
            Terms
          </a>
        </div>
      </div>

      <style>{`
        /* Login Container - Full viewport with gradient */
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          position: relative;
          overflow-y: auto;
          background:
            radial-gradient(circle at 20% 30%, rgba(251, 191, 36, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(4, 11, 89, 0.4) 0%, transparent 70%),
            linear-gradient(135deg, #0a1850 0%, #1e1b4b 30%, #312e81 60%, #3730a3 100%);
          background-size: 100% 100%;
          background-attachment: scroll;
        }

        /* Login Card - Glassmorphic */
        .login-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 48px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 10;
        }

        /* Logo Section */
        .logo-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .logo-placeholder {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .login-title {
          font-size: 1.875rem;
          font-weight: 300;
          color: #ffffff;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .login-subtitle {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 400;
        }

        .accent-color {
          color: #E9A544;
        }

        /* Form Styles */
        .form-group {
          margin-bottom: 24px;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 8px;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: #ffffff;
          font-size: 0.9375rem;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          transition: all 0.2s ease;
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .form-input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          border-color: #E9A544;
          box-shadow: 0 0 0 3px rgba(233, 165, 68, 0.1);
        }

        .form-error {
          margin-top: 6px;
          font-size: 0.8125rem;
          color: #ff6b6b;
        }

        .password-input-wrapper {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .password-toggle:hover {
          opacity: 1;
        }

        .form-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
          cursor: pointer;
        }

        .checkbox-input {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .link-text {
          color: #E9A544;
          font-size: 0.875rem;
          text-decoration: none;
          transition: color 0.2s;
        }

        .link-text:hover {
          color: #fbbf24;
        }

        .submit-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #E9A544 0%, #fbbf24 100%);
          border: none;
          border-radius: 12px;
          color: #0a1850;
          font-size: 0.9375rem;
          font-weight: 600;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(233, 165, 68, 0.3);
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(233, 165, 68, 0.4);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(10, 24, 80, 0.3);
          border-top-color: #0a1850;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .form-footer {
          margin-top: 32px;
          text-align: center;
        }

        .footer-text {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
        }

        .form-footer-links {
          margin-top: 24px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .footer-link {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8125rem;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-link:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        /* Responsive */
        @media (max-width: 640px) {
          .login-card {
            padding: 32px 24px;
          }

          .login-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
