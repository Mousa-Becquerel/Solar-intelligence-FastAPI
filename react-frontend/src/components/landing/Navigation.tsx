/**
 * Navigation Component
 * Landing page navigation bar with logo, links, and CTAs
 */

import { useStickyNav } from '../../hooks/landing/useStickyNav';
import styles from './Navigation.module.css';

interface NavigationProps {
  onContactClick?: () => void;
}

export function Navigation({ onContactClick }: NavigationProps) {
  const isSticky = useStickyNav(100);

  return (
    <nav className={`${styles.nav} ${isSticky ? styles.sticky : ''}`}>
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Logo (Left) */}
          <div className={styles.leftSection}>
            <div className={styles.logoWithSubtitle}>
              <img src="/logos/new_logo.svg" alt="Solar Intelligence" className={styles.logoImage} />
              <p className={styles.taglineSub}>Powered by Becquerel Institute</p>
            </div>

            {/* Navigation Links (Right of Logo) */}
            <div className={styles.navLinks}>
              <a href="#home" className={styles.navLink}>
                Home
              </a>
              <a href="#agents" className={styles.navLink}>
                AI Agents
              </a>
              <a href="#data" className={styles.navLink}>
                Data Coverage
              </a>
              <a href="#workflow" className={styles.navLink}>
                How It Works
              </a>
              <a href="#comparison" className={styles.navLink}>
                Comparison
              </a>
              <a href="#faq" className={styles.navLink}>
                FAQ
              </a>
            </div>
          </div>

          {/* Action Buttons (Right) */}
          <div className={styles.actionButtons}>
            <a href="/login" className={styles.signIn}>
              Sign In
            </a>
            <button onClick={onContactClick} className={styles.btnPrimary}>
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
