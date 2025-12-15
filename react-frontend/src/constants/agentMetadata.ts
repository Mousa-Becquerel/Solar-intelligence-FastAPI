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
  provider: string; // Provider name (e.g., "Becquerel Institute")
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
    provider: 'Becquerel Institute',
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
    provider: 'Becquerel Institute',
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
    provider: 'Becquerel Institute',
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
    premium: true,
    icon: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  },
  nzia_policy: {
    name: 'Aniza',
    role: "Expert in Italy's NZIA policy framework",
    provider: 'Becquerel Institute',
    color: 'purple',
    initial: 'A',
    badges: ['ferx','nzia'],
    description: "Expert in Italy's NZIA policy framework - Specialized in the Net-Zero Industry Act (NZIA) auction mechanisms, compliance requirements, and regulatory frameworks for photovoltaic projects in Italy.",
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
    provider: 'Becquerel Institute',
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
    provider: 'Becquerel Institute',
    color: 'teal',
    initial: 'N',
    badges: ['datahub','nzia'],
    description: "Net-Zero Industry Act & 'Made in EU' Rules in Practice: Impacts on PV Markets, Projects' Economics & How to Comply",
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
  component_prices: {
    name: 'Priya',
    role: 'Component Prices Analyst',
    provider: 'Becquerel Institute',
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
    provider: 'Becquerel Institute',
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
  quality: {
    name: 'Quinn',
    role: 'PV Risk & Reliability Expert',
    provider: 'Becquerel Institute',
    color: 'purple',
    initial: 'Q',
    badges: ['datahub'],
    description: 'Technical assistant for solar PV professionals, investors, asset managers, O&M teams, and due diligence analysts. Provides expert analysis on PV system risks, reliability, degradation, bankability, and lifecycle performance based on SolarBankability guidelines and peer-reviewed research.',
    capabilities: [
      'Performance Loss Rate (PLR) & degradation analysis',
      'Technical risk assessment (FMEA, RAM analysis)',
      'Degradation modes & inspection techniques (EL, IR, UV)',
      'Bankability & financial risk integration',
      'EPC & O&M best practices and checklists',
      'IEC standards & quality frameworks',
    ],
    icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  },
  storage_optimization: {
    name: 'Eco',
    role: 'Storage Optimization Expert',
    provider: 'Becquerel Institute',
    color: 'emerald',
    initial: 'E',
    badges: ['datahub', 'charts'],
    description: 'Storage optimization consultant helping users design optimal battery storage systems with solar PV. Provides system sizing recommendations, financial analysis, and performance simulations for residential and commercial applications.',
    capabilities: [
      'Optimal battery storage sizing',
      'Self-consumption optimization',
      'Financial analysis (payback, NPV, IRR)',
      'Storage simulation & forecasting',
      'Residential & commercial system design',
      'Economic vs autarky trade-off analysis',
    ],
    icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
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
  'quality',
  'storage_optimization',
];
