/**
 * Local storage utilities for app settings.
 */

const STORAGE_KEYS = {
  DARK_MODE: 'pooapp:darkMode',
  LIST_SORT: 'pooapp:listSort',
  HAPTICS_ENABLED: 'pooapp:hapticsEnabled',
  ONBOARDING_COMPLETE: 'pooapp:onboardingComplete',
} as const;

export type SortOption = 'name-asc' | 'name-desc' | 'newest' | 'oldest';

/**
 * Get dark mode preference.
 */
export function getDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
  if (stored !== null) return stored === 'true';
  // Default to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Set dark mode preference.
 */
export function setDarkMode(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(enabled));
  // Update document class for Tailwind dark mode
  if (enabled) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Initialize dark mode from storage.
 */
export function initDarkMode(): void {
  if (getDarkMode()) {
    document.documentElement.classList.add('dark');
  }
}

/**
 * Get list sort preference.
 */
export function getListSort(): SortOption {
  if (typeof window === 'undefined') return 'newest';
  return (localStorage.getItem(STORAGE_KEYS.LIST_SORT) as SortOption) || 'newest';
}

/**
 * Set list sort preference.
 */
export function setListSort(sort: SortOption): void {
  localStorage.setItem(STORAGE_KEYS.LIST_SORT, sort);
}

/**
 * Get haptics enabled preference.
 */
export function getHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEYS.HAPTICS_ENABLED);
  return stored !== 'false'; // Default to enabled
}

/**
 * Set haptics enabled preference.
 */
export function setHapticsEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.HAPTICS_ENABLED, String(enabled));
}

/**
 * Check if onboarding has been completed.
 */
export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';
}

/**
 * Mark onboarding as complete.
 */
export function completeOnboarding(): void {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
}
