/**
 * Cookie Consent Hook
 * Manages user cookie preferences in localStorage
 */

import { useState, useEffect } from 'react';

export interface CookiePreferences {
  essential: boolean; // Always true, can't be disabled
  performance: boolean;
  functional: boolean;
}

const STORAGE_KEY = 'cookie-consent-preferences';
const CONSENT_VERSION = '1.0';

export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Load saved preferences from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check if consent version matches
        if (parsed.version === CONSENT_VERSION) {
          setPreferences(parsed.preferences);
          setShowBanner(false);
        } else {
          // Version changed, show banner again
          setShowBanner(true);
        }
      } catch (e) {
        console.error('Failed to parse cookie preferences', e);
        setShowBanner(true);
      }
    } else {
      // No preferences saved, show banner
      setShowBanner(true);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const data = {
      version: CONSENT_VERSION,
      preferences: prefs,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setPreferences(prefs);
    setShowBanner(false);
  };

  const acceptAll = () => {
    savePreferences({
      essential: true,
      performance: true,
      functional: true,
    });
  };

  const rejectOptional = () => {
    savePreferences({
      essential: true,
      performance: false,
      functional: false,
    });
  };

  const updatePreferences = (prefs: Partial<CookiePreferences>) => {
    const newPrefs: CookiePreferences = {
      essential: true, // Always true
      performance: prefs.performance ?? preferences?.performance ?? false,
      functional: prefs.functional ?? preferences?.functional ?? false,
    };
    savePreferences(newPrefs);
  };

  const resetConsent = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPreferences(null);
    setShowBanner(true);
  };

  return {
    preferences,
    showBanner,
    acceptAll,
    rejectOptional,
    updatePreferences,
    resetConsent,
    hasConsented: preferences !== null,
  };
}
