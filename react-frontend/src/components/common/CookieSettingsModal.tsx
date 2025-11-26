/**
 * Cookie Settings Modal
 * Allows users to manage their cookie preferences after initial consent
 */

import { useState, useEffect } from 'react';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import type { CookiePreferences } from '../../hooks/useCookieConsent';
import styles from './CookieConsent.module.css';

interface CookieSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CookieSettingsModal({ isOpen, onClose }: CookieSettingsModalProps) {
  const { preferences, updatePreferences, acceptAll, rejectOptional } = useCookieConsent();
  const [customPrefs, setCustomPrefs] = useState<CookiePreferences>({
    essential: true,
    performance: false,
    functional: false,
  });

  // Sync with current preferences when modal opens
  useEffect(() => {
    if (isOpen && preferences) {
      setCustomPrefs({
        essential: true,
        performance: preferences.performance,
        functional: preferences.functional,
      });
    }
  }, [isOpen, preferences]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    updatePreferences(customPrefs);
    onClose();
  };

  const handleAcceptAll = () => {
    acceptAll();
    onClose();
  };

  const handleRejectOptional = () => {
    rejectOptional();
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.banner}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', margin: 'auto' }}
      >
        <div className={styles.content}>
          <h3 className={styles.title}>Cookie Settings</h3>
          <p className={styles.description}>
            Manage your cookie preferences. Essential cookies cannot be disabled as they are required for the website to function.
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

          {/* Current Status */}
          {preferences && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#64748b'
            }}>
              <strong>Current Settings:</strong> Performance {preferences.performance ? '✓' : '✗'} | Functional {preferences.functional ? '✓' : '✗'}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button onClick={handleRejectOptional} className={styles.btnSecondary}>
            Reject Optional
          </button>
          <button onClick={handleAcceptAll} className={styles.btnSecondary}>
            Accept All
          </button>
          <button onClick={handleSave} className={styles.btnPrimary}>
            Save Preferences
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#64748b',
            padding: '4px 8px',
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
