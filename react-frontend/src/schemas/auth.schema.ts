/**
 * Authentication Form Schemas
 *
 * Zod validation schemas for all authentication-related forms
 * Ensures consistent validation rules across login, registration, and password reset
 */

import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '../utils/passwordValidation';

/**
 * Custom password refinement using our existing password validation utility
 * This ensures consistency with the password strength indicator
 */
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Email validation schema
 * More permissive than strict RFC 5322 but catches common errors
 */
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .toLowerCase();

/**
 * Login Form Schema
 */
export const loginSchema = z.object({
  username: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration Form Schema
 * Matches the actual RegisterPage form fields
 */
export const registerSchema = z
  .object({
    first_name: z
      .string()
      .min(1, 'First name is required')
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must not exceed 50 characters'),

    last_name: z
      .string()
      .min(1, 'Last name is required')
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must not exceed 50 characters'),

    email: emailSchema,

    company_name: z
      .string()
      .min(1, 'Company name is required')
      .min(2, 'Company name must be at least 2 characters')
      .max(100, 'Company name must not exceed 100 characters'),

    job_title: z
      .string()
      .min(1, 'Job title is required')
      .min(2, 'Job title must be at least 2 characters')
      .max(100, 'Job title must not exceed 100 characters'),

    country: z
      .string()
      .min(1, 'Country is required'),

    company_size: z
      .string()
      .min(1, 'Company size is required'),

    password: passwordSchema,

    confirmPassword: z.string().min(1, 'Please confirm your password'),

    communications: z.boolean().optional().default(false),

    terms_agreement: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and privacy policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Forgot Password Form Schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset Password Form Schema
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Change Password Form Schema (for ProfilePage)
 */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: passwordSchema,
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
