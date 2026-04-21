/**
 * Cookie consent banner for GDPR compliance.
 * Shown on first visit; persists accept/decline in localStorage.
 * On accept, initializes PostHog analytics. On decline, analytics stays off.
 */

import { useState, useEffect } from 'react';
import { initAnalytics } from '../lib/analytics';

const CONSENT_KEY = 'poo-cookie-consent';

type ConsentState = 'accepted' | 'declined' | null;

function getStoredConsent(): ConsentState {
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === 'accepted' || val === 'declined') return val;
  } catch {
    // ignore
  }
  return null;
}

function storeConsent(value: 'accepted' | 'declined') {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // ignore
  }
}

/** Call this at startup to init analytics if the user previously accepted. */
export function initAnalyticsIfConsented(): void {
  if (getStoredConsent() === 'accepted') {
    initAnalytics();
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getStoredConsent() === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    storeConsent('accepted');
    initAnalytics();
    setVisible(false);
  };

  const handleDecline = () => {
    storeConsent('declined');
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-inset-bottom"
    >
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl leading-none mt-0.5">🍪</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Cookies & Analytics
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We use PostHog to understand how you use boop so we can make it better.
              No data is sold or shared with third parties.{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-amber-600 dark:text-amber-400 hover:text-amber-700"
              >
                Privacy policy
              </a>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
