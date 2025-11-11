/**
 * Auth Service
 * Provides authentication-related functionality for password reset flows
 */

import { apiClient } from '../api';

class AuthService {
  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    // Call the backend forgot password endpoint
    await apiClient.request<{ message: string }>('auth/forgot-password', {
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
