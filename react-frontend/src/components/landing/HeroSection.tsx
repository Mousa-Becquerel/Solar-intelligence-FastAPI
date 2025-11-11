/**
 * HeroSection Component
 * Landing page hero with headline, subtitle, CTAs, and agent showcase
 */

import { AgentShowcase } from './AgentShowcase';
import styles from './HeroSection.module.css';

export function HeroSection() {
  return (
    <section id="home" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.textContent}>
            <div className={styles.headline}>
              <div className={styles.headlineLight}>THE FUTURE IS</div>
              <div className={styles.headlineAccent}>SOLAR,</div>
              <div className={styles.headlineLight}>
                AND IT IS <span className={styles.headlineAccentInline}>INTELLIGENT</span>
              </div>
            </div>

            <p className={styles.subtitle}>
              Advanced analytics for solar intelligence. Get instant insights from AI agents specialized in market analysis,
              pricing, and industry trends.
            </p>

            <div className={styles.ctaButtons}>
              <a href="/login" className={styles.btnPrimary}>
                START NOW
              </a>
              <a href="#agents" className={styles.btnSecondary}>
                EXPLORE
              </a>
            </div>
          </div>

          <div className={styles.showcaseWrapper}>
            <AgentShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}
