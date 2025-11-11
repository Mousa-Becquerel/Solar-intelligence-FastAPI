/**
 * API Module - FastAPI Compatible Version
 * Handles all fetch requests with JWT authentication and FastAPI endpoint mapping
 */

import { FASTAPI_CONFIG } from '../../fastapi-config.js';
import { fastapiAuth } from '../../fastapi-auth.js';

export class API {
    constructor() {
        this.config = FASTAPI_CONFIG;
        this.auth = fastapiAuth;
        this.csrfToken = this.getCSRFToken();

        console.log(`🔧 API initialized with ${this.config.isUsingFastAPI ? 'FastAPI' : 'Flask'} backend`);
    }

    /**
     * Get CSRF token (Flask only)
     */
    getCSRFToken() {
        if (this.config.isUsingFastAPI) return '';

        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) return metaToken.getAttribute('content');

        const inputToken = document.querySelector('input[name="csrf_token"]');
        if (inputToken) return inputToken.value;

        return '';
    }

    /**
     * Build full URL for endpoint
     */
    buildUrl(path) {
        if (this.config.isUsingFastAPI) {
            return this.config.getEndpointUrl(path);
        }
        return path; // Flask uses relative URLs
    }

    /**
     * Generic fetch wrapper with error handling
     */
    async request(url, options = {}) {
        const fullUrl = this.buildUrl(url);

        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        // Add authentication based on backend
        if (this.config.isUsingFastAPI) {
            // FastAPI: Use JWT Bearer token
            Object.assign(defaultHeaders, this.auth.getAuthHeader());
        } else {
            // Flask: Use CSRF token
            if (this.csrfToken) {
                defaultHeaders['X-CSRFToken'] = this.csrfToken;
            }
        }

        const finalOptions = {
            credentials: 'same-origin',
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(fullUrl, finalOptions);

            // Handle 401 Unauthorized
            if (response.status === 401 && this.config.isUsingFastAPI) {
                this.auth.handle401();
                throw new Error('Unauthorized - please login again');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Special handling for query limit (429 status)
                if (response.status === 429) {
                    const limitError = new Error(errorData.error || errorData.detail || 'Query limit reached');
                    limitError.queryLimitData = errorData;
                    throw limitError;
                }

                // FastAPI uses 'detail' field for error messages
                // Handle case where detail is an object (validation errors)
                let errorMsg;
                if (typeof errorData.detail === 'object' && errorData.detail !== null) {
                    errorMsg = JSON.stringify(errorData.detail);
                } else {
                    errorMsg = errorData.error || errorData.detail || errorData.message || `HTTP ${response.status}`;
                }
                console.error('API Error Details:', errorData);
                throw new Error(errorMsg);
            }

            return response;
        } catch (error) {
            console.error(`API Error [${fullUrl}]:`, error);
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(url) {
        const response = await this.request(url, { method: 'GET' });
        return response.json();
    }

    /**
     * POST request
     */
    async post(url, data = {}) {
        const response = await this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    }

    /**
     * PUT request (FastAPI uses PUT instead of PATCH for updates)
     */
    async put(url, data = {}) {
        const response = await this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    }

    /**
     * DELETE request
     */
    async delete(url) {
        const response = await this.request(url, { method: 'DELETE' });
        return response.json();
    }

    /**
     * PATCH request (Flask compatibility)
     */
    async patch(url, data = {}) {
        const response = await this.request(url, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        return response.json();
    }

    // === Authentication Endpoints ===

    /**
     * Login user
     * Flask: returns session cookie
     * FastAPI: returns { access_token, token_type, user }
     */
    async login(username, password) {
        const endpoint = this.config.isUsingFastAPI ? 'auth/login' : 'login';

        if (this.config.isUsingFastAPI) {
            // FastAPI expects form data, not JSON
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await this.request(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            const data = await response.json();

            // Handle FastAPI JWT token
            if (data.access_token) {
                this.auth.handleLoginResponse(data);
            }

            return data;
        } else {
            // Flask uses JSON
            const response = await this.post(endpoint, { username, password });
            return response;
        }
    }

    /**
     * Register new user
     */
    async register(userData) {
        const endpoint = this.config.isUsingFastAPI ? 'auth/register' : 'register';
        const response = await this.post(endpoint, userData);

        // Handle FastAPI JWT token (auto-login after registration)
        if (this.config.isUsingFastAPI && response.access_token) {
            this.auth.handleLoginResponse(response);
        }

        return response;
    }

    /**
     * Logout current user
     */
    async logout() {
        if (this.config.isUsingFastAPI) {
            // FastAPI: Just clear local token
            this.auth.clearAuth();
            return { success: true };
        } else {
            // Flask: Call logout endpoint
            return this.post('/auth/logout');
        }
    }

    // === Conversation Endpoints ===

    /**
     * Get all conversations for current user
     */
    async getConversations() {
        return this.get('conversations/');
    }

    /**
     * Get specific conversation with messages
     */
    async getConversation(conversationId) {
        const endpoint = this.config.isUsingFastAPI
            ? `conversations/${conversationId}`
            : `conversations/${conversationId}`;
        return this.get(endpoint);
    }

    /**
     * Delete a conversation
     */
    async deleteConversation(conversationId) {
        return this.delete(`conversations/${conversationId}`);
    }

    /**
     * Create new conversation
     */
    async createConversation(agentType = 'market') {
        const endpoint = this.config.isUsingFastAPI
            ? `conversations/fresh/create-or-get?agent_type=${agentType}`
            : 'conversations/fresh';
        return this.get(endpoint); // FastAPI uses GET for fresh conversation
    }

    // === Chat Endpoints ===

    /**
     * Send message and get streaming response
     * Returns fetch Response object for SSE streaming
     */
    async sendChatMessage(conversationId, message, agentType) {
        const endpoint = this.config.isUsingFastAPI
            ? 'chat/send'
            : 'chat';

        const payload = {
            message: message,
            conversation_id: conversationId,
            agent_type: agentType
        };

        console.log('Sending chat message:', payload);

        const response = await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        return response;
    }

    /**
     * Send approval response
     */
    async sendApprovalResponse(approved, conversationId, context) {
        const endpoint = this.config.isUsingFastAPI
            ? 'chat/approval-response'  // Need to add this endpoint in FastAPI
            : 'api/approval_response';

        return this.post(endpoint, {
            approved,
            conversation_id: conversationId,
            context
        });
    }

    // === User Endpoints ===

    /**
     * Get current user info
     */
    async getCurrentUser() {
        const endpoint = this.config.isUsingFastAPI
            ? 'auth/me'
            : 'auth/current-user';
        return this.get(endpoint);
    }

    // === Export Endpoints ===

    /**
     * Download selected messages
     */
    async downloadMessages(messages, format = 'docx') {
        const response = await this.request('/export-messages', {
            method: 'POST',
            body: JSON.stringify({ messages, format })
        });
        return response.blob();
    }

    /**
     * Generate PowerPoint presentation
     */
    async generatePPT(messages) {
        const response = await this.request('/generate-ppt', {
            method: 'POST',
            body: JSON.stringify({ messages })
        });
        return response.blob();
    }

    // === Survey Endpoints ===

    /**
     * Submit user survey
     */
    async submitSurvey(surveyData) {
        return this.post('/submit-user-survey', surveyData);
    }

    /**
     * Submit stage 2 survey
     */
    async submitSurveyStage2(surveyData) {
        return this.post('/submit-user-survey-stage2', surveyData);
    }

    // === News Endpoints ===

    /**
     * Get random news item
     */
    async getRandomNews() {
        return this.get('/random-news');
    }
}

// Create singleton instance
export const api = new API();

// Log API configuration
console.log('✅ API Module loaded:', {
    backend: api.config.isUsingFastAPI ? 'FastAPI' : 'Flask',
    baseUrl: api.config.baseUrl,
    authenticated: api.auth.isAuthenticated()
});
