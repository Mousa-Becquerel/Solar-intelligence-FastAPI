/**
 * Register Page
 *
 * Registration form with gradient background matching Flask design
 * Collects full user profile data for GDPR compliance
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';
import { COUNTRIES, COMPANY_SIZES } from '../constants/countries';
import type { RegisterRequest } from '../types/api';

interface RegisterFormData extends RegisterRequest {
  confirmPassword: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const [showPassword, setShowPassword] = useState(false);

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registerData } = data;

      await registerUser(registerData);

      toast.success('Account created successfully! Redirecting...');

      // Redirect to agents page after successful registration
      setTimeout(() => {
        navigate('/agents', { replace: true });
      }, 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    }
  };

  return (
    <div className="register-container">
      {/* Gradient Background - Exact match to Flask */}
      <div className="register-card">
        {/* Logo Section */}
        <div className="logo-section">
          <a href="/">
            <img
              src="/new_logo.svg"
              alt="Solar Intelligence"
              className="logo"
              style={{
                height: '70px',
                width: 'auto',
                margin: '0 auto 20px',
                filter: 'brightness(0) invert(1)',
                opacity: 0.95,
                display: 'block'
              }}
            />
          </a>
          <h1 className="register-title">Create <span className="accent-color">Account</span></h1>
          <p className="register-subtitle">
            Join the future of solar market intelligence
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Name Fields - Two Column */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name" className="form-label">
                First name *
              </label>
              <input
                id="first_name"
                type="text"
                autoFocus
                className="form-input"
                placeholder="Enter your first name"
                {...register('first_name', {
                  required: 'First name is required',
                })}
              />
              {errors.first_name && (
                <p className="form-error">{errors.first_name.message}</p>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="last_name" className="form-label">
                Last name *
              </label>
              <input
                id="last_name"
                type="text"
                className="form-input"
                placeholder="Enter your last name"
                {...register('last_name', {
                  required: 'Last name is required',
                })}
              />
              {errors.last_name && (
                <p className="form-error">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          {/* Job and Company - Two Column */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="job_title" className="form-label">
                Job title *
              </label>
              <input
                id="job_title"
                type="text"
                className="form-input"
                placeholder="Your job title"
                {...register('job_title', {
                  required: 'Job title is required',
                })}
              />
              {errors.job_title && (
                <p className="form-error">{errors.job_title.message}</p>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="company_name" className="form-label">
                Company name *
              </label>
              <input
                id="company_name"
                type="text"
                className="form-input"
                placeholder="Your company name"
                {...register('company_name', {
                  required: 'Company name is required',
                })}
              />
              {errors.company_name && (
                <p className="form-error">{errors.company_name.message}</p>
              )}
            </div>
          </div>

          {/* Email and Password - Two Column */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email *
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="form-input"
                placeholder="your.email@company.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password *
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="form-input"
                  placeholder="Create a secure password"
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
          </div>

          {/* Country and Company Size - Two Column */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="country" className="form-label">
                Country *
              </label>
              <select
                id="country"
                className="form-select"
                {...register('country', {
                  required: 'Country is required',
                })}
              >
                <option value="">Please Select</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p className="form-error">{errors.country.message}</p>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="company_size" className="form-label">
                Company Size *
              </label>
              <select
                id="company_size"
                className="form-select"
                {...register('company_size', {
                  required: 'Company size is required',
                })}
              >
                <option value="">Please Select</option>
                {COMPANY_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
              {errors.company_size && (
                <p className="form-error">{errors.company_size.message}</p>
              )}
            </div>
          </div>

          {/* GDPR Consent Section */}
          <div className="consent-section">
            <h3 className="consent-title">Data Processing Consent (Required)</h3>

            {/* Terms and Privacy Agreement */}
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="terms-agreement"
                className="form-checkbox"
                {...register('terms_agreement', {
                  required: 'You must agree to the terms and privacy policy',
                })}
              />
              <label htmlFor="terms-agreement" className="checkbox-label">
                <strong>Required:</strong> I agree to the{' '}
                <a href="/terms" target="_blank">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank">
                  Privacy Policy
                </a>
                , and understand my rights under GDPR.
              </label>
            </div>
            {errors.terms_agreement && (
              <p className="form-error">{errors.terms_agreement.message}</p>
            )}

            {/* Optional Marketing Communications */}
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="communications"
                className="form-checkbox"
                {...register('communications')}
              />
              <label htmlFor="communications" className="checkbox-label">
                <strong>Optional:</strong> I would like to receive marketing communications
                about products, services, and industry insights.{' '}
                <span style={{ opacity: 0.7 }}>(You can unsubscribe at any time)</span>
              </label>
            </div>
          </div>

          {/* GDPR Rights Notice */}
          <div className="rights-notice">
            <p className="notice-title">Your Data Rights:</p>
            <p>
              Under GDPR, you have the right to access, rectify, erase, or export your
              personal data. You can exercise these rights through your account settings or by
              contacting{' '}
              <a href="mailto:info@becquerelinstitute.eu">info@becquerelinstitute.eu</a>
            </p>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? (
              <>
                <div className="loading-spinner-small" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create My Account</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="form-footer">
          <p className="footer-text">
            Already have an account?{' '}
            <a href="/login" className="link-text accent-color">
              Sign in
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
        /* Register Container - Full viewport with gradient */
        .register-container {
          min-height: 100vh;
          padding: 40px 20px;
          position: relative;
          background:
            radial-gradient(circle at 20% 30%, rgba(251, 191, 36, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(4, 11, 89, 0.4) 0%, transparent 70%),
            linear-gradient(135deg, #0a1850 0%, #1e1b4b 30%, #312e81 60%, #3730a3 100%);
          background-size: 100% 100%;
          background-attachment: fixed;
        }

        /* Register Card - Glassmorphic */
        .register-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 48px;
          max-width: 900px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 10;
          margin: 0 auto 40px auto;
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

        .register-title {
          font-size: 1.875rem;
          font-weight: 300;
          color: #ffffff;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .register-subtitle {
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

        .form-input:focus,
        .form-select:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(233, 165, 68, 0.6);
          box-shadow: 0 0 0 3px rgba(233, 165, 68, 0.15);
        }

        .form-select {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: #ffffff;
          font-size: 0.95rem;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .form-select option {
          background: #1e1b4b;
          color: #ffffff;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
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

        /* Consent Section */
        .consent-section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .consent-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 16px;
        }

        .checkbox-group {
          display: flex;
          align-items: start;
          margin-bottom: 12px;
        }

        .form-checkbox {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          margin-right: 12px;
          accent-color: #E9A544;
          cursor: pointer;
          flex-shrink: 0;
        }

        .checkbox-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
        }

        .checkbox-label a {
          color: #E9A544;
          text-decoration: none;
        }

        .checkbox-label a:hover {
          text-decoration: underline;
        }

        /* Rights Notice */
        .rights-notice {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
        }

        .rights-notice p {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }

        .rights-notice .notice-title {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 6px;
        }

        .rights-notice a {
          color: #E9A544;
          text-decoration: none;
        }

        .rights-notice a:hover {
          text-decoration: underline;
        }

        .btn-primary {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #E9A544 0%, #E8BF4F 100%);
          color: #ffffff;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        .link-text {
          color: #E9A544;
          font-size: 0.875rem;
          text-decoration: none;
          transition: color 0.2s;
        }

        .link-text:hover {
          color: #fbbf24;
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
        @media (max-width: 768px) {
          .register-card {
            padding: 36px 28px;
          }

          .register-title {
            font-size: 1.5rem;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
}
