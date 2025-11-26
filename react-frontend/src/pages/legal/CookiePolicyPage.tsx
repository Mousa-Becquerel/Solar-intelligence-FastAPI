/**
 * CookiePolicyPage Component
 * GDPR-compliant cookie policy for Solar Intelligence platform
 */

import { useState } from 'react';
import { ContactWidget } from '../../components/landing/ContactWidget';
import { CookieSettingsModal } from '../../components/common/CookieSettingsModal';
import styles from './LegalPage.module.css';

export function CookiePolicyPage() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [showCookieSettings, setShowCookieSettings] = useState(false);

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
              <h1>Cookie Policy</h1>
              <p>How we use cookies and similar technologies to enhance your experience</p>
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
              <h2>1. Introduction</h2>
              <p>
                Solar Intelligence ("we", "us", or "our") uses cookies and similar tracking technologies to provide,
                protect, and improve our services. This Cookie Policy explains what these technologies are, why we
                use them, and your choices regarding their use.
              </p>
              <p>
                This policy is part of our <a href="/privacy-policy" style={{ color: 'var(--becq-blue)', textDecoration: 'underline' }}>Privacy Policy</a> and
                complies with the EU General Data Protection Regulation (GDPR) and ePrivacy Directive.
              </p>
            </div>

            {/* Section 2 */}
            <div className={styles.termsSection}>
              <h2>2. What Are Cookies?</h2>
              <p>
                Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when
                you visit a website. They are widely used to make websites work more efficiently and provide
                information to website owners.
              </p>
              <div className={styles.infoBox}>
                <p style={{ marginBottom: 0 }}>
                  <strong>Types of Cookies We Use:</strong>
                </p>
                <ul style={{ marginBottom: 0 }}>
                  <li><strong>Session Cookies:</strong> Temporary cookies that expire when you close your browser</li>
                  <li><strong>Persistent Cookies:</strong> Cookies that remain on your device for a set period or until you delete them</li>
                  <li><strong>First-Party Cookies:</strong> Set by Solar Intelligence directly</li>
                  <li><strong>Third-Party Cookies:</strong> Set by external services we use (e.g., analytics providers)</li>
                </ul>
              </div>
            </div>

            {/* Section 3 */}
            <div className={styles.termsSection}>
              <h2>3. Cookies We Use</h2>

              <h3>3.1 Essential Cookies (Always Active)</h3>
              <p>
                These cookies are necessary for the website to function properly and cannot be disabled in our
                systems. They are usually only set in response to actions you make such as logging in, setting
                your privacy preferences, or filling in forms.
              </p>
              <div className={styles.highlightBox}>
                <ul style={{ marginBottom: 0 }}>
                  <li><strong>Authentication Cookies:</strong> Keep you logged in and secure your session</li>
                  <li><strong>Security Cookies:</strong> Protect against fraudulent activity and enhance security</li>
                  <li><strong>Load Balancing:</strong> Distribute user load across our servers</li>
                  <li><strong>Cookie Consent:</strong> Remember your cookie preferences</li>
                </ul>
              </div>

              <h3>3.2 Performance Cookies (Optional)</h3>
              <p>
                These cookies help us monitor and improve the performance and reliability of our application.
              </p>
              <ul>
                <li><strong>Logfire Monitoring:</strong> Tracks application performance, errors, and API response times</li>
                <li><strong>Performance Metrics:</strong> Measures page load times and technical performance</li>
                <li><strong>Error Tracking:</strong> Helps us identify and fix technical issues</li>
              </ul>

              <h3>3.3 Functional Cookies (Optional)</h3>
              <p>
                These cookies enable enhanced functionality and personalization, such as remembering your
                preferences and choices.
              </p>
              <ul>
                <li><strong>Preference Cookies:</strong> Remember your settings (language, region, dashboard layout)</li>
                <li><strong>User Interface State:</strong> Remember sidebar state, theme preferences, and display options</li>
                <li><strong>Recent Searches:</strong> Store your recent agent queries for quick access</li>
              </ul>

              <h3>3.4 Targeting/Advertising Cookies (Optional)</h3>
              <p>
                We do not currently use advertising cookies. If we introduce them in the future, we will
                update this policy and obtain your explicit consent.
              </p>
            </div>

            {/* Section 4 */}
            <div className={styles.termsSection}>
              <h2>4. Third-Party Services</h2>
              <p>
                We use the following third-party services that process your data:
              </p>

              <h3>4.1 OpenAI API</h3>
              <ul>
                <li><strong>Purpose:</strong> Powers our AI-driven market intelligence agents (Marcus, Nina, Finn, etc.)</li>
                <li><strong>Data Processed:</strong> Your queries and conversation history with the AI agents</li>
                <li><strong>Privacy Policy:</strong> <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--becq-blue)', textDecoration: 'underline' }}>OpenAI Privacy Policy</a></li>
                <li><strong>Note:</strong> Your data is not used by OpenAI for model training</li>
              </ul>

              <h3>4.2 Logfire (Pydantic)</h3>
              <ul>
                <li><strong>Purpose:</strong> Application monitoring, logging, and performance tracking</li>
                <li><strong>Data Processed:</strong> Application logs, error traces, and performance metrics</li>
                <li><strong>Privacy Policy:</strong> <a href="https://pydantic.dev/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--becq-blue)', textDecoration: 'underline' }}>Pydantic Privacy Policy</a></li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className={styles.termsSection}>
              <h2>5. Your Cookie Choices</h2>
              <p>
                You have several options to manage or disable cookies:
              </p>

              <h3>5.1 Cookie Consent Manager</h3>
              <div className={styles.highlightBox}>
                <p>
                  When you first visit Solar Intelligence, we display a cookie consent banner allowing you to:
                </p>
                <ul style={{ marginBottom: 0 }}>
                  <li>Accept all cookies</li>
                  <li>Reject optional cookies (only essential cookies will be used)</li>
                  <li>Customize your preferences for each cookie category</li>
                </ul>
              </div>
              <p>
                You can change your cookie preferences at any time by clicking the "Cookie Settings" link in
                our website footer or by visiting your account settings.
              </p>

              <h3>5.2 Browser Settings</h3>
              <p>
                Most web browsers allow you to control cookies through their settings. You can:
              </p>
              <ul>
                <li>Block all cookies</li>
                <li>Block third-party cookies only</li>
                <li>Delete cookies when you close your browser</li>
                <li>Receive a notification before a cookie is stored</li>
              </ul>
              <p>
                Learn how to manage cookies in popular browsers:
              </p>
              <ul>
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--becq-blue)', textDecoration: 'underline' }}>Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--becq-blue)', textDecoration: 'underline' }}>Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--becq-blue)', textDecoration: 'underline' }}>Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--becq-blue)', textDecoration: 'underline' }}>Microsoft Edge</a></li>
              </ul>

              <div className={styles.warningBox}>
                <p style={{ marginBottom: 0 }}>
                  <strong>⚠️ Note:</strong> Blocking or deleting cookies may affect your experience on our website.
                  Some features may not work properly without cookies, such as staying logged in or saving your preferences.
                </p>
              </div>

              <h3>5.3 Do Not Track (DNT)</h3>
              <p>
                We respect the "Do Not Track" (DNT) browser setting. When DNT is enabled, we will not use
                optional tracking cookies unless you explicitly consent to them.
              </p>
            </div>

            {/* Section 6 */}
            <div className={styles.termsSection}>
              <h2>6. Cookie Retention</h2>
              <p>
                Different cookies have different retention periods:
              </p>
              <ul>
                <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
                <li><strong>Authentication Cookies (JWT):</strong> Expire after 30 days of inactivity or when you log out</li>
                <li><strong>Preference Cookies:</strong> Stored for up to 1 year</li>
                <li><strong>Performance Monitoring:</strong> Log data retained according to Logfire retention policy</li>
                <li><strong>Consent Cookies:</strong> Stored for 1 year or until you change your preferences</li>
              </ul>
            </div>

            {/* Section 7 */}
            <div className={styles.termsSection}>
              <h2>7. Local Storage and Similar Technologies</h2>
              <p>
                In addition to cookies, we use HTML5 Local Storage and Session Storage to improve performance
                and user experience. These technologies work similarly to cookies but can store more data.
              </p>

              <h3>We Use Local Storage For:</h3>
              <ul>
                <li>Caching frequently accessed data to reduce server load</li>
                <li>Storing user interface state between sessions</li>
                <li>Temporarily storing draft queries or unsent messages</li>
                <li>Saving chart/visualization preferences</li>
              </ul>

              <p>
                You can clear local storage through your browser's developer tools or privacy settings. This
                does not affect your account data stored on our servers.
              </p>
            </div>

            {/* Section 8 */}
            <div className={styles.termsSection}>
              <h2>8. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in technology, legislation,
                our operations, or other reasons. We will notify you of any material changes by:
              </p>
              <ul>
                <li>Posting the updated policy on this page with a new "Last Updated" date</li>
                <li>Displaying a notification when you next visit our website</li>
                <li>Sending an email notification if you have an account</li>
              </ul>
              <p>
                We encourage you to review this policy periodically to stay informed about how we use cookies.
              </p>
            </div>

            {/* Section 9 */}
            <div className={styles.termsSection}>
              <h2>9. Your GDPR Rights</h2>
              <p>
                Under the GDPR, you have the following rights regarding cookies and tracking:
              </p>
              <div className={styles.rightsGrid}>
                <div className={styles.rightCard}>
                  <h4>🔒 Right to Consent</h4>
                  <p>You have the right to give or withdraw consent for non-essential cookies at any time</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>📋 Right to Information</h4>
                  <p>You have the right to know what cookies are being used and for what purpose</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>🗑️ Right to Deletion</h4>
                  <p>You can request deletion of data collected through cookies at any time</p>
                </div>
                <div className={styles.rightCard}>
                  <h4>⚙️ Right to Control</h4>
                  <p>You can manage your cookie preferences through our cookie settings interface</p>
                </div>
              </div>
            </div>

            {/* Section 10 */}
            <div className={styles.termsSection}>
              <h2>10. Contact Us</h2>
              <p>
                If you have questions about our use of cookies or this Cookie Policy, please contact us:
              </p>
              <div className={styles.contactCard}>
                <p>
                  You can use our <button
                    onClick={() => setIsContactOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--becq-gold)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      font: 'inherit',
                      padding: 0
                    }}
                  >
                    Contact Form
                  </button> for privacy-related inquiries, or visit the{' '}
                  <a
                    href="https://www.becquerelinstitute.eu/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--becq-gold)' }}
                  >
                    Becquerel Institute website
                  </a>{' '}
                  for contact information.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              <a href="/privacy-policy" className={`${styles.btn} ${styles.btnSecondary}`}>
                View Privacy Policy
              </a>
              <a href="/terms-of-service" className={`${styles.btn} ${styles.btnSecondary}`}>
                View Terms of Service
              </a>
              <button
                onClick={() => {/* TODO: Implement cookie settings modal */}}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                Manage Cookie Settings
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerLinks}>
              <a href="/">Home</a>
              <a href="/privacy-policy">Privacy Policy</a>
              <a href="/terms-of-service">Terms of Service</a>
              <a href="/cookie-policy">Cookie Policy</a>
            </div>
            <div className={styles.copyright}>
              <p>© 2025 Solar Intelligence. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Widget */}
      {isContactOpen && (
        <ContactWidget onClose={() => setIsContactOpen(false)} />
      )}
    </div>
  );
}
