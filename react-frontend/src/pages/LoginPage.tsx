/**
 * Login Page
 *
 * Login form with gradient background matching Flask design
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur', // Real-time validation on blur
  });

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
                height: '60px',
                width: 'auto',
                margin: '0 auto 16px',
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
              {...register('username')}
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
                {...register('password')}
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
        /* Login Container - MD3 Background with Brand Colors */
        .login-container {
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

        /* Login Card - MD3 Surface with Elevation Level 2 */
        .login-card {
          /* MD3: Surface color with proper elevation */
          background: #FFFFFF; /* MD3 surface color */
          border: none;
          border-radius: 28px; /* MD3: Extra-large corner radius for cards */
          padding: 32px; /* Reduced from 48px */
          max-width: 420px; /* Reduced from 480px */
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
          margin-bottom: 24px; /* Reduced from 40px */
        }

        .logo-placeholder {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .login-title {
          font-size: 1.5rem; /* Reduced from 1.875rem */
          font-weight: 400; /* MD3: Regular weight for headlines */
          color: #010654; /* MD3: on-surface (Federal Blue) */
          margin-bottom: 6px; /* Reduced from 8px */
          letter-spacing: -0.02em;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .login-subtitle {
          font-size: 0.875rem; /* Reduced from 0.95rem */
          color: rgba(1, 6, 84, 0.7); /* MD3: on-surface with opacity */
          font-weight: 400;
        }

        .accent-color {
          color: #E89C43; /* Brand: Butterscotch */
        }

        /* Form Styles */
        .form-group {
          margin-bottom: 16px; /* Reduced from 24px */
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
          padding: 12px 14px; /* Reduced from 14px 16px */
          background: #FFFFFF; /* MD3: Surface */
          border: 1px solid rgba(1, 6, 84, 0.38); /* MD3: Outline */
          border-radius: 4px; /* MD3: Small corner radius for text fields */
          color: #010654; /* MD3: on-surface */
          font-size: 0.875rem; /* Reduced from 0.9375rem */
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
          margin-bottom: 16px; /* Reduced from 24px */
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #010654; /* MD3: on-surface */
          font-size: 0.875rem;
          cursor: pointer;
        }

        .checkbox-input {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #010654; /* MD3: Primary */
        }

        .link-text {
          color: #E89C43; /* Brand: Butterscotch */
          font-size: 0.875rem;
          text-decoration: none;
          transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1); /* MD3: Standard easing */
        }

        .link-text:hover {
          color: #D68A34; /* Darker Butterscotch for hover */
          text-decoration: underline;
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
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .form-footer {
          margin-top: 20px; /* Reduced from 32px */
          text-align: center;
        }

        .footer-text {
          color: rgba(1, 6, 84, 0.7); /* MD3: on-surface with opacity */
          font-size: 0.875rem;
        }

        .form-footer-links {
          margin-top: 16px; /* Reduced from 24px */
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .footer-link {
          color: rgba(1, 6, 84, 0.6); /* MD3: on-surface variant */
          font-size: 0.8125rem;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-link:hover {
          color: #010654; /* MD3: on-surface */
          text-decoration: underline;
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
