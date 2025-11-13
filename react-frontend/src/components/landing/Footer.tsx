/**
 * Footer Component
 * Landing page footer with CTA, social links, logo, and navigation
 */

import styles from './Footer.module.css';

interface FooterProps {
  onContactClick?: () => void;
}

export function Footer({ onContactClick }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Top Section: Contact CTA */}
        <div className={styles.top}>
          <div className={styles.cta}>
            <h3 className={styles.ctaText}>
              How can we help?{' '}
              <button onClick={onContactClick} className={styles.ctaLink}>
                Contact us
              </button>
            </h3>
          </div>
          <div className={styles.social}>
            <a
              href="https://www.linkedin.com/company/becquerel-institute/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="LinkedIn"
            >
              <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://www.becquerelinstitute.eu/ai-solutions-for-the-solar-industry"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="Website"
            >
              <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@becquerelinstitute8382"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="YouTube"
            >
              <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Middle Section: Large Logo */}
        <div className={styles.logoSection}>
          <img src="/logos/new_logo.svg" alt="Solar Intelligence" className={styles.logo} />
        </div>

        {/* Bottom Section: Links */}
        <div className={styles.bottom}>
          <div className={styles.links}>
            <a href="https://datahub.becquerelinstitute.eu/Home" target="_blank" rel="noopener noreferrer" className={styles.link}>
              European PV Data Hub
            </a>
            <a href="https://www.becquerelinstitute.eu/" target="_blank" rel="noopener noreferrer" className={styles.link}>
              Becquerel Institute
            </a>
            <a href="https://www.becquerelinstitute.eu/shop" target="_blank" rel="noopener noreferrer" className={styles.link}>
              Market Reports
            </a>
            <button onClick={onContactClick} className={styles.link}>
              Contact
            </button>
          </div>
          <div className={styles.legalLinks}>
            <a href="/terms" className={styles.legalLink}>Terms of Service</a>
            <span className={styles.separator}>•</span>
            <a href="/privacy" className={styles.legalLink}>Privacy Policy</a>
            <span className={styles.separator}>•</span>
            <a href="/cookie-policy" className={styles.legalLink}>Cookie Policy</a>
          </div>
          <div className={styles.copyright}>© 2025 Solarintelligence. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
