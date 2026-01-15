/**
 * Admin Types
 * Type definitions for admin functionality
 */

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'analyst' | 'researcher' | 'demo';
  is_active: boolean;
  created_at: string;
}

export interface PendingUser extends User {
  // Same structure as User
}

export interface CreateUserRequest {
  username: string;
  full_name: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  role?: string;
  password?: string;
}

export interface AgentWhitelistEntry {
  id: number;
  agent_type: string;
  is_active: boolean;
  unlimited_queries: boolean;
  granted_at: string | null;
  expires_at: string | null;
  reason: string | null;
}
