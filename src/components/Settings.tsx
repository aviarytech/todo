/**
 * Settings modal/page component.
 */

import { useSettings } from '../hooks/useSettings';
import { supportsHaptics } from '../lib/haptics';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { darkMode, toggleDarkMode, hapticsEnabled, setHapticsEnabled, haptic } = useSettings();
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose });

  const handleToggle = (current: boolean, setter: (v: boolean) => void) => {
    haptic('light');
    setter(!current);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
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
        </div>

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
                <span className="text-2xl">{darkMode ? '🌙' : '☀️'}</span>
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
                  <span className="text-2xl">📳</span>
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

          {/* About Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              About
            </h3>
            
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">💩</span>
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">PooApp</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Version 1.0.0</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Organize your life while you poop. Powered by Originals Protocol.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
