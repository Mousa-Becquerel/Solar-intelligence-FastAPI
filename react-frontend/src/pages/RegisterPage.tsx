/**
 * Register Page
 *
 * Registration form with gradient background matching Flask design
 * Collects full user profile data for GDPR compliance
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';
import { COUNTRIES, COMPANY_SIZES } from '../constants/countries';
import { registerSchema, type RegisterFormData } from '../schemas/auth.schema';
import PasswordStrengthIndicator from '../components/forms/PasswordStrengthIndicator';
import type { RegisterRequest } from '../types/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur', // Real-time validation on blur
  });

  const [showPassword, setShowPassword] = useState(false);

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registerData } = data as RegisterFormData & { confirmPassword: string };

      await registerUser(registerData as RegisterRequest);

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
                height: '50px',
                width: 'auto',
                margin: '0 auto 12px',
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
                {...register('first_name')}
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
                {...register('last_name')}
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
                {...register('job_title')}
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
                {...register('company_name')}
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
                {...register('email')}
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
              <PasswordStrengthIndicator password={password || ''} showRequirements={true} />
            </div>
          </div>

          {/* Confirm Password - Full Width */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="form-input"
              placeholder="Re-enter your password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="form-error">{errors.confirmPassword.message}</p>
            )}
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
                {...register('country')}
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
                {...register('company_size')}
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
                {...register('terms_agreement')}
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
        /* Register Container - MD3 Background with Brand Colors */
        .register-container {
          min-height: 100vh;
          padding: 40px 20px;
          position: relative;
          overflow-y: auto;
          /* MD3: Clean gradient with brand Federal Blue and Dark Blue */
          background: linear-gradient(135deg, #010654 0%, #060B5A 100%);
          background-attachment: fixed;
        }

        /* Register Card - MD3 Surface with Elevation Level 2 */
        .register-card {
          /* MD3: Surface color with proper elevation */
          background: #FFFFFF; /* MD3 surface color */
          border: none;
          border-radius: 28px; /* MD3: Extra-large corner radius for cards */
          padding: 24px;
          max-width: 800px;
          width: 100%;
          /* MD3: Elevation level 2 shadow for raised surface */
          box-shadow:
            0px 2px 4px -1px rgba(0, 0, 0, 0.2),
            0px 4px 5px 0px rgba(0, 0, 0, 0.14),
            0px 1px 10px 0px rgba(0, 0, 0, 0.12);
          position: relative;
          z-index: 10;
          margin: 0 auto 40px auto;
        }

        /* Logo Section */
        .logo-section {
          text-align: center;
          margin-bottom: 16px;
        }

        .logo-placeholder {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .register-title {
          font-size: 1.375rem;
          font-weight: 400; /* MD3: Regular weight for headlines */
          color: #010654; /* MD3: on-surface (Federal Blue) */
          margin-bottom: 4px;
          letter-spacing: -0.02em;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .register-subtitle {
          font-size: 0.8125rem;
          color: rgba(1, 6, 84, 0.7); /* MD3: on-surface with opacity */
          font-weight: 400;
        }

        .accent-color {
          color: #E89C43; /* Brand: Butterscotch */
        }

        /* Form Styles */
        .form-group {
          margin-bottom: 10px;
        }

        .form-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 500; /* MD3: Medium weight for labels */
          color: #010654; /* MD3: on-surface (Federal Blue) */
          margin-bottom: 4px;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          background: #FFFFFF; /* MD3: Surface */
          border: 1px solid rgba(1, 6, 84, 0.38); /* MD3: Outline */
          border-radius: 4px; /* MD3: Small corner radius for text fields */
          color: #010654; /* MD3: on-surface */
          font-size: 0.8125rem;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); /* MD3: Standard easing */
        }

        .form-input::placeholder {
          color: rgba(1, 6, 84, 0.6); /* MD3: on-surface variant */
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #010654; /* MD3: Primary (Federal Blue) */
          border-width: 2px;
          padding: 9px 11px; /* Adjusted for border width */
          box-shadow: none; /* MD3: No shadow on text fields */
        }

        .form-select {
          width: 100%;
          padding: 10px 12px;
          background: #FFFFFF; /* MD3: Surface */
          border: 1px solid rgba(1, 6, 84, 0.38); /* MD3: Outline */
          border-radius: 4px; /* MD3: Small corner radius */
          color: #010654; /* MD3: on-surface */
          font-size: 0.8125rem;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); /* MD3: Standard easing */
          cursor: pointer;
        }

        .form-select option {
          background: #FFFFFF;
          color: #010654;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }

        .form-error {
          margin-top: 4px;
          font-size: 0.75rem;
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
          background: rgba(1, 6, 84, 0.04); /* MD3: Surface variant */
          border: 1px solid rgba(1, 6, 84, 0.12); /* MD3: Outline variant */
          border-radius: 12px; /* MD3: Medium corner radius */
          padding: 12px;
          margin-bottom: 10px;
        }

        .consent-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #010654; /* MD3: on-surface */
          margin-bottom: 10px;
        }

        .checkbox-group {
          display: flex;
          align-items: start;
          margin-bottom: 8px;
        }

        .form-checkbox {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          margin-right: 10px;
          accent-color: #010654; /* MD3: Primary (Federal Blue) */
          cursor: pointer;
          flex-shrink: 0;
        }

        .checkbox-label {
          font-size: 0.8125rem;
          color: rgba(1, 6, 84, 0.8); /* MD3: on-surface with opacity */
          line-height: 1.5;
        }

        .checkbox-label a {
          color: #E89C43; /* Brand: Butterscotch */
          text-decoration: none;
          transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .checkbox-label a:hover {
          color: #D68A34; /* Darker Butterscotch for hover */
          text-decoration: underline;
        }

        /* Rights Notice */
        .rights-notice {
          background: rgba(1, 6, 84, 0.03); /* MD3: Surface variant */
          border: 1px solid rgba(1, 6, 84, 0.12); /* MD3: Outline variant */
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 10px;
        }

        .rights-notice p {
          font-size: 0.6875rem;
          color: rgba(1, 6, 84, 0.7); /* MD3: on-surface with opacity */
          line-height: 1.4;
        }

        .rights-notice .notice-title {
          font-weight: 600;
          color: #010654; /* MD3: on-surface */
          margin-bottom: 3px;
        }

        .rights-notice a {
          color: #E89C43; /* Brand: Butterscotch */
          text-decoration: none;
          transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .rights-notice a:hover {
          color: #D68A34; /* Darker Butterscotch for hover */
          text-decoration: underline;
        }

        /* MD3: Filled button with primary color */
        .btn-primary {
          width: 100%;
          padding: 10px 24px;
          min-height: 40px; /* MD3: Minimum touch target */
          background: #010654; /* MD3: Primary (Federal Blue) */
          border: none;
          border-radius: 20px; /* MD3: Full corner radius for filled buttons */
          color: #FFFFFF; /* MD3: on-primary */
          font-size: 0.8125rem;
          font-weight: 500; /* MD3: Medium weight for buttons */
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          letter-spacing: 0.1px; /* MD3: Slight letter spacing for buttons */
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1); /* MD3: Emphasized easing for interactions */
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15); /* MD3: Elevation level 1 */
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        /* MD3: State layer for button */
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

        .btn-primary:hover:not(:disabled) {
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15); /* MD3: Elevation level 2 on hover */
        }

        .btn-primary:hover:not(:disabled)::before {
          opacity: 0.08; /* MD3: State layer on hover */
        }

        .btn-primary:active:not(:disabled) {
          box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15); /* MD3: Back to elevation 1 on press */
        }

        .btn-primary:active:not(:disabled)::before {
          opacity: 0.12; /* MD3: State layer on press */
        }

        .btn-primary:disabled {
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
          margin-top: 12px;
          text-align: center;
        }

        .footer-text {
          color: rgba(1, 6, 84, 0.7); /* MD3: on-surface with opacity */
          font-size: 0.75rem;
        }

        .link-text {
          color: #E89C43; /* Brand: Butterscotch */
          font-size: 0.75rem;
          text-decoration: none;
          transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1); /* MD3: Standard easing */
        }

        .link-text:hover {
          color: #D68A34; /* Darker Butterscotch for hover */
          text-decoration: underline;
        }

        .form-footer-links {
          margin-top: 8px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .footer-link {
          color: rgba(1, 6, 84, 0.6); /* MD3: on-surface variant */
          font-size: 0.6875rem;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-link:hover {
          color: #010654; /* MD3: on-surface */
          text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .register-card {
            padding: 24px 20px;
          }

          .register-title {
            font-size: 1.375rem;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
