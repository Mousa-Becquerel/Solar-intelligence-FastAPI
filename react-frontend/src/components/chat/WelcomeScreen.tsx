/**
 * Welcome Screen
 *
 * Displays when starting a new conversation
 * Shows agent-specific title, suggested prompts, and integrated input
 * Input and suggestions are shown directly below the welcome message for all agents
 */

import { AGENT_TITLES, AGENT_PROMPTS, type AgentType } from '../../constants/agents';

interface WelcomeScreenProps {
  agentType?: AgentType;
  onPromptClick?: (prompt: string) => void;
  // Props for integrated input (all agents)
  integratedInput?: React.ReactNode;
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
  storage_optimization: 'Your AI-powered assistant for optimal battery storage system design with solar PV and financial analysis',
  bipv_design: 'Upload building images and describe your vision to generate photorealistic BIPV visualizations',
};

export default function WelcomeScreen({
  agentType = 'market',
  onPromptClick,
  integratedInput,
}: WelcomeScreenProps) {
  // Get agent-specific title and subtitle
  const title = AGENT_TITLES[agentType] || 'Solar Intelligence';
  const subtitle = AGENT_SUBTITLES[agentType] || 'Your AI-powered assistant for photovoltaic market insights, price analysis, and industry intelligence';

  // Check if agent has prompts defined
  const hasPrompts = AGENT_PROMPTS[agentType] && AGENT_PROMPTS[agentType].length > 0;

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
            marginBottom: '2rem',
          }}
        >
          {subtitle}
        </p>

        {/* Suggested queries for all agents */}
        {hasPrompts && onPromptClick && (
          <div
            style={{
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: agentType === 'bipv_design' ? 'column' : 'row',
                flexWrap: agentType === 'bipv_design' ? 'nowrap' : 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                maxWidth: agentType === 'bipv_design' ? '400px' : '900px',
                margin: '0 auto',
              }}
            >
              {AGENT_PROMPTS[agentType]?.map((query, index) => (
                <button
                  key={index}
                  onClick={() => onPromptClick(query.prompt)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: agentType === 'bipv_design' ? 'center' : 'flex-start',
                    gap: '0.625rem',
                    padding: '0.75rem 1.125rem',
                    background: '#F3F4F9',
                    border: 'none',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: "'Inter', 'Open Sans', Arial, sans-serif",
                    fontSize: '0.8125rem',
                    fontWeight: '400',
                    color: '#1e293b',
                    letterSpacing: '-0.01em',
                    boxShadow: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    textAlign: 'left',
                    width: agentType === 'bipv_design' ? '100%' : 'auto',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E8EAF6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F3F4F9';
                  }}
                >
                  {/* Icon */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      width: '20px',
                      height: '20px',
                    }}
                    dangerouslySetInnerHTML={{ __html: query.icon }}
                  />
                  {/* Text */}
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '500px',
                    }}
                  >
                    {query.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Integrated input for all agents */}
        {integratedInput && (
          <div style={{ marginTop: agentType === 'bipv_design' ? '2.5rem' : '1rem' }}>
            {integratedInput}
          </div>
        )}
      </div>
    </div>
  );
}
