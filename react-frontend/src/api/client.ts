/**
 * API Client
 *
 * TypeScript API client for FastAPI backend
 * Migrated from static/js/modules/core/api.js
 */

import API_CONFIG from './config';
import type {
  LoginResponse,
  RegisterRequest,
  User,
  Conversation,
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
import type {
  AnalyticsOverview,
  UsageOverTime,
  AgentUsageStats,
  RecentQuery,
  RecentQueriesResponse,
  UserEngagement,
  HourlyDistribution,
  FullAnalyticsReport,
  SurveyAnalytics,
} from '../types/analytics';

class APIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.apiUrl;
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
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type,
      user: this.getUser()!,
    };
  }

  async register(
    registerData: RegisterRequest
  ): Promise<{ message: string }> {
    // Registration now returns a message about email verification
    // User must verify email before they can login
    const response = await this.request<{ message: string }>('auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData),
    });

    // Do NOT auto-login - email verification required
    return response;
  }

  logout(): void {
    this.clearToken();
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
    const rawMessages = await this.request<Record<string, unknown>[]>(`conversations/${conversationId}/messages`);

    // Transform backend format to frontend format
    return rawMessages.map(msg => {
      const parsedMessage = this.parseMessageWithPlotData(msg.content as string);

      return {
        id: msg.id as number,
        conversation_id: msg.conversation_id as number,
        // Use 'sender' field directly from database
        // Database stores: 'user' | 'bot'
        sender: msg.sender as 'user' | 'bot',
        // Parse content if it's JSON string, otherwise use as-is
        content: parsedMessage.content,
        agent_type: msg.agent_type as string | undefined,  // Include agent_type for multi-agent conversations
        timestamp: msg.timestamp as string,
        plotData: parsedMessage.plotData,  // Include plot data if present
        metadata: parsedMessage.metadata,  // Include file metadata if present
      } as Message;
    });
  }

  // Get BIPV generated images for a conversation
  async getBIPVImages(conversationId: number): Promise<Array<{
    id: number;
    message_id: number;
    conversation_id: number;
    image_data: string;
    mime_type: string;
    title: string | null;
    prompt: string | null;
    created_at: string;
  }>> {
    return this.request(`conversations/${conversationId}/bipv-images`);
  }

  // Helper to parse message with plot data and file metadata support
  private parseMessageWithPlotData(content: string): { content: string; plotData?: any; metadata?: Record<string, any> } {
    // If content is empty or null, return placeholder
    if (!content) {
      console.warn('⚠️ Empty message content received');
      return { content: '[Empty message - no content]' };
    }

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);


      // If it's an object with a 'type' field
      if (typeof parsed === 'object' && parsed !== null) {
        // Extract file metadata if present (for file upload messages)
        let metadata: Record<string, any> | undefined;
        if (parsed.file_name) {
          metadata = {
            file_name: parsed.file_name,
            file_size: parsed.file_size || 0,
          };
        }

        // Handle plot messages: { type: "plot", value: { ...plot data... } }
        if (parsed.type === 'plot' && parsed.value) {
          return {
            content: parsed.value.title || 'Plot', // Use plot title as content
            plotData: parsed.value, // Store the full plot data
            metadata,
          };
        }

        // Handle regular messages: { type: "string", value: "...", comment: null }
        if (parsed.type === 'string' && parsed.value !== undefined && parsed.value !== null) {
          return { content: String(parsed.value), metadata };
        }

        // Legacy: If it has a 'value' field without type
        if (parsed.value !== undefined && parsed.value !== null) {
          return { content: String(parsed.value), metadata };
        }

        // If it has a 'content' field instead
        if (parsed.content !== undefined && parsed.content !== null) {
          return { content: String(parsed.content), metadata };
        }

        // If it's an object without recognized fields, show it as formatted JSON for debugging
        console.warn('⚠️ Message object without recognized fields:', parsed);
        return { content: '```json\n' + JSON.stringify(parsed, null, 2) + '\n```', metadata };
      }

      // If it's already a string, return it
      if (typeof parsed === 'string') {
        return { content: parsed };
      }

      // Otherwise return original content
      console.warn('⚠️ Unexpected parsed type:', typeof parsed, parsed);
      return { content: content };
    } catch (_error) {
      // Not JSON, return as-is
      return { content: content };
    }
  }

  // Helper to parse message content (may be JSON string or plain text)
  // Deprecated: Use parseMessageWithPlotData instead
  private parseMessageContent(content: string): string {
    return this.parseMessageWithPlotData(content).content;
  }

  // ========================================
  // Chat Endpoints
  // ========================================

  async sendChatMessage(
    conversationId: number,
    message: string,
    agentType: string,
    signal?: AbortSignal,
    file?: File
  ): Promise<Response> {
    // Use different endpoint for file uploads
    const url = file
      ? `${this.baseUrl}/chat/send-with-file`
      : `${this.baseUrl}/chat/send`;

    let body: FormData | string;
    let headers: Record<string, string>;

    if (file) {
      // Use FormData for file uploads
      const formData = new FormData();
      formData.append('conversation_id', conversationId.toString());
      formData.append('message', message || ' '); // Ensure message is not empty
      formData.append('agent_type', agentType);
      formData.append('file', file);

      body = formData;
      // Don't set Content-Type for FormData - browser will set it with boundary
      headers = this.getAuthHeader();
    } else {
      // Use JSON for text-only messages
      const payload = {
        conversation_id: conversationId,
        message,
        agent_type: agentType,
      };
      body = JSON.stringify(payload);
      headers = {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal, // Add abort signal support
    });

    // Don't try to parse JSON for streaming responses
    // Just return the Response and let caller handle it
    return response;
  }

  /**
   * Send chat message with image attachments
   * Specifically for BIPV Design agent
   */
  async sendChatMessageWithImages(
    conversationId: number,
    message: string,
    agentType: string,
    signal?: AbortSignal,
    images?: File[]
  ): Promise<Response> {
    const url = `${this.baseUrl}/chat/send-with-images`;

    const formData = new FormData();
    formData.append('conversation_id', conversationId.toString());
    formData.append('message', message || ' '); // Ensure message is not empty
    formData.append('agent_type', agentType);

    // Append images if provided
    if (images && images.length > 0) {
      images.forEach((image) => {
        formData.append('images', image);
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: formData,
      signal,
    });

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

  async checkTrialStatus(): Promise<{
    is_trial_exhausted: boolean;
    agents_unhired: boolean;
    redirect_to_agents: boolean;
    message: string | null;
  }> {
    return this.request('agent-access/trial-status');
  }

  // ========================================
  // Waitlist Endpoints
  // ========================================

  async joinWaitlist(email: string, agents: string[]): Promise<{ message: string }> {
    return this.request<{ message: string }>('auth/waitlist/join', {
      method: 'POST',
      body: JSON.stringify({
        email,
        interested_agents: agents.join(',')
      }),
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

  // ========================================
  // Profile Endpoints
  // ========================================

  async getProfile(): Promise<{
    user: {
      username: string;
      full_name: string;
      role: string;
      created_at: string;
      plan_type: string;
      query_count: number;
      monthly_query_count: number;
    };
    plan_info: {
      type: string;
      status: string;
      end_date: string | null;
    };
    usage_stats: {
      monthly_queries: number;
      query_limit: string;
      queries_remaining: string;
      total_queries: number;
      total_conversations: number;
      total_messages: number;
      account_age_days: number;
      last_query_date: string | null;
    };
    contact_requests: Array<{
      id: number;
      name: string;
      email: string;
      company: string | null;
      message: string;
      source: string;
      status: string;
      created_at: string;
    }>;
  }> {
    return this.request('profile', {
      method: 'GET',
    });
  }

  // ========================================
  // Analytics Endpoints (Admin)
  // ========================================

  async getAnalyticsOverview(): Promise<{ status: string; data: AnalyticsOverview }> {
    return this.request('admin/analytics/overview', {
      method: 'GET',
    });
  }

  async getAnalyticsUsageOverTime(days: number = 30): Promise<{ status: string; data: UsageOverTime }> {
    return this.request(`admin/analytics/usage-over-time?days=${days}`, {
      method: 'GET',
    });
  }

  async getAnalyticsAgentUsage(days: number = 30): Promise<{ status: string; data: AgentUsageStats }> {
    return this.request(`admin/analytics/agent-usage?days=${days}`, {
      method: 'GET',
    });
  }

  async getAnalyticsRecentQueries(
    limit: number = 20,
    offset: number = 0,
    agent?: string,
    search?: string,
    days?: number
  ): Promise<{ status: string; data: RecentQueriesResponse }> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (agent && agent !== 'all') params.append('agent', agent);
    if (search) params.append('search', search);
    if (days) params.append('days', days.toString());

    return this.request(`admin/analytics/recent-queries?${params.toString()}`, {
      method: 'GET',
    });
  }

  async getAnalyticsUserEngagement(days: number = 30): Promise<{ status: string; data: UserEngagement }> {
    return this.request(`admin/analytics/user-engagement?days=${days}`, {
      method: 'GET',
    });
  }

  async getAnalyticsHourlyDistribution(days: number = 30): Promise<{ status: string; data: HourlyDistribution }> {
    return this.request(`admin/analytics/hourly-distribution?days=${days}`, {
      method: 'GET',
    });
  }

  async getAnalyticsFullReport(days: number = 30): Promise<{ status: string; data: FullAnalyticsReport }> {
    return this.request(`admin/analytics/full-report?days=${days}`, {
      method: 'GET',
    });
  }

  async getAnalyticsSurveys(): Promise<{ status: string; data: SurveyAnalytics }> {
    return this.request('admin/analytics/surveys', {
      method: 'GET',
    });
  }

  async exportQueriesCSV(days: number = 30, agent?: string): Promise<void> {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    if (agent && agent !== 'all') params.append('agent', agent);

    const url = `${this.baseUrl}/admin/analytics/export-queries-csv?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to export CSV');
    }

    // Get the filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'user_queries_export.csv';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match) filename = match[1];
    }

    // Download the file
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // ========================================
  // Dashboard Endpoints
  // ========================================

  async getDashboardData(conversationId: number): Promise<{
    success: boolean;
    dashboard_data: {
      optimized_design: {
        pv_size: number;
        wind_size: number;
        battery_size: number;
        self_consumption_ratio: number;
        self_sufficiency_ratio: number;
        npv: number;
        pv_self_consumption: number;
        wind_self_consumption: number;
        pv_export: number;
        wind_export: number;
      };
      cash_flows: Array<{
        year: number;
        grid_savings: number;
        feed_in_revenue: number;
        operational_costs: number;
        battery_replacement: number;
        cash_flow: number;
        cumulative_npv: number;
      }>;
      daily_profile_june: Array<{
        hour: number;
        pvGeneration: number;
        windGeneration: number;
        demand: number;
        batteryCharge: number;
        gridTariff: number;
      }>;
      daily_profile_december: Array<{
        hour: number;
        pvGeneration: number;
        windGeneration: number;
        demand: number;
        batteryCharge: number;
        gridTariff: number;
      }>;
      export_tariff_sample: Array<{
        hour: number;
        tariff: number;
      }>;
      strategy: string;
    };
    message_id: number;
    timestamp: string | null;
  }> {
    return this.request(`chat/dashboard/${conversationId}`, {
      method: 'GET',
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;
