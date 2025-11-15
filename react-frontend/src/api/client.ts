/**
 * API Client
 *
 * TypeScript API client for FastAPI backend
 * Migrated from static/js/modules/core/api.js
 */

import API_CONFIG from './config';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  Conversation,
  CreateConversationResponse,
  ChatRequest,
  Message,
  Agent,
  AgentAccessInfo,
  APIError,
} from '../types/api';
import type {
  User as AdminUser,
  PendingUser,
  CreateUserRequest,
  UpdateUserRequest,
} from '../types/admin';
import type {
  UserSurveyData,
  UserSurveyStage2Data,
  SurveyStatus,
  SurveySubmitResponse,
} from '../types/survey';

class APIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.apiUrl;
    console.log(`🔧 API Client initialized with FastAPI backend: ${this.baseUrl}`);
  }

  // ========================================
  // Authentication Helpers
  // ========================================

  private getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private getToken(): string | null {
    return localStorage.getItem(API_CONFIG.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, token);
  }

  private clearToken(): void {
    localStorage.removeItem(API_CONFIG.TOKEN_KEY);
    localStorage.removeItem(API_CONFIG.USER_KEY);
  }

  private setUser(user: User): void {
    localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(user));
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(API_CONFIG.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // ========================================
  // HTTP Request Helper
  // ========================================

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        console.warn('⚠️ Unauthorized - clearing auth token');
        this.clearToken();
        throw new Error('Unauthorized - please login again');
      }

      // Handle non-OK responses
      if (!response.ok) {
        const errorData: APIError = await response.json();

        // Handle validation errors
        let errorMsg: string;
        if (typeof errorData.detail === 'object' && Array.isArray(errorData.detail)) {
          errorMsg = errorData.detail.map(err => err.msg).join(', ');
        } else if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail;
        } else {
          errorMsg = `HTTP ${response.status}`;
        }

        console.error('API Error Details:', errorData);
        throw new Error(errorMsg);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error - please check your connection');
    }
  }

  // ========================================
  // Authentication Endpoints
  // ========================================

  async login(username: string, password: string): Promise<LoginResponse> {
    // FastAPI uses OAuth2PasswordRequestForm which requires form data
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const url = `${this.baseUrl}/auth/login`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();

    // Store token - note: OAuth2 returns token but not user info
    if (data.access_token) {
      this.setToken(data.access_token);

      // Fetch user info after login
      const user = await this.getCurrentUser();
      this.setUser(user);
      console.log('✅ Login successful, token stored');
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type,
      user: this.getUser()!,
    };
  }

  async register(
    registerData: RegisterRequest
  ): Promise<User> {
    const response = await this.request<User>('auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData),
    });

    // After registration, log the user in automatically
    const loginResponse = await this.login(registerData.email, registerData.password);

    return response;
  }

  logout(): void {
    this.clearToken();
    console.log('✅ Logged out, token cleared');
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('auth/me');
  }

  // ========================================
  // Conversation Endpoints
  // ========================================

  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('conversations');
  }

  async getConversation(conversationId: number): Promise<Conversation> {
    return this.request<Conversation>(`conversations/${conversationId}`);
  }

  async createConversation(agentType: string): Promise<{ conversation_id: number }> {
    return this.request<{ conversation_id: number }>(
      `conversations/fresh/create-or-get?agent_type=${agentType}`,
      {
        method: 'GET',
      }
    );
  }

  async deleteConversation(conversationId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    // Get raw messages from backend
    const rawMessages = await this.request<any[]>(`conversations/${conversationId}/messages`);

    // Transform backend format to frontend format
    return rawMessages.map(msg => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      // Use 'sender' field directly from database
      // Database stores: 'user' | 'bot'
      sender: msg.sender,
      // Parse content if it's JSON string, otherwise use as-is
      content: this.parseMessageContent(msg.content),
      agent_type: msg.agent_type,  // Include agent_type for multi-agent conversations
      timestamp: msg.timestamp,
    }));
  }

  // Helper to parse message content (may be JSON string or plain text)
  private parseMessageContent(content: string): string {
    // If content is empty or null, return placeholder
    if (!content) {
      console.warn('⚠️ Empty message content received');
      return '[Empty message - no content]';
    }

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);

      console.log('📝 Parsed message content:', parsed);

      // If it's an object with a 'value' field, extract that
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.value !== undefined && parsed.value !== null) {
          console.log('✅ Extracting value field:', parsed.value);
          return String(parsed.value);
        }

        // If it has a 'content' field instead
        if (parsed.content !== undefined && parsed.content !== null) {
          console.log('✅ Extracting content field:', parsed.content);
          return String(parsed.content);
        }

        // If it's an object without value/content, show it as formatted JSON for debugging
        console.warn('⚠️ Message object without value/content field:', parsed);
        return '```json\n' + JSON.stringify(parsed, null, 2) + '\n```';
      }

      // If it's already a string, return it
      if (typeof parsed === 'string') {
        console.log('✅ Content is already a string');
        return parsed;
      }

      // Otherwise return original content
      console.warn('⚠️ Unexpected parsed type:', typeof parsed, parsed);
      return content;
    } catch (error) {
      // Not JSON, return as-is
      console.log('✅ Content is not JSON, using as plain text');
      return content;
    }
  }

  // ========================================
  // Chat Endpoints
  // ========================================

  async sendChatMessage(
    conversationId: number,
    message: string,
    agentType: string
  ): Promise<Response> {
    const url = `${this.baseUrl}/chat/send`;

    const payload = {
      conversation_id: conversationId,
      message,
      agent_type: agentType,
    };

    console.log('Sending chat message:', payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    // Don't try to parse JSON for streaming responses
    // Just return the Response and let caller handle it
    return response;
  }

  // ========================================
  // Agent Endpoints
  // ========================================

  async getAgents(): Promise<Agent[]> {
    return this.request<Agent[]>('chat/agents');
  }

  async getUserAccessibleAgents(): Promise<AgentAccessInfo[]> {
    return this.request<AgentAccessInfo[]>('agent-access/my-agents');
  }

  // ========================================
  // Waitlist Endpoints
  // ========================================

  async joinWaitlist(email: string, agents: string[]): Promise<{ message: string }> {
    return this.request<{ message: string }>('waitlist/join', {
      method: 'POST',
      body: JSON.stringify({ email, agents }),
    });
  }

  // ========================================
  // Admin Endpoints
  // ========================================

  async getUsers(): Promise<AdminUser[]> {
    return this.request<AdminUser[]>('admin/users');
  }

  async getPendingUsers(): Promise<PendingUser[]> {
    return this.request<PendingUser[]>('admin/users/pending');
  }

  async createUser(userData: CreateUserRequest): Promise<AdminUser> {
    return this.request('admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: number, userData: UpdateUserRequest): Promise<{ message: string }> {
    return this.request(`admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async toggleUserStatus(userId: number): Promise<{ success: boolean; new_status: boolean; message: string }> {
    return this.request(`admin/users/${userId}/toggle-status`, {
      method: 'POST',
    });
  }

  async deleteUser(userId: number): Promise<{ message: string }> {
    return this.request(`admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async approveUser(userId: number): Promise<{ message: string }> {
    return this.request(`admin/users/${userId}/approve`, {
      method: 'POST',
    });
  }

  // ========================================
  // Account Deletion Endpoints
  // ========================================

  async requestAccountDeletion(reason?: string): Promise<{ message: string }> {
    return this.request('auth/request-deletion', {
      method: 'POST',
      body: JSON.stringify({ reason: reason || null }),
    });
  }

  async cancelAccountDeletion(): Promise<{ message: string }> {
    return this.request('auth/cancel-deletion', {
      method: 'POST',
    });
  }

  // ========================================
  // Survey Endpoints
  // ========================================

  async submitUserSurvey(surveyData: UserSurveyData): Promise<SurveySubmitResponse> {
    return this.request('survey/submit-user-survey', {
      method: 'POST',
      body: JSON.stringify(surveyData),
    });
  }

  async submitUserSurveyStage2(surveyData: UserSurveyStage2Data): Promise<SurveySubmitResponse> {
    return this.request('survey/submit-user-survey-stage2', {
      method: 'POST',
      body: JSON.stringify(surveyData),
    });
  }

  async checkSurveyStatus(): Promise<SurveyStatus> {
    return this.request('survey/check-survey-status', {
      method: 'GET',
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;
