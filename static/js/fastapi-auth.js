/**
 * FastAPI Authentication Adapter
 *
 * Handles JWT token-based authentication for FastAPI backend.
 * Provides localStorage management for access tokens.
 */

export class FastAPIAuth {
    constructor() {
        this.tokenKey = 'fastapi_access_token';
        this.userKey = 'fastapi_user_data';
    }

    /**
     * Store JWT access token
     */
    setToken(token) {
        if (token) {
            localStorage.setItem(this.tokenKey, token);
            console.log('✅ JWT token stored');
        }
    }

    /**
     * Get JWT access token
     */
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    /**
     * Check if user is authenticated (has valid token)
     */
    isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * Clear authentication data (logout)
     */
    clearAuth() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        console.log('🚪 Authentication cleared');
    }

    /**
     * Store user data
     */
    setUser(userData) {
        if (userData) {
            localStorage.setItem(this.userKey, JSON.stringify(userData));
        }
    }

    /**
     * Get stored user data
     */
    getUser() {
        const data = localStorage.getItem(this.userKey);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Get Authorization header for API requests
     */
    getAuthHeader() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * Handle login response from FastAPI
     * FastAPI returns: { access_token: "...", token_type: "bearer", user: {...} }
     */
    handleLoginResponse(response) {
        if (response.access_token) {
            this.setToken(response.access_token);

            if (response.user) {
                this.setUser(response.user);
            }

            console.log('✅ Login successful - JWT token saved');
            return true;
        }

        console.error('❌ Login response missing access_token');
        return false;
    }

    /**
     * Parse JWT token (decode payload without verification - for UI purposes only)
     * WARNING: Never trust this data for security decisions on client side
     */
    parseToken(token = null) {
        const tokenToParse = token || this.getToken();
        if (!tokenToParse) return null;

        try {
            const base64Url = tokenToParse.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join(''));

            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Failed to parse JWT token:', error);
            return null;
        }
    }

    /**
     * Check if token is expired (client-side check only)
     */
    isTokenExpired() {
        const payload = this.parseToken();
        if (!payload || !payload.exp) return true;

        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    }

    /**
     * Handle 401 Unauthorized - redirect to login
     */
    handle401() {
        console.warn('🔒 Unauthorized - redirecting to login');
        this.clearAuth();
        window.location.href = '/login';
    }
}

// Create singleton instance
export const fastapiAuth = new FastAPIAuth();

// Auto-check token on page load
if (fastapiAuth.isAuthenticated() && fastapiAuth.isTokenExpired()) {
    console.warn('⚠️ JWT token expired - clearing auth');
    fastapiAuth.clearAuth();
}
