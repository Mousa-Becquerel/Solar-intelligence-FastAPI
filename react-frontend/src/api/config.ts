/**
 * API Configuration
 *
 * FastAPI backend configuration for React frontend
 */

export const API_CONFIG = {
  // FastAPI backend URL - empty string uses current domain (nginx proxies /api to backend)
  // In production: '' -> nginx proxies /api/v1 to backend:8000
  // In development: 'http://localhost:8000' for direct backend access
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
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
