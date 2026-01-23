/**
 * Migration utility functions for tracking migration state.
 */

/** Key for tracking if user has dismissed the migration prompt this session */
const MIGRATION_DISMISSED_KEY = "lisa-migration-dismissed";

/**
 * Check if user has dismissed migration prompt this session
 */
export function hasDismissedMigration(): boolean {
  try {
    return sessionStorage.getItem(MIGRATION_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Mark migration prompt as dismissed for this session
 */
export function dismissMigration(): void {
  try {
    sessionStorage.setItem(MIGRATION_DISMISSED_KEY, "true");
  } catch {
    // Ignore storage errors
  }
}
