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
  badges: Array<'datahub' | 'charts' | 'news' | 'ai report' | 'code' | 'digitalization' | 'ferx' | 'ipv' | 'nzia'>;
  description: string;
  capabilities?: string[]; // List of agent capabilities
  premium?: boolean;
  icon: string; // SVG path data
  customBadge?: string; // Optional custom badge image path (e.g., "/badges/SEAMLESS-PV-LOGO.png")
}

export const AGENT_METADATA: Record<AgentType, AgentMetadata> = {
  market: {
    name: 'Alex',
    role: 'PV Capacity',
    provider: 'Bequerel Institute',
    color: 'gold-dark',
    initial: 'A',
    badges: ['datahub', 'charts'],
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
    badges: ['news'],
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
    badges: ['ai report', 'digitalization'],
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
    badges: ['ferx','nzia'],
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
    badges: ['datahub'],
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
    badges: ['datahub','nzia'],
    description: 'Assesses market implications of NZIA regulations, including compliance impacts on different PV segments and regional market responses across EU countries.',
    capabilities: [
      'EU NZIA market impact analysis',
      'EU manufacturing targets (40% by 2030)',
      'Implementation timeline analysis',
      'Compliance criteria evaluation',
      'Country-level PV market forecasts',
    ],
    premium: false,
    icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  },
  component_prices: {
    name: 'Priya',
    role: 'Component Prices Analyst',
    provider: 'Bequerel Institute',
    color: 'indigo',
    initial: 'P',
    badges: ['datahub', 'charts'],
    description: 'Analyzes photovoltaic component price data across the full PV value chain, including modules, polysilicon, wafers, cells, and raw materials with trend analysis and visualization.',
    capabilities: [
      'Component price tracking (modules, cells, wafers, polysilicon)',
      'Raw material prices (aluminium, copper, EVA, silver, PV glass)',
      'Multi-region price comparisons (China, EU, US, India, Australia)',
      'Technology-specific pricing (PERC, TOPCon, HJT)',
      'Price trend analysis and forecasting',
      'Weekly price data updates',
    ],
    icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  },
  seamless: {
    name: 'Sam',
    role: 'IPV Expert',
    provider: 'Bequerel Institute',
    color: 'navy',
    initial: 'S',
    badges: ['ipv'],
    description: 'Retrieval-bound expert with access to 6 comprehensive documents covering BIPV market analysis, IPV regulatory environment, manufacturing costs, stakeholder needs, and long-term deployment scenarios up to 2050 across all IPV segments (BIPV, IIPV, AgriPV, VIPV).',
    capabilities: [
      'BIPV market status and cost-competitiveness analysis',
      'IPV regulatory environment and standards (EN 50583, IEC 63092)',
      'Manufacturing cost modeling (generalist vs specialist)',
      'Stakeholder mapping and value chain analysis',
      'SAM forecasts and long-term scenarios (2030, 2050)',
      'Technical and economic potential assessment',
    ],
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    customBadge: '/badges/SEAMLESS-PV-LOGO.png',
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
  'component_prices',
  'seamless',
];
