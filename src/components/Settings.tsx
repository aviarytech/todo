/**
 * Settings panel component.
 * Uses Panel for slide-up drawer experience.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';
import { supportsHaptics } from '../lib/haptics';
import { supportsPushNotifications } from '../lib/notifications';
import { biometrics } from '../lib/biometrics';
import { Panel } from './ui/Panel';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { darkMode, toggleDarkMode, hapticsEnabled, setHapticsEnabled, biometricLockEnabled, setBiometricLockEnabled, haptic } = useSettings();
  const { user } = useAuth();
  const {
    permission: notificationPermission,
    isEnabled: notificationsEnabled,
    isLoading: notificationsLoading,
    reminderMinutes,
    toggleNotifications,
    setReminderMinutes,
  } = useNotifications({ userDid: user?.did ?? null });

  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  
  useEffect(() => {
    biometrics.isAvailable().then(setBiometricsAvailable);
  }, []);

  const handleToggle = (current: boolean, setter: (v: boolean) => void) => {
    haptic('light');
    setter(!current);
  };

  const header = (
    <>
      <h2 id="settings-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
        ⚙️ Settings
      </h2>
      <button
        onClick={onClose}
        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Close settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </>
  );

  const footer = (
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
      <button
        onClick={onClose}
        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors"
      >
        Done
      </button>
    </div>
  );

  return (
    <Panel
      isOpen={true}
      onClose={onClose}
      header={header}
      footer={footer}
      ariaLabelledBy="settings-title"
    >
      {/* Settings List */}
      <div className="p-6 space-y-6">
        {/* Appearance Section */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Appearance
          </h3>
          
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{darkMode ? '🌙' : '☀️'}</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {darkMode ? 'Currently in dark mode' : 'Currently in light mode'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle(darkMode, toggleDarkMode)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                darkMode ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={darkMode}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                  darkMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Accessibility Section */}
        {supportsHaptics() && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Accessibility
            </h3>
            
            {/* Haptic Feedback Toggle */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">📳</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Haptic Feedback</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Vibrate on interactions
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(hapticsEnabled, setHapticsEnabled)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  hapticsEnabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={hapticsEnabled}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    hapticsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>
        )}

        {/* Security Section */}
        {biometricsAvailable && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Security
            </h3>
            
            {/* Biometric Lock Toggle */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">🔒</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">App Lock</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Require Face ID / fingerprint on launch
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(biometricLockEnabled, setBiometricLockEnabled)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  biometricLockEnabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={biometricLockEnabled}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    biometricLockEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>
        )}

        {/* Notifications Section */}
        {supportsPushNotifications() && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Notifications
            </h3>
            
            {/* Push Notifications Toggle */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">🔔</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Push Notifications</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {notificationPermission === 'denied' 
                      ? 'Blocked in browser settings'
                      : notificationsEnabled 
                        ? 'Get notified when items are due' 
                        : 'Enable notifications for due dates'}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  haptic('light');
                  await toggleNotifications();
                }}
                disabled={notificationsLoading || notificationPermission === 'denied'}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                } ${notificationsLoading || notificationPermission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={notificationsEnabled}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Reminder Time */}
            {notificationsEnabled && (
              <div className="py-3">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl leading-none">⏰</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Reminder Time</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      How early to remind you before due date
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-11">
                  {[
                    { value: 15, label: '15m' },
                    { value: 30, label: '30m' },
                    { value: 60, label: '1h' },
                    { value: 120, label: '2h' },
                    { value: 1440, label: '1d' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => {
                        haptic('light');
                        setReminderMinutes(value);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        reminderMinutes === value
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Account Section */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Account
          </h3>
          
          <Link
            to="/profile"
            onClick={() => {
              haptic('light');
              onClose();
            }}
            className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">👤</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Your Profile</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View stats and account details
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        {/* About Section */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            About
          </h3>
          
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl leading-none">💩</span>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">Poo App</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Version 1.0.0</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Organize your life while you poop. Powered by Originals Protocol.
            </p>
          </div>
        </section>
      </div>
    </Panel>
  );
}
