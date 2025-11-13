/**
 * Admin Form Schemas
 *
 * Zod validation schemas for admin-related forms
 * Includes user creation and management forms
 */

import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '../utils/passwordValidation';

/**
 * Password schema for admin-created users
 * Same requirements as self-registration
 */
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Admin Create User Form Schema
 */
export const createUserSchema = z
  .object({
    username: z
      .string()
      .min(1, 'Username is required')
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters'),

    full_name: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must not exceed 100 characters'),

    password: passwordSchema,

    confirm_password: z.string().min(1, 'Please confirm the password'),

    role: z.enum(['admin', 'analyst', 'researcher', 'demo'], {
      errorMap: () => ({ message: 'Please select a valid role' }),
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type CreateUserFormData = z.infer<typeof createUserSchema>;

/**
 * Profile Edit Form Schema
 */
export const profileEditSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),
});

export type ProfileEditFormData = z.infer<typeof profileEditSchema>;
