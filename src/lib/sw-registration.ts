/**
 * Service Worker Registration Helper
 *
 * Handles registration, updates, and lifecycle events for the service worker.
 */

export interface SWRegistrationConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export async function registerServiceWorker(
  config: SWRegistrationConfig = {}
): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return undefined;
  }

  // Only register in production or when explicitly testing
  // In development, SW can interfere with hot reloading
  if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_SW) {
    console.log('Service worker disabled in development');
    return undefined;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Check for updates periodically
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            console.log('New service worker available');
            config.onUpdate?.(registration);
          } else {
            // First install
            console.log('Service worker installed');
            config.onSuccess?.(registration);
          }
        }
      });
    });

    // Log current SW state
    if (registration.active) {
      console.log('Service worker active');
    }

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    config.onError?.(error as Error);
    return undefined;
  }
}

/**
 * Unregister all service workers
 * Useful for debugging or when you need to clear SW state
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    if (success) {
      console.log('Service worker unregistered');
    }
    return success;
  } catch (error) {
    console.error('Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Skip waiting and activate new service worker immediately
 */
export function skipWaitingAndReload(): void {
  navigator.serviceWorker.controller?.postMessage('skipWaiting');
  window.location.reload();
}
