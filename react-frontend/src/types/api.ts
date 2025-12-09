/**
 * API Type Definitions
 *
 * TypeScript types for FastAPI backend responses
 */

// ========================================
// Authentication Types
// ========================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  job_title: string;
  company_name: string;
  country: string;
  company_size: string;
  terms_agreement: boolean;
  communications?: boolean;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: string | null;
  is_active: boolean;
  plan_type: string;
  created_at: string;
  query_count: number;
  monthly_query_count: number;
}

// ========================================
// Conversation Types
// ========================================

export interface Conversation {
  id: number;
  user_id: number;
  agent_type: string;
  title: string | null;
  preview: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  message_count: number;
}

export interface CreateConversationResponse {
  conversation_id: number;
  agent_type: string;
  created_at: string;
}

// ========================================
// Message Types
// ========================================

export interface PlotData {
  plot_type: string;
  title: string;
  x_axis_label?: string;
  y_axis_label?: string;
  unit?: string;
  data: any[];
  series_info?: Record<string, any>;
  description?: string;
}

export interface ApprovalData {
  conversationId: number;
  context: string;
  question: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: 'user' | 'bot';  // Database field: sender (not role)
  content: string;
  agent_type?: string;  // Which agent sent this message (for bot messages)
  timestamp: string;
  metadata?: Record<string, any>;
  plotData?: PlotData; // Optional plot data for chart messages
  approvalData?: ApprovalData; // Optional approval request data
}

export interface ChatRequest {
  conversation_id: number;
  message: string;
  agent_type: string;
  stream?: boolean;
}

export interface ChatStreamChunk {
  content?: string;
  done?: boolean;
  metadata?: Record<string, any>;
}

// ========================================
// Agent Types
// ========================================

export interface Agent {
  agent_type: string;
  required_plan: string;
  is_enabled: boolean;
  description: string;
}

export interface AgentAccessInfo {
  agent_type: string;
  description: string;
  required_plan: string;
  is_enabled: boolean;
  can_access: boolean;
  access_reason: string | null;
  is_whitelisted: boolean;
  is_grandfathered: boolean;
  is_hired: boolean;
}

// ========================================
// Error Types
// ========================================

export interface APIError {
  detail: string | ValidationError[];
  status?: number;
}

export interface ValidationError {
  loc: string[];
  msg: string;
  type: string;
}

// ========================================
// Utility Types
// ========================================

export type AgentType = 'market' | 'news' | 'digitalization' | 'nzia_policy' | 'manufacturer_financial' | 'nzia_market_impact' | 'weaviate';

export type PlanType = 'free' | 'analyst' | 'strategist' | 'enterprise' | 'admin' | 'premium' | 'max';

export type MessageSender = 'user' | 'bot';
