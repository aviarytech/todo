/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Bump this on breaking changes to force cache invalidation
const CACHE_NAME = 'lisa-v3';

// Install event: activate immediately without caching anything
// Fresh HTML is fetched on every navigation to avoid stale asset references
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting());
});

// Activate event: clean up ALL old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete all old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim(),
    ])
  );
});

// Fetch event: network-first for navigation, cache static assets carefully
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // CRITICAL: Never intercept Convex API calls
  if (request.url.includes('convex.cloud')) {
    return;
  }

  // CRITICAL: Never cache hashed assets - let browser handle them
  // These have content hashes and immutable caching headers from the CDN
  if (url.pathname.startsWith('/assets/') && /[-\.][a-f0-9]{8,}\.(js|css|woff2?)$/.test(url.pathname)) {
    return;
  }

  // Navigation requests (HTML pages): NETWORK-FIRST
  // This is critical to avoid serving stale HTML that references old asset hashes
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses for offline fallback
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed - try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fall back to root for SPA routing
          const cachedRoot = await caches.match('/');
          if (cachedRoot) {
            return cachedRoot;
          }
          // Ultimate fallback
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // Static assets (images, fonts, etc): cache-first for same-origin only
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: just fetch normally
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCaches') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || '💩 Poo App';
    const options = {
      body: data.body || 'You have a notification',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || 'poo-notification',
      data: {
        url: data.url || '/',
        itemId: data.itemId,
        listId: data.listId,
      },
      requireInteraction: data.requireInteraction || false,
      vibrate: [100, 50, 100],
    } as NotificationOptions & { vibrate?: number[] };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // Fallback for plain text push
    const body = event.data.text();
    event.waitUntil(
      self.registration.showNotification('💩 Poo App', {
        body,
        icon: '/pwa-192x192.png',
      })
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            (client as WindowClient).navigate(urlToOpen);
          }
          return;
        }
      }
      // Open a new window if none exists
      return self.clients.openWindow(urlToOpen);
    })
  );
});

export {};
