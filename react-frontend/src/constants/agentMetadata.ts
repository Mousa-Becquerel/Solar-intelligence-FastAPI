/**
 * Agent Metadata for Agents Page
 *
 * Contains detailed information about each agent including:
 * - Name and role
 * - Color scheme for cards
 * - Badges/capabilities
 * - Description
 * - Icons
 */

import type { AgentType } from './agents';

export interface AgentMetadata {
  name: string;
  role: string;
  provider: string; // Provider name (e.g., "Bequerel Institute")
  color: 'navy' | 'gold' | 'navy-light' | 'gold-dark' | 'purple' | 'emerald' | 'indigo' | 'teal';
  initial: string;
  badges: Array<'datahub' | 'charts' | 'news' | 'ai' | 'code'>;
  description: string;
  capabilities?: string[]; // List of agent capabilities
  premium?: boolean;
  icon: string; // SVG path data
}

export const AGENT_METADATA: Record<AgentType, AgentMetadata> = {
  market: {
    name: 'Alex',
    role: 'PV Capacity',
    provider: 'Bequerel Institute',
    color: 'gold-dark',
    initial: 'A',
    badges: ['datahub', 'charts', 'code'],
    description: 'Analyzes photovoltaic capacity data, market trends, and installation forecasts across global markets with advanced data visualization capabilities.',
    capabilities: [
      'Market trend analysis',
      'Regional comparisons',
      'Forecast generation',
      'Supply chain insights',
    ],
    icon: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
  },
  news: {
    name: 'Emma',
    role: 'News Analyst',
    provider: 'Bequerel Institute',
    color: 'navy-light',
    initial: 'E',
    badges: ['news', 'ai'],
    description: 'Tracks and analyzes the latest developments in the solar industry, providing insights on market shifts, technological breakthroughs, and policy changes.',
    capabilities: [
      'Latest industry news',
      'Company announcements',
      'Policy updates',
      'Market reports',
    ],
    icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  },
  digitalization: {
    name: 'Nova',
    role: 'Digitalization Expert',
    provider: 'Bequerel Institute',
    color: 'navy',
    initial: 'N',
    badges: ['ai', 'code'],
    description: 'Specializes in digital transformation of solar operations, including AI applications, cloud monitoring, automation, and emerging technologies like digital twins.',
    capabilities: [
      'Digital transformation insights',
      'Automation trends',
      'AI/ML applications',
      'Smart grid technology',
    ],
    icon: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  },
  nzia_policy: {
    name: 'Aniza',
    role: 'NZIA Policy Expert',
    provider: 'Bequerel Institute',
    color: 'purple',
    initial: 'A',
    badges: ['ai'],
    description: 'Expert on the Net-Zero Industry Act (NZIA) auction mechanisms, compliance requirements, and regulatory frameworks for photovoltaic projects.',
    capabilities: [
      'FERX framework analysis',
      'NZIA compliance guidance',
      'Italian PV auction procedures',
      'Policy document interpretation',
      'Multilingual support (IT/EN)',
    ],
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
  },
  manufacturer_financial: {
    name: 'Finn',
    role: 'Manufacturer Financial Analyst',
    provider: 'Bequerel Institute',
    color: 'emerald',
    initial: 'F',
    badges: ['datahub', 'charts', 'code'],
    description: 'Analyzes financial performance of solar manufacturers including revenue metrics, margins, shipments, R&D spending, and profitability trends.',
    capabilities: [
      'Financial performance analysis',
      'Cross-company comparisons',
      'Quarterly and yearly trend analysis',
      'Margin and profitability metrics',
      'Manufacturing capacity tracking',
    ],
    icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  },
  nzia_market_impact: {
    name: 'Nina',
    role: 'NZIA Market Impact Expert',
    provider: 'Bequerel Institute',
    color: 'teal',
    initial: 'N',
    badges: ['datahub', 'charts', 'ai'],
    description: 'Assesses market implications of NZIA regulations, including compliance impacts on different PV segments and regional market responses across EU countries.',
    capabilities: [
      'EU NZIA market impact analysis',
      'EU manufacturing targets (40% by 2030)',
      'Implementation timeline analysis',
      'Compliance criteria evaluation',
      'Country-level PV market forecasts',
    ],
    premium: true,
    icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  },
  // Excluded agents (not shown on agents page per user request)
  price: {
    name: 'Maya',
    role: 'Price Analysis',
    provider: 'Bequerel Institute',
    color: 'gold',
    initial: 'M',
    badges: ['datahub', 'charts', 'code'],
    description: 'Tracks and analyzes solar component pricing including modules, cells, wafers, and polysilicon across global markets.',
    icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  },
  om: {
    name: 'Leo',
    role: 'O&M Expert',
    provider: 'Bequerel Institute',
    color: 'indigo',
    initial: 'L',
    badges: ['ai', 'code'],
    description: 'Provides expertise on solar plant operations and maintenance, including best practices, predictive strategies, and cost optimization.',
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  },
};

// Agents to display on the agents page (excluding Maya and Leo per user request)
export const AVAILABLE_AGENTS: AgentType[] = [
  'market',
  'news',
  'digitalization',
  'nzia_policy',
  'manufacturer_financial',
  'nzia_market_impact',
];
