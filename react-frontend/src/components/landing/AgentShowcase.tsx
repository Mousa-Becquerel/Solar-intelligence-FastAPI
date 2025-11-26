/**
 * AgentShowcase Component
 * 3D stacked carousel with agent showcase cards
 */

import { ShowcaseCard } from './ShowcaseCard';
import { useCarousel } from '../../hooks/landing/useCarousel';
import { showcaseChartData } from '../../data/showcaseChartData';
import styles from './AgentShowcase.module.css';

// Agent card configurations
const agents = [
  {
    id: 1,
    agent: 'Alex - PV Capacity',
    userQuery: 'Show the Italian PV market data from 2020 to 2024',
    chartData: showcaseChartData[1],
    avatar: (
      <div className={styles.avatar} style={{ background: '#E9A544', color: '#040B59' }}>
        <img
          src="/agents/Alex.svg"
          alt="Alex"
          style={{
            objectFit: 'contain',
            filter: 'brightness(0) saturate(100%) invert(18%) sepia(85%) saturate(2476%) hue-rotate(215deg) brightness(93%) contrast(98%)', // Blue icon (#040B59)
          }}
        />
      </div>
    ),
  },
  {
    id: 2,
    agent: 'Priya - Component Prices',
    userQuery: 'Compare module prices: China vs India',
    chartData: showcaseChartData[2],
    avatar: (
      <div className={styles.avatar} style={{ background: '#E9A544', color: '#040B59' }}>
        <img
          src="/agents/Priya.svg"
          alt="Priya"
          style={{
            objectFit: 'contain',
            filter: 'brightness(0) saturate(100%) invert(18%) sepia(85%) saturate(2476%) hue-rotate(215deg) brightness(93%) contrast(98%)', // Blue icon (#040B59)
          }}
        />
      </div>
    ),
  },
  {
    id: 3,
    agent: 'Emma - News Analyst',
    userQuery: 'Latest policy updates in the US?',
    agentResponse:
      'IRA extended solar ITC at 30% through 2032. New domestic content requirements provide 10% bonus credit for US-made modules and cells.',
    avatar: (
      <div className={styles.avatar} style={{ background: '#E9A544', color: '#040B59' }}>
        <img
          src="/agents/Emma.svg"
          alt="Emma"
          style={{
            objectFit: 'contain',
            filter: 'brightness(0) saturate(100%) invert(18%) sepia(85%) saturate(2476%) hue-rotate(215deg) brightness(93%) contrast(98%)', // Blue icon (#040B59)
          }}
        />
      </div>
    ),
  },
];

export function AgentShowcase() {
  const { currentIndex, next } = useCarousel({
    itemCount: agents.length,
    autoRotateDuration: 8000,
    pauseDuration: 10000,
  });

  // Calculate position for each card
  const getPosition = (index: number) => {
    const diff = (index - currentIndex + agents.length) % agents.length;
    if (diff === 0) return 0; // Front
    if (diff === 1) return 1; // Second
    if (diff === 2) return 2; // Third
    return -1; // Hidden
  };

  return (
    <div className={styles.container}>
      {agents.map((agentConfig, index) => (
        <ShowcaseCard
          key={agentConfig.id}
          agent={agentConfig.agent}
          agentAvatar={agentConfig.avatar}
          userQuery={agentConfig.userQuery}
          chartData={agentConfig.chartData}
          {...(agentConfig.agentResponse && { agentResponse: agentConfig.agentResponse })}
          position={getPosition(index)}
          isActive={index === currentIndex}
          onClick={next}
        />
      ))}

      {/* Click Hint */}
      <div className={styles.clickHint}>
        <p className={styles.hintText}>
          <svg className={styles.hintIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-6 6m0 0l-6-6m6 6V9a6 6 0 0112 0v3"></path>
          </svg>
          Click to explore
        </p>
      </div>
    </div>
  );
}
