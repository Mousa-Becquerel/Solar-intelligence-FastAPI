/**
 * FastAPI Backend Configuration
 *
 * Configuration for connecting frontend to FastAPI backend.
 * Toggle USE_FASTAPI to switch between Flask and FastAPI.
 */

export const FASTAPI_CONFIG = {
    // Toggle this to switch between Flask and FastAPI
    USE_FASTAPI: false,

    // FastAPI backend URL
    FASTAPI_BASE_URL: 'http://localhost:8000',
    FASTAPI_API_PREFIX: '/api/v1',

    // Flask backend URL (fallback)
    FLASK_BASE_URL: '',  // Empty string for relative URLs

    // Get the active base URL based on configuration
    get baseUrl() {
        return this.USE_FASTAPI
            ? `${this.FASTAPI_BASE_URL}${this.FASTAPI_API_PREFIX}`
            : this.FLASK_BASE_URL;
    },

    // Get full URL for an endpoint
    getEndpointUrl(path) {
        // Remove leading slash if present to avoid double slashes
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;

        if (this.USE_FASTAPI) {
            return `${this.FASTAPI_BASE_URL}${this.FASTAPI_API_PREFIX}/${cleanPath}`;
        } else {
            return `/${cleanPath}`;
        }
    },

    // Check if FastAPI is enabled
    get isUsingFastAPI() {
        return this.USE_FASTAPI;
    }
};

// Log configuration on load
console.log('🔧 API Configuration:', {
    backend: FASTAPI_CONFIG.isUsingFastAPI ? 'FastAPI' : 'Flask',
    baseUrl: FASTAPI_CONFIG.baseUrl
});
