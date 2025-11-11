/**
 * Hook to fetch user's accessible agents
 *
 * Returns agents that the user has hired/has access to
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
        console.log('📊 [useAccessibleAgents] Received agents from API:', agents);

        // Filter to only agents with access
        const accessible = agents.filter(agent => agent.can_access && agent.is_enabled);
        console.log('✅ [useAccessibleAgents] Filtered accessible agents:', accessible);

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
