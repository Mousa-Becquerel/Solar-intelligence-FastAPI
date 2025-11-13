/**
 * Password Strength Indicator Component
 *
 * Visual password strength meter with Material Design 3 styling
 * Shows strength bar and helpful feedback in real-time
 */

import { useMemo } from 'react';
import { validatePassword, getStrengthLabel, getStrengthColor } from '../../utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export default function PasswordStrengthIndicator({
  password,
  showRequirements = false,
}: PasswordStrengthIndicatorProps) {
  const validation = useMemo(() => {
    if (!password) {
      return null;
    }
    return validatePassword(password);
  }, [password]);

  if (!password) {
    return null;
  }

  if (!validation) {
    return null;
  }

  const strengthLabel = getStrengthLabel(validation.strength);
  const strengthColor = getStrengthColor(validation.strength);
  const widthPercentage = ((validation.score + 1) / 5) * 100; // 0-4 score maps to 20-100%

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* Strength Bar */}
      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${widthPercentage}%`,
            height: '100%',
            backgroundColor: strengthColor,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      {/* Strength Label */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.375rem',
        }}
      >
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: strengthColor,
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
          }}
        >
          {strengthLabel}
        </span>
        {!validation.isValid && (
          <span
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            }}
          >
            {validation.errors.length} requirement{validation.errors.length > 1 ? 's' : ''} missing
          </span>
        )}
      </div>

      {/* Error Messages / Requirements */}
      {showRequirements && !validation.isValid && validation.errors.length > 0 && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            borderRadius: '6px',
            border: '1px solid #fee2e2',
          }}
        >
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.25rem',
              fontSize: '0.8125rem',
              color: '#dc2626',
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            }}
          >
            {validation.errors.map((error, index) => (
              <li key={index} style={{ marginBottom: index < validation.errors.length - 1 ? '0.25rem' : 0 }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {validation.isValid && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '6px',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span
            style={{
              fontSize: '0.8125rem',
              color: '#16a34a',
              fontWeight: 500,
              fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
            }}
          >
            Password meets all requirements
          </span>
        </div>
      )}
    </div>
  );
}
