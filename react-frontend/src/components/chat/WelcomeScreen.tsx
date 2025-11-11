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

export default function WelcomeScreen({
  agentType = 'market',
  onPromptClick,
}: WelcomeScreenProps) {
  // Get agent-specific title
  const title = AGENT_TITLES[agentType] || 'Solar Intelligence';

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
      }}
    >
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
          Your AI-powered assistant for photovoltaic market insights, price
          analysis, and industry intelligence
        </p>
      </div>
    </div>
  );
}
