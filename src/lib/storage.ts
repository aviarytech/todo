/**
 * Local storage utilities for app settings.
 * 
 * NOTE: These functions currently use localStorage directly (synchronous).
 * For native platform support, use storageAdapter.ts instead, which provides
 * an async interface that works with both Capacitor Preferences (native) and
 * localStorage (web). These functions will be migrated to async in a future update.
 */

const STORAGE_KEYS = {
  DARK_MODE: 'pooapp:darkMode',
  LIST_SORT: 'pooapp:listSort',
  HAPTICS_ENABLED: 'pooapp:hapticsEnabled',
  ONBOARDING_COMPLETE: 'pooapp:onboardingComplete',
  NOTIFICATIONS_ENABLED: 'pooapp:notificationsEnabled',
  REMINDER_MINUTES: 'pooapp:reminderMinutes',
} as const;

export type SortOption = 'name-asc' | 'name-desc' | 'newest' | 'oldest';

/**
 * Get dark mode preference.
 * 
 * TODO: Migrate to async storageAdapter for native support
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
 * 
 * TODO: Migrate to async storageAdapter for native support
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
 * 
 * TODO: Migrate to async storageAdapter for native support
 */
export function getListSort(): SortOption {
  if (typeof window === 'undefined') return 'newest';
  return (localStorage.getItem(STORAGE_KEYS.LIST_SORT) as SortOption) || 'newest';
}

/**
 * Set list sort preference.
 * 
 * TODO: Migrate to async storageAdapter for native support
 */
export function setListSort(sort: SortOption): void {
  localStorage.setItem(STORAGE_KEYS.LIST_SORT, sort);
}

/**
 * Get haptics enabled preference.
 * 
 * TODO: Migrate to async storageAdapter for native support
 */
export function getHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEYS.HAPTICS_ENABLED);
  return stored !== 'false'; // Default to enabled
}

/**
 * Set haptics enabled preference.
 * 
 * TODO: Migrate to async storageAdapter for native support
 */
export function setHapticsEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.HAPTICS_ENABLED, String(enabled));
}

/**
 * Check if onboarding has been completed.
 * 
 * TODO: Migrate to async storageAdapter for native support
 */
export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';
}

/**
 * Mark onboarding as complete.
 * 
 * TODO: Migrate to async storageAdapter for native support
 */
export function completeOnboarding(): void {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
}

/**
 * Get notifications enabled preference.
 * 
 * TODO: Migrate to async storageAdapter for native support
 */
export function getNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
  return stored === 'true';
}

/**
 * Set notifications enabled preference.
 * 
 * TODO: Migrate to async storageAdapter for native support
 */
export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, String(enabled));
}

/**
 * Get reminder time in minutes before due date.
 * 
 * TODO: Migrate to async storageAdapter for native support
 */
export function getReminderMinutes(): number {
  if (typeof window === 'undefined') return 60;
  const stored = localStorage.getItem(STORAGE_KEYS.REMINDER_MINUTES);
  return stored ? parseInt(stored, 10) : 60;
}

/**
 * Set reminder time in minutes before due date.
 * 
 * TODO: Migrate to async storageAdapter for native support
 */
export function setReminderMinutes(minutes: number): void {
  localStorage.setItem(STORAGE_KEYS.REMINDER_MINUTES, String(minutes));
}
