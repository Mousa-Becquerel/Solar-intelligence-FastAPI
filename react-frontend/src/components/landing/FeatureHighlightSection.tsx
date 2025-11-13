/**
 * FeatureHighlightSection Component
 * Showcase key platform value with animated hexagon graphic
 */

import styles from './FeatureHighlightSection.module.css';

export function FeatureHighlightSection() {
  return (
    <section id="data" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Left: Animated Graphic */}
          <div className={styles.graphicWrapper}>
            <div className={styles.hexagonContainer}>
              {/* Hexagon outline */}
              <svg className={styles.hexagonSvg} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                {/* Main hexagon */}
                <path
                  className={styles.hexagonPath}
                  d="M 200 30 L 350 115 L 350 285 L 200 370 L 50 285 L 50 115 Z"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="3"
                  opacity="0.6"
                />

                {/* Inner hexagon lines */}
                <line x1="200" y1="30" x2="200" y2="370" stroke="#fbbf24" strokeWidth="2" opacity="0.3" />
                <line x1="50" y1="115" x2="350" y2="285" stroke="#fbbf24" strokeWidth="2" opacity="0.3" />
                <line x1="50" y1="285" x2="350" y2="115" stroke="#fbbf24" strokeWidth="2" opacity="0.3" />

                {/* Animated circles with brand colors */}
                <circle className={`${styles.floatingCircle} ${styles.circle1}`} cx="280" cy="120" r="30" fill="#fbbf24" opacity="0.8" />
                <circle className={`${styles.floatingCircle} ${styles.circle2}`} cx="120" cy="280" r="35" fill="#0a1850" opacity="0.7" />
                <circle className={`${styles.floatingCircle} ${styles.circle3}`} cx="200" cy="200" r="25" fill="#f59e42" opacity="0.6" />
              </svg>
            </div>
          </div>

          {/* Right: Quote Content */}
          <div className={styles.contentWrapper}>
            <div className={styles.content}>
              <p className={styles.description}>
                <span className={styles.brand}>SolarIntelligence.ai</span> is a hub of specialised{' '}
                <span className={styles.accent}>AI agents</span> leveraging our internal tools and{' '}
                <span className={styles.accent}>verified PV datasets</span> on market, supply chain, prices, policies and more!
              </p>

              <p className={styles.subtitle}>Who is it useful for?</p>

              <p className={styles.descriptionSecondary}>
                Thanks to its intuitive interface, <span className={styles.brand}>Solarintelligence.ai</span> will empower any
                stakeholder seeking trustable intelligence on solar photovoltaics. Quickly and easily access validated information
                without complex dashboards. Simply express your needs in your own words, get accurate answers and export-ready{' '}
                <span className={styles.accent}>charts, tables or slides</span> based on data validated by our team of experts.
              </p>
            </div>

            <div className={styles.ctaWrapper}>
              <a href="/login" className={styles.cta}>
                <span>Start Your Analysis</span>
                <svg className={styles.ctaIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
