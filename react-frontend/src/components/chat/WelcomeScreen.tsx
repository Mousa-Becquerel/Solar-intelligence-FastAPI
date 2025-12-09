/**
 * Welcome Screen
 *
 * Displays when starting a new conversation
 * Shows agent-specific title and suggested prompts
 * Matches Flask design exactly
 */

import { AGENT_TITLES, AGENT_PROMPTS, type AgentType } from '../../constants/agents';

interface WelcomeScreenProps {
  agentType?: AgentType;
  onPromptClick?: (prompt: string) => void;
}

// Agent-specific subtitles
const AGENT_SUBTITLES: Record<AgentType, string> = {
  market: 'Your AI-powered assistant for global PV capacity analysis, installation trends, and market forecasts',
  news: 'Your AI-powered assistant for real-time solar industry news, policy updates, and market developments',
  digitalization: 'Your AI-powered assistant for digital transformation, automation trends, and AI applications in solar',
  nzia_policy: 'Your AI-powered assistant for NZIA compliance, FERX framework analysis, and EU policy guidance',
  manufacturer_financial: 'Your AI-powered assistant for manufacturer financial analysis, profitability trends, and investment insights',
  nzia_market_impact: 'Your AI-powered assistant for NZIA market impact assessment and EU manufacturing targets',
  component_prices: 'Your AI-powered assistant for PV component pricing across modules, polysilicon, wafers, cells, and raw materials',
  seamless: 'Your AI-powered assistant for integrated PV market analysis across BIPV, IIPV, AgriPV, and VIPV segments',
  quality: 'Your AI-powered assistant for PV system risks, reliability, degradation analysis, and bankability assessment',
};

export default function WelcomeScreen({
  agentType = 'market',
  onPromptClick,
}: WelcomeScreenProps) {
  // Get agent-specific title and subtitle
  const title = AGENT_TITLES[agentType] || 'Solar Intelligence';
  const subtitle = AGENT_SUBTITLES[agentType] || 'Your AI-powered assistant for photovoltaic market insights, price analysis, and industry intelligence';

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        background: '#ffffff',
        animation: 'fadeIn 0.3s ease-in',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
        }}
      >
        <h1
          style={{
            display: 'block',
            fontSize: '3rem',
            fontWeight: '400',
            marginBottom: '1.5rem',
            letterSpacing: '-0.025em',
            lineHeight: '1.2',
            color: '#1e3a8a',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            display: 'block',
            fontSize: '1.125rem',
            color: '#1e3a8a',
            lineHeight: '1.65',
            fontWeight: '300',
            margin: '0',
            letterSpacing: '-0.01em',
            fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
