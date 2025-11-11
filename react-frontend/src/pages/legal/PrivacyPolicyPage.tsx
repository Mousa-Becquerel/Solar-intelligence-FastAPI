/**
 * PrivacyPolicyPage Component
 * Ported from templates/privacy_policy.html
 */

import { useState } from 'react';
import { ContactWidget } from '../../components/landing/ContactWidget';
import styles from './LegalPage.module.css';

export function PrivacyPolicyPage() {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <div className={styles.navHeader}>
              <div className={styles.logoSection}>
                <div className={styles.logo}>
                  <img src="/logos/new_logo.svg" alt="Solar Intelligence" style={{ height: '60px', width: 'auto' }} />
                </div>
              </div>
              <a href="/" className={styles.backLink}>
                ← Back to Home
              </a>
            </div>

            <div className={styles.heroTitle}>
              <h1>Privacy Policy</h1>
              <p>
                Your privacy matters to us. Learn how we protect and handle your data in compliance with GDPR and EU
                regulations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.contentCard}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              <strong>Last Updated:</strong> January 2025
            </p>

            {/* Section 1 */}
            <div className={styles.privacySection}>
              <h2>1. Introduction</h2>
              <p>
                Solar Intelligence ("we," "our," or "us") is committed to protecting your privacy and ensuring the
                security of your personal data. This Privacy Policy explains how we collect, use, and protect your
                information when you use our AI-powered solar market analysis platform in compliance with GDPR and EU data
                protection laws.
              </p>
            </div>

            {/* Section 2 */}
            <div className={styles.privacySection}>
              <h2>2. Data Controller</h2>
              <div className={styles.contactCard}>
                <h3 style={{ color: 'white', marginTop: 0 }}>Becquerel Institute</h3>
                <p style={{ marginBottom: 0, color: 'rgba(255, 255, 255, 0.9)' }}>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:info@becquerelinstitute.eu" style={{ color: 'var(--becq-gold)' }}>
                    info@becquerelinstitute.eu
                  </a>
                  <br />
                  <strong>Response Time:</strong> Within 72 hours
                </p>
              </div>
            </div>

            {/* Section 3 */}
            <div className={styles.privacySection}>
              <h2>3. Your GDPR Rights</h2>
              <div className={styles.rightsGrid}>
                <div className={styles.rightCard}>
                  <h4>
                    <svg
                      style={{ width: '1.25rem', height: '1.25rem', color: 'var(--becq-gold)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      ></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      ></path>
                    </svg>
                    Right to Access
                  </h4>
                  <p>Request a copy of your personal data and see how it's being processed.</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>
                    <svg
                      style={{ width: '1.25rem', height: '1.25rem', color: 'var(--becq-gold)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      ></path>
                    </svg>
                    Right to Rectification
                  </h4>
                  <p>Correct any inaccurate or incomplete personal data we hold about you.</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>
                    <svg
                      style={{ width: '1.25rem', height: '1.25rem', color: 'var(--becq-gold)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                    Right to Erasure
                  </h4>
                  <p>Request permanent deletion of your personal data from our systems.</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>
                    <svg
                      style={{ width: '1.25rem', height: '1.25rem', color: 'var(--becq-gold)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                    Right to Portability
                  </h4>
                  <p>Export your data in a machine-readable format for transfer to other services.</p>
                </div>
              </div>

              <div className={styles.actionButtons}>
                <a href="/profile" className={`${styles.btn} ${styles.btnPrimary}`}>
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  Export My Data
                </a>
                <a href="/profile" className={`${styles.btn} ${styles.btnSecondary}`}>
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                  Delete Account
                </a>
              </div>
            </div>

            {/* Section 4 */}
            <div className={styles.privacySection}>
              <h2>4. Data We Collect</h2>

              <h3>4.1 Personal Information</h3>
              <ul>
                <li>
                  <strong>Account Data:</strong> Username, email, full name
                </li>
                <li>
                  <strong>Authentication:</strong> Encrypted password hashes
                </li>
                <li>
                  <strong>Usage Data:</strong> Chat conversations and AI interactions
                </li>
              </ul>

              <h3>4.2 Technical Information</h3>
              <ul>
                <li>
                  <strong>Session Data:</strong> Login timestamps and activity
                </li>
                <li>
                  <strong>Performance:</strong> Error logs and metrics
                </li>
                <li>
                  <strong>Cookies:</strong> With your explicit consent
                </li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className={styles.privacySection}>
              <h2>5. Legal Basis for Processing</h2>
              <div className={styles.infoBox}>
                <ul style={{ marginBottom: 0 }}>
                  <li>
                    <strong>Contract Performance:</strong> Processing necessary for service provision
                  </li>
                  <li>
                    <strong>Legitimate Interest:</strong> Improving our AI models and user experience
                  </li>
                  <li>
                    <strong>Consent:</strong> Marketing communications and non-essential cookies
                  </li>
                  <li>
                    <strong>Legal Obligation:</strong> Compliance with EU regulations
                  </li>
                </ul>
              </div>
            </div>

            {/* Section 6 */}
            <div className={styles.privacySection}>
              <h2>6. Data Sharing and Transfers</h2>
              <p>We do not sell your personal data. We may share data with:</p>
              <ul>
                <li>AI service providers (with appropriate data processing agreements)</li>
                <li>Cloud infrastructure providers within the EU</li>
                <li>Legal authorities when required by law</li>
              </ul>
              <p>All international transfers comply with GDPR adequacy decisions or standard contractual clauses.</p>
            </div>

            {/* Section 7 */}
            <div className={styles.privacySection}>
              <h2>7. Data Retention</h2>
              <ul>
                <li>
                  <strong>Account Data:</strong> Retained until account deletion
                </li>
                <li>
                  <strong>Conversation Data:</strong> Retained for service improvement (up to 3 years)
                </li>
                <li>
                  <strong>Technical Logs:</strong> Automatically deleted after 12 months
                </li>
                <li>
                  <strong>Marketing Data:</strong> Until consent is withdrawn
                </li>
              </ul>
            </div>

            {/* Section 8 */}
            <div className={styles.privacySection}>
              <h2>8. Security Measures</h2>
              <div className={styles.infoBox}>
                <ul style={{ marginBottom: 0 }}>
                  <li>End-to-end encryption for data transmission</li>
                  <li>AES-256 encryption for data at rest</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Multi-factor authentication for admin access</li>
                  <li>GDPR-compliant data processing agreements</li>
                </ul>
              </div>
            </div>

            {/* Section 9 */}
            <div className={styles.privacySection}>
              <h2>9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically. Material changes will be communicated via email and platform
                notification at least 30 days before taking effect. Continued use after changes constitutes acceptance of the
                updated policy.
              </p>
            </div>

            {/* Section 10 */}
            <div className={styles.privacySection}>
              <h2>10. Contact Information</h2>
              <div className={styles.contactCard}>
                <p style={{ fontWeight: 600, marginBottom: '1rem', color: 'white' }}>For privacy-related questions:</p>
                <p style={{ marginBottom: 0, color: 'rgba(255, 255, 255, 0.9)' }}>
                  <strong>Contact:</strong>{' '}
                  <a href="mailto:info@becquerelinstitute.eu" style={{ color: 'var(--becq-gold)' }}>
                    info@becquerelinstitute.eu
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerLinks}>
              <a href="/terms">Terms of Service</a>
              <a href="/privacy">Privacy Policy</a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsContactOpen(true);
                }}
              >
                Contact
              </a>
            </div>
            <div className={styles.copyright}>
              &copy; 2025 Solar Intelligence - Becquerel Institute. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Widget */}
      <ContactWidget isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
}
