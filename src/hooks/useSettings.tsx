/**
 * Hook for managing app settings with reactive updates.
 */

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import {
  getDarkMode,
  setDarkMode as storeDarkMode,
  getListSort,
  setListSort as storeListSort,
  getHapticsEnabled,
  setHapticsEnabled as storeHapticsEnabled,
  getBiometricLockEnabled,
  setBiometricLockEnabled as storeBiometricLockEnabled,
  type SortOption,
} from '../lib/storage';
import { haptic as triggerHaptic } from '../lib/haptics';

interface SettingsContextValue {
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
  listSort: SortOption;
  setListSort: (sort: SortOption) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  biometricLockEnabled: boolean;
  setBiometricLockEnabled: (enabled: boolean) => void;
  haptic: (pattern?: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(() => getDarkMode());
  const [listSort, setListSortState] = useState<SortOption>(() => getListSort());
  const [hapticsEnabled, setHapticsEnabledState] = useState(() => getHapticsEnabled());
  const [biometricLockEnabled, setBiometricLockEnabledState] = useState(() => getBiometricLockEnabled());

  // Listen for system dark mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if no explicit preference is set
      if (localStorage.getItem('pooapp:darkMode') === null) {
        setDarkModeState(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const setDarkMode = useCallback((enabled: boolean) => {
    setDarkModeState(enabled);
    storeDarkMode(enabled);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode);
  }, [darkMode, setDarkMode]);

  const setListSort = useCallback((sort: SortOption) => {
    setListSortState(sort);
    storeListSort(sort);
  }, []);

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    setHapticsEnabledState(enabled);
    storeHapticsEnabled(enabled);
  }, []);

  const setBiometricLockEnabled = useCallback((enabled: boolean) => {
    setBiometricLockEnabledState(enabled);
    storeBiometricLockEnabled(enabled);
  }, []);

  const haptic = useCallback(
    (pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') => {
      if (hapticsEnabled) {
        triggerHaptic(pattern);
      }
    },
    [hapticsEnabled]
  );

  return (
    <SettingsContext.Provider
      value={{
        darkMode,
        setDarkMode,
        toggleDarkMode,
        listSort,
        setListSort,
        hapticsEnabled,
        setHapticsEnabled,
        biometricLockEnabled,
        setBiometricLockEnabled,
        haptic,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
