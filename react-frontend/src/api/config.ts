/**
 * API Configuration
 *
 * FastAPI backend configuration for React frontend
 */

export const API_CONFIG = {
  // FastAPI backend URL (running in Docker on port 8000)
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  API_PREFIX: '/api/v1',

  // Get full API URL
  get apiUrl() {
    return `${this.BASE_URL}${this.API_PREFIX}`;
  },

  // Timeout settings
  TIMEOUT: 30000, // 30 seconds

  // Auth token key in localStorage
  TOKEN_KEY: 'fastapi_access_token',
  USER_KEY: 'fastapi_user',
} as const;

export default API_CONFIG;
