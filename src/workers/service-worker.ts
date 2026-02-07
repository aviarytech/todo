/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Bump this on breaking changes to force cache invalidation
const CACHE_NAME = 'lisa-v2';

// Install event: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache the main entry point - Vite will handle asset caching via hash URLs
      return cache.addAll(['/']);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event: cache-first for static assets, skip Convex API
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // CRITICAL: Never cache Convex API calls
  if (request.url.includes('convex.cloud')) {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Don't cache hashed assets - Vite's content hashing handles browser caching
  // Caching these causes issues when deployments have interdependent bundles
  if (request.url.includes('/assets/') && /\.[a-f0-9]{8,}\.(js|css)/.test(request.url)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response and update cache in background
        event.waitUntil(
          fetch(request)
            .then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, response);
                });
              }
            })
            .catch(() => {
              // Network failed, but we already returned cached response
            })
        );
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((response) => {
          // Cache successful same-origin responses
          if (response.ok && new URL(request.url).origin === self.location.origin) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed and not in cache
          // For navigation requests, return the cached root page
          if (request.mode === 'navigate') {
            const cachedRoot = await caches.match('/');
            if (cachedRoot) {
              return cachedRoot;
            }
          }
          // For other requests, return a generic offline response
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

export {};
