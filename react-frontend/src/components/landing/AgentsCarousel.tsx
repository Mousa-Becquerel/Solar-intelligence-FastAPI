/**
 * AgentsCarousel Component
 * Infinite horizontal scrolling carousel displaying agent cards
 */

import { useRef, useEffect } from 'react';
import AgentCard from '../agents/AgentCard';
import { AGENT_METADATA, AVAILABLE_AGENTS } from '../../constants/agentMetadata';
import type { AgentType } from '../../constants/agents';
import styles from './AgentsCarousel.module.css';

export function AgentsCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Duplicate cards for seamless infinite scroll
    const scrollerInner = scroller.querySelector('[data-scroller-inner]');
    if (!scrollerInner) return;

    const scrollerContent = Array.from(scrollerInner.children);

    // Clone each card for infinite effect
    scrollerContent.forEach((item) => {
      const duplicatedItem = item.cloneNode(true) as HTMLElement;
      duplicatedItem.setAttribute('aria-hidden', 'true');
      scrollerInner.appendChild(duplicatedItem);
    });
  }, []);

  // Dummy handler for landing page (no actual hiring functionality)
  const handleExplore = () => {
    window.location.href = '/login';
  };

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.scroller} ref={scrollerRef} data-animated="true">
        <div className={styles.scrollerInner} data-scroller-inner>
          {AVAILABLE_AGENTS.map((agentType) => (
            <div key={agentType} className={styles.cardWrapper}>
              <AgentCard
                agentType={agentType}
                metadata={AGENT_METADATA[agentType]}
                isHired={false}
                userPlan="free"
                onToggleHire={handleExplore}
                onCardClick={handleExplore}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
