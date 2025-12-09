/**
 * Hook to fetch user's accessible agents
 *
 * Returns agents that the user has hired AND has access to
 * Only shows agents explicitly hired on the Agents page
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../api';
import type { AgentAccessInfo } from '../types/api';

export function useAccessibleAgents() {
  const [accessibleAgents, setAccessibleAgents] = useState<AgentAccessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccessibleAgents = async () => {
      try {
        setLoading(true);
        const agents = await apiClient.getUserAccessibleAgents();

        // Filter to only agents that are:
        // 1. Hired by the user (explicitly selected on Agents page)
        // 2. Enabled globally
        // 3. User can access (has the right plan level)
        const accessible = agents.filter(agent =>
          agent.is_hired && agent.is_enabled && agent.can_access
        );

        setAccessibleAgents(accessible);
      } catch (err) {
        console.error('❌ [useAccessibleAgents] Failed to load agents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    };

    fetchAccessibleAgents();
  }, []);

  return { accessibleAgents, loading, error };
}
