/**
 * Haptic feedback utilities for mobile devices.
 * Falls back gracefully on unsupported devices.
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  error: [50, 30, 50, 30, 50],
  warning: [30, 50, 30],
};

/**
 * Trigger haptic feedback on supported devices.
 * Uses the Vibration API where available.
 */
export function haptic(pattern: HapticPattern = 'light'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) {
    return;
  }
  
  try {
    navigator.vibrate(patterns[pattern]);
  } catch {
    // Ignore errors - haptics are non-essential
  }
}

/**
 * Check if haptic feedback is available.
 */
export function supportsHaptics(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}
