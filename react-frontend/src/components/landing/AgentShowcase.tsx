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
    agent: 'Alex - Market Agent',
    userQuery: 'Show the Italian PV market data from 2020 to 2025',
    chartData: showcaseChartData[1],
    avatar: (
      <div className={styles.avatar} style={{ background: '#E9A544', color: '#040B59' }}>
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
        </svg>
      </div>
    ),
  },
  {
    id: 2,
    agent: 'Maya - Price Agent',
    userQuery: 'Compare module prices: China vs India',
    chartData: showcaseChartData[2],
    avatar: (
      <div className={styles.avatar} style={{ background: '#E9A544', color: '#040B59' }}>
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
            clipRule="evenodd"
          ></path>
        </svg>
      </div>
    ),
  },
  {
    id: 3,
    agent: 'Emma - News Agent',
    userQuery: 'Latest policy updates in the US?',
    agentResponse:
      'IRA extended solar ITC at 30% through 2032. New domestic content requirements provide 10% bonus credit for US-made modules and cells.',
    avatar: (
      <div className={styles.avatar} style={{ background: '#E9A544', color: '#040B59' }}>
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
            clipRule="evenodd"
          ></path>
          <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z"></path>
        </svg>
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
