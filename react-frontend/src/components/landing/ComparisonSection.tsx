/**
 * ComparisonSection Component
 * Shows advantages over generic AI tools
 */

import styles from './ComparisonSection.module.css';

const genericAIItems = [
  'Limited to publicly available and often outdated solar market data',
  'No access to proprietary databases or reports behind paywalls',
  'Produce generic responses without verified market references',
  'Cannot generate validated charts or forecasts from specialized datasets',
  'Lack integration with industry feeds',
];

const ourPlatformItems = [
  'Access to 50,000+ validated data points across many global solar regions',
  'Specialized AI agents trained on solar market intelligence and policy frameworks',
  'Retrieve and synthesize insights from curated reports under paywall, ensuring fact-checked outputs',
  'VALIDATED pricing, policy, NEWS and capacity analysis continuously updated',
  'Interactive visualizations and export-ready professional reports',
  "Seamless integration with The Becquerel Institute's European PV DataHub and leading market sources",
];

export function ComparisonSection() {
  return (
    <section id="comparison" className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            Why Choose <span className={styles.accent}>Specialized Intelligence</span>
          </h2>
          <p className={styles.subtitle}>Generic tools fall short when you need real solar market expertise and professional results</p>
        </div>

        {/* Comparison Cards */}
        <div className={styles.grid}>
          {/* Left Card: Generic AI */}
          <div className={`${styles.card} ${styles.cardLeft}`}>
            <div className={styles.cardHeader}>
              <span className={`${styles.badge} ${styles.badgeGeneric}`}>Generic AI Tools</span>
              <h3 className={styles.cardTitle}>ChatGPT & General AI Platforms</h3>
            </div>

            <div className={styles.list}>
              {genericAIItems.map((item, index) => (
                <div key={index} className={`${styles.item} ${styles.itemNegative}`}>
                  <div className={`${styles.icon} ${styles.iconNegative}`}>
                    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Card: Solar Intelligence */}
          <div className={`${styles.card} ${styles.cardRight}`}>
            <div className={styles.cardHeader}>
              <span className={`${styles.badge} ${styles.badgePremium}`}>Our Platform</span>
              <h3 className={styles.cardTitle}>Solar Intelligence</h3>
            </div>

            <div className={styles.list}>
              {ourPlatformItems.map((item, index) => (
                <div key={index} className={`${styles.item} ${styles.itemPositive}`}>
                  <div className={`${styles.icon} ${styles.iconPositive}`}>
                    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className={styles.cta}>
          <a href="/login" className={styles.ctaButton}>
            Get Started Now
          </a>
          <p className={styles.ctaText}>Start analyzing solar markets with specialized AI</p>
        </div>
      </div>
    </section>
  );
}
