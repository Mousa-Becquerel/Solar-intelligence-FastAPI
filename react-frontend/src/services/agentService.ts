/**
 * Agent Service
 *
 * API functions for managing agent hiring and access
 * Uses FastAPI backend endpoints with JWT Bearer token authentication
 */

import type { AgentType } from '../constants/agents';
import API_CONFIG from '../api/config';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = API_CONFIG.TOKEN_KEY; // Use same token key as API client

export interface HireAgentResponse {
  message: string;
}

export interface HiredAgent {
  id: number;
  user_id: number;
  agent_type: string;
  hired_at: string;
  is_active: boolean;
}

/**
 * Get authentication headers with Bearer token
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Hire an agent
 */
export async function hireAgent(agentType: AgentType): Promise<HireAgentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-management/hire`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ agent_type: agentType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to hire agent');
  }

  return response.json();
}

/**
 * Unhire an agent (release)
 */
export async function unhireAgent(agentType: AgentType): Promise<HireAgentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-management/release`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ agent_type: agentType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to unhire agent');
  }

  return response.json();
}

/**
 * Get list of hired agents for current user
 */
export async function getHiredAgents(): Promise<HiredAgent[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-management/hired`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch hired agents');
  }

  return response.json();
}
