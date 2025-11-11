/**
 * TermsOfServicePage Component
 * Ported from templates/terms_of_service.html
 */

import { useState } from 'react';
import { ContactWidget } from '../../components/landing/ContactWidget';
import styles from './LegalPage.module.css';

export function TermsOfServicePage() {
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
              <h1>Terms of Service</h1>
              <p>Clear, comprehensive terms governing the use of our solar market intelligence platform</p>
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
            <div className={styles.termsSection}>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using Solar Intelligence ("Service"), you accept and agree to be bound by the terms
                and provision of this agreement. If you do not agree to these terms, you should not use our service.
              </p>
            </div>

            {/* Section 2 */}
            <div className={styles.termsSection}>
              <h2>2. Service Description</h2>
              <p>Solar Intelligence provides:</p>
              <ul>
                <li>AI-powered analysis of solar photovoltaic (PV) market data</li>
                <li>Interactive data visualizations and reports</li>
                <li>Market trend analysis and price tracking</li>
                <li>Access to verified solar industry datasets</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className={styles.termsSection}>
              <h2>3. User Accounts and Registration</h2>
              <h3>3.1 Account Creation</h3>
              <ul>
                <li>You must provide accurate and complete registration information</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must be at least 18 years old to create an account</li>
                <li>One person may not maintain more than one account</li>
              </ul>

              <h3>3.2 Account Security</h3>
              <ul>
                <li>You are responsible for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Use strong, unique passwords</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className={styles.termsSection}>
              <h2>4. Acceptable Use Policy</h2>

              <h3>4.1 Permitted Uses</h3>
              <ul>
                <li>Market research and analysis for legitimate business purposes</li>
                <li>Educational and academic research</li>
                <li>Personal investment analysis</li>
              </ul>

              <h3>4.2 Prohibited Uses</h3>
              <div className={styles.warningBox}>
                <ul style={{ marginBottom: 0 }}>
                  <li>Attempting to gain unauthorized access to our systems</li>
                  <li>Using the service for illegal activities</li>
                  <li>Sharing your account credentials with others</li>
                  <li>Attempting to reverse engineer our AI models</li>
                  <li>Excessive automated querying that impacts service performance</li>
                  <li>Redistributing our proprietary data without permission</li>
                </ul>
              </div>
            </div>

            {/* Section 5 */}
            <div className={styles.termsSection}>
              <h2>5. Data and Privacy</h2>
              <p>Our handling of your personal data is governed by our Privacy Policy. Key points:</p>
              <ul>
                <li>We process data in accordance with GDPR and EU privacy laws</li>
                <li>Your conversation data is stored securely and used to improve our services</li>
                <li>You retain ownership of data you input into our system</li>
                <li>You can request data export or deletion at any time</li>
              </ul>
            </div>

            {/* Section 6 */}
            <div className={styles.termsSection}>
              <h2>6. Intellectual Property</h2>

              <h3>6.1 Our Rights</h3>
              <ul>
                <li>Solar Intelligence platform, AI models, and algorithms are our proprietary technology</li>
                <li>Market data compilations and analysis methodologies are protected intellectual property</li>
                <li>Trademarks and branding elements belong to Becquerel Institute</li>
              </ul>

              <h3>6.2 Your Rights</h3>
              <ul>
                <li>You retain ownership of any original content you create using our platform</li>
                <li>Generated reports and analyses may be used for your business purposes</li>
                <li>You may not claim ownership of our underlying data or methodologies</li>
              </ul>
            </div>

            {/* Section 7 */}
            <div className={styles.termsSection}>
              <h2>7. Service Availability and Modifications</h2>
              <div className={styles.highlightBox}>
                <ul style={{ marginBottom: 0 }}>
                  <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
                  <li>We may modify features, add new capabilities, or discontinue certain functions</li>
                  <li>Scheduled maintenance will be announced in advance when possible</li>
                  <li>We reserve the right to suspend accounts that violate these terms</li>
                </ul>
              </div>
            </div>

            {/* Section 8 */}
            <div className={styles.termsSection}>
              <h2>8. Limitation of Liability</h2>
              <div className={styles.infoBox}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  Important Disclaimer:
                </p>
                <ul style={{ marginBottom: 0 }}>
                  <li>Our service provides data analysis and insights, not financial advice</li>
                  <li>Investment decisions should not be based solely on our analysis</li>
                  <li>We are not liable for business decisions made using our platform</li>
                  <li>Maximum liability is limited to the amount paid for our services</li>
                </ul>
              </div>
            </div>

            {/* Section 9 */}
            <div className={styles.termsSection}>
              <h2>9. European Union Specific Terms</h2>
              <h3>9.1 GDPR Compliance</h3>
              <ul>
                <li>All personal data processing complies with GDPR Article 6 requirements</li>
                <li>You have the right to data portability, rectification, and erasure</li>
                <li>Data processing agreements available upon request</li>
              </ul>

              <h3>9.2 Consumer Rights</h3>
              <ul>
                <li>EU consumer protection laws apply where applicable</li>
                <li>14-day withdrawal right for new subscriptions (where legally required)</li>
                <li>Disputes may be resolved through EU-approved alternative dispute resolution</li>
              </ul>
            </div>

            {/* Section 10 */}
            <div className={styles.termsSection}>
              <h2>10. Account Termination</h2>

              <h3>10.1 By You</h3>
              <ul>
                <li>You may terminate your account at any time through account settings</li>
                <li>Data export is available for 30 days after account closure</li>
                <li>All personal data will be deleted within 30 days of termination</li>
              </ul>

              <h3>10.2 By Us</h3>
              <ul>
                <li>We may terminate accounts for violation of these terms</li>
                <li>30-day notice will be provided for termination without cause</li>
                <li>Immediate termination may occur for serious violations</li>
              </ul>
            </div>

            {/* Section 11 */}
            <div className={styles.termsSection}>
              <h2>11. Governing Law and Disputes</h2>
              <div className={styles.infoBox}>
                <ul style={{ marginBottom: 0, color: 'var(--text-primary)' }}>
                  <li>
                    <strong>Governing Law:</strong> Laws of the European Union and [Your EU Country]
                  </li>
                  <li>
                    <strong>Jurisdiction:</strong> Courts of [Your EU Location]
                  </li>
                  <li>
                    <strong>Language:</strong> English, with translations available upon request
                  </li>
                  <li>
                    <strong>Alternative Dispute Resolution:</strong> EU-approved ADR available
                  </li>
                </ul>
              </div>
            </div>

            {/* Section 12 */}
            <div className={styles.termsSection}>
              <h2>12. Changes to Terms</h2>
              <p>
                We may update these terms periodically. Material changes will be communicated via email and platform
                notification at least 30 days before taking effect. Continued use after changes constitutes acceptance of
                new terms.
              </p>
            </div>

            {/* Section 13 */}
            <div className={styles.termsSection}>
              <h2>13. Contact Information</h2>
              <div className={styles.contactCard}>
                <p style={{ fontWeight: 600, marginBottom: '1rem' }}>For questions about these terms:</p>
                <p style={{ marginBottom: 0 }}>
                  <strong>Becquerel Institute</strong>
                  <br />
                  Email:{' '}
                  <a href="mailto:info@becquerelinstitute.eu" style={{ color: 'var(--becq-gold)' }}>
                    info@becquerelinstitute.eu
                  </a>
                  <br />
                  Support:{' '}
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
              <a href="#" onClick={(e) => { e.preventDefault(); setIsContactOpen(true); }}>
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
