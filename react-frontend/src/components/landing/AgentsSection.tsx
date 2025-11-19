/**
 * AgentsSection Component
 * Introduces the AI agents with horizontal scrolling carousel
 */

import { AgentsCarousel } from './AgentsCarousel';
import styles from './AgentsSection.module.css';

export function AgentsSection() {
  return (
    <section id="agents" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            Our <span className={styles.accent}>AI Agents</span>
          </h3>
          <p className={styles.subtitle}>Specialized assistants for solar market intelligence</p>
        </div>

        {/* Infinite Scrolling Carousel */}
        <AgentsCarousel />
      </div>
    </section>
  );
}
