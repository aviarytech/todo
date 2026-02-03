/**
 * Demo mode utilities.
 * 
 * Demo mode allows using the app without authentication,
 * useful for testing and demonstration purposes.
 */

const DEMO_MODE_KEY = "pooapp_demo_mode";

// Check if demo mode is enabled
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

// Enable demo mode
export function enableDemoMode(): void {
  localStorage.setItem(DEMO_MODE_KEY, "true");
}

// Disable demo mode
export function disableDemoMode(): void {
  localStorage.removeItem(DEMO_MODE_KEY);
}
