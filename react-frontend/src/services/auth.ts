/**
 * Auth Service
 * Provides authentication-related functionality for email verification and password reset flows
 */

import { apiClient } from '../api';

class AuthService {
  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await apiClient.request<{ message: string }>('auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    return response;
  }

  /**
   * Resend verification email (authenticated - requires login)
   */
  async resendVerification(): Promise<{ message: string }> {
    const response = await apiClient.request<{ message: string }>('auth/send-verification', {
      method: 'POST',
    });
    return response;
  }

  /**
   * Resend verification email (public - no login required)
   * Use this when the user hasn't verified their email yet and can't login
   */
  async resendVerificationPublic(email: string): Promise<{ message: string }> {
    const response = await apiClient.request<{ message: string }>('auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response;
  }

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    // Call the backend forgot password endpoint
    await apiClient.request<{ message: string }>('auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Call the backend reset password endpoint
    await apiClient.request<{ message: string }>('auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
