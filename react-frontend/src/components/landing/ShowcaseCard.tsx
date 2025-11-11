/**
 * ShowcaseCard Component
 * Individual agent card in the 3D carousel with typewriter animation
 * Reimplemented from scratch to match original landing-showcase.js exactly
 */

import { useEffect, useState } from 'react';
import { useTypewriter } from '../../hooks/landing/useTypewriter';
import { ShowcaseChart } from './ShowcaseChart';
import type { PlotData } from '../../types/charts';
import styles from './ShowcaseCard.module.css';

interface ShowcaseCardProps {
  agent: string;
  agentAvatar: React.ReactNode;
  userQuery: string;
  chartData?: PlotData;
  agentResponse?: string;
  position: number;
  isActive: boolean;
  onClick?: () => void;
}

export function ShowcaseCard({
  agent,
  agentAvatar,
  userQuery,
  chartData,
  agentResponse,
  position,
  isActive,
  onClick,
}: ShowcaseCardProps) {
  const [showChart, setShowChart] = useState(false);

  // Typewriter for user query (speed: 40ms per character, matching original)
  const userTypewriter = useTypewriter({
    text: userQuery,
    speed: 40,
    enabled: isActive,
  });

  // Typewriter for agent response (speed: 25ms per character, matching original)
  const agentTypewriter = useTypewriter({
    text: agentResponse || '',
    speed: 25,
    enabled: isActive && userTypewriter.isComplete && !!agentResponse,
  });

  // Show chart after user query completes + 300ms delay (matching original)
  useEffect(() => {
    if (isActive && userTypewriter.isComplete && chartData) {
      const timeout = setTimeout(() => {
        setShowChart(true);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setShowChart(false);
    }
  }, [isActive, userTypewriter.isComplete, chartData]);

  // Reset state when card is not active
  useEffect(() => {
    if (!isActive) {
      setShowChart(false);
    }
  }, [isActive]);

  // Determine status text (matching original logic)
  let statusText = 'Idle';
  if (isActive) {
    if (!userTypewriter.isComplete) {
      statusText = 'Searching...';
    } else if (chartData && showChart) {
      statusText = 'Complete';
    } else if (chartData) {
      statusText = 'Generating visualization...';
    } else if (agentResponse) {
      if (agentTypewriter.isComplete) {
        statusText = 'Complete';
      } else {
        statusText = 'Responding...';
      }
    }
  }

  return (
    <div
      className={styles.card}
      data-position={position}
      onClick={position === 0 ? onClick : undefined}
      style={{ cursor: position === 0 ? 'pointer' : 'default' }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.avatarWrapper}>{agentAvatar}</div>
        <div>
          <div className={styles.agentName}>{agent}</div>
          <div className={styles.agentStatus}>{statusText}</div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* User Message */}
        <div className={styles.userMessageWrapper}>
          <div className={styles.userMessage} data-query={userQuery}>
            {userTypewriter.displayText}
            {userTypewriter.showCursor ? <span className={styles.cursor} /> : null}
          </div>
        </div>

        {/* Agent Response - Chart */}
        {chartData && showChart && (
          <div className={`${styles.agentResponseChart} ${styles.chartFadeIn}`}>
            <ShowcaseChart data={chartData} />
          </div>
        )}

        {/* Agent Response - Text */}
        {agentResponse && userTypewriter.isComplete && (
          <div className={styles.agentResponseWrapper}>
            <div className={styles.agentResponse}>
              {agentTypewriter.displayText}
              {agentTypewriter.showCursor ? <span className={styles.cursor} /> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
