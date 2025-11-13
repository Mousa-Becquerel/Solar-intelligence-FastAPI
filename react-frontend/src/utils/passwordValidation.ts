/**
 * Password Validation Utility
 *
 * Centralized password validation logic with strength calculation
 * Used across all forms requiring password input
 */

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-4
}

/**
 * Validates password against security requirements
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 *
 * @param password - Password string to validate
 * @returns Validation result with errors and strength
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Calculate strength score
  const strength = calculatePasswordStrength(password);

  return {
    isValid: errors.length === 0,
    errors,
    strength: strength.level,
    score: strength.score,
  };
}

/**
 * Calculate password strength based on length and character variety
 *
 * Scoring:
 * - 0: Very weak (< 8 chars or missing requirements)
 * - 1: Weak (8-9 chars, all requirements met)
 * - 2: Medium (10-11 chars, all requirements met)
 * - 3: Strong (12-15 chars, all requirements met)
 * - 4: Very strong (16+ chars, all requirements met)
 *
 * @param password - Password string to evaluate
 * @returns Strength level and numeric score
 */
function calculatePasswordStrength(password: string): {
  level: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
} {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  const hasAllRequirements =
    hasUpperCase && hasLowerCase && hasNumbers;
  const meetsMinLength = password.length >= PASSWORD_MIN_LENGTH;

  // If doesn't meet basic requirements, it's weak
  if (!hasAllRequirements || !meetsMinLength) {
    return { level: 'weak', score: 0 };
  }

  // Bonus points for special characters
  const hasSpecial = hasSpecialChar ? 2 : 0;

  // Score based on length + special char bonus
  if (password.length >= 16 || (password.length >= 12 && hasSpecial)) {
    return { level: 'very-strong', score: 4 };
  } else if (password.length >= 12 || (password.length >= 10 && hasSpecial)) {
    return { level: 'strong', score: 3 };
  } else if (password.length >= 10) {
    return { level: 'medium', score: 2 };
  } else {
    return { level: 'weak', score: 1 };
  }
}

/**
 * Get user-friendly error message from validation result
 *
 * @param result - Validation result from validatePassword
 * @returns Combined error message string
 */
export function getPasswordErrorMessage(
  result: PasswordValidationResult
): string {
  if (result.isValid) {
    return '';
  }

  // Return the first error (most important)
  return result.errors[0] || 'Invalid password';
}

/**
 * Get strength label text
 *
 * @param strength - Strength level
 * @returns Human-readable strength label
 */
export function getStrengthLabel(
  strength: 'weak' | 'medium' | 'strong' | 'very-strong'
): string {
  const labels = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    'very-strong': 'Very Strong',
  };
  return labels[strength];
}

/**
 * Get strength color for UI display
 *
 * @param strength - Strength level
 * @returns CSS color value
 */
export function getStrengthColor(
  strength: 'weak' | 'medium' | 'strong' | 'very-strong'
): string {
  const colors = {
    weak: '#ef4444', // red
    medium: '#f97316', // orange
    strong: '#22c55e', // green
    'very-strong': '#16a34a', // dark green
  };
  return colors[strength];
}

/**
 * Quick validation check (boolean only)
 * Useful for inline validation without detailed errors
 *
 * @param password - Password string to check
 * @returns true if password meets all requirements
 */
export function isPasswordValid(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Password requirements for display in forms
 */
export const PASSWORD_REQUIREMENTS = [
  `At least ${PASSWORD_MIN_LENGTH} characters`,
  'One uppercase letter (A-Z)',
  'One lowercase letter (a-z)',
  'One number (0-9)',
];

/**
 * Password help text for form fields
 */
export const PASSWORD_HELP_TEXT = `Minimum ${PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, and numbers`;
