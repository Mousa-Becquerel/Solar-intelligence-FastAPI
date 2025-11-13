/**
 * Cookie Consent Banner
 * GDPR-compliant cookie consent interface
 */

import { useState } from 'react';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import type { CookiePreferences } from '../../hooks/useCookieConsent';
import styles from './CookieConsent.module.css';

export function CookieConsent() {
  const { showBanner, acceptAll, rejectOptional, updatePreferences } = useCookieConsent();
  const [showCustomize, setShowCustomize] = useState(false);
  const [customPrefs, setCustomPrefs] = useState<CookiePreferences>({
    essential: true,
    performance: false,
    functional: false,
  });

  if (!showBanner) {
    return null;
  }

  const handleCustomize = () => {
    setShowCustomize(true);
  };

  const handleSaveCustom = () => {
    updatePreferences(customPrefs);
    setShowCustomize(false);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.banner}>
        {!showCustomize ? (
          // Simple banner view
          <>
            <div className={styles.content}>
              <h3 className={styles.title}>We use cookies</h3>
              <p className={styles.description}>
                We use cookies to enhance your experience, analyze site traffic, and for performance monitoring.
                By clicking "Accept All", you consent to our use of cookies.{' '}
                <a href="/cookie-policy" className={styles.link}>
                  Learn more
                </a>
              </p>
            </div>
            <div className={styles.actions}>
              <button onClick={rejectOptional} className={styles.btnSecondary}>
                Reject Optional
              </button>
              <button onClick={handleCustomize} className={styles.btnSecondary}>
                Customize
              </button>
              <button onClick={acceptAll} className={styles.btnPrimary}>
                Accept All
              </button>
            </div>
          </>
        ) : (
          // Customize view
          <>
            <div className={styles.content}>
              <h3 className={styles.title}>Customize Cookie Preferences</h3>
              <p className={styles.description}>
                Choose which types of cookies you want to accept. Essential cookies cannot be disabled.
              </p>

              <div className={styles.preferences}>
                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceHeader}>
                    <label className={styles.preferenceLabel}>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className={styles.checkbox}
                      />
                      <span className={styles.preferenceName}>Essential Cookies</span>
                      <span className={styles.required}>Required</span>
                    </label>
                  </div>
                  <p className={styles.preferenceDesc}>
                    Necessary for the website to function. Includes authentication, security, and load balancing.
                  </p>
                </div>

                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceHeader}>
                    <label className={styles.preferenceLabel}>
                      <input
                        type="checkbox"
                        checked={customPrefs.performance}
                        onChange={(e) =>
                          setCustomPrefs({ ...customPrefs, performance: e.target.checked })
                        }
                        className={styles.checkbox}
                      />
                      <span className={styles.preferenceName}>Performance Cookies</span>
                    </label>
                  </div>
                  <p className={styles.preferenceDesc}>
                    Help us monitor application performance, track errors, and improve reliability.
                  </p>
                </div>

                <div className={styles.preferenceItem}>
                  <div className={styles.preferenceHeader}>
                    <label className={styles.preferenceLabel}>
                      <input
                        type="checkbox"
                        checked={customPrefs.functional}
                        onChange={(e) =>
                          setCustomPrefs({ ...customPrefs, functional: e.target.checked })
                        }
                        className={styles.checkbox}
                      />
                      <span className={styles.preferenceName}>Functional Cookies</span>
                    </label>
                  </div>
                  <p className={styles.preferenceDesc}>
                    Remember your preferences and settings for an enhanced experience.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button onClick={() => setShowCustomize(false)} className={styles.btnSecondary}>
                Back
              </button>
              <button onClick={handleSaveCustom} className={styles.btnPrimary}>
                Save Preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
