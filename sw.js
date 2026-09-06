// Lyric Vault Workspace — lightweight service worker
// Caches the app shell so the PWA loads fast and works offline on mobile.
// Note: this file must be hosted alongside lyrics_app.html (same folder,
// same origin) for the browser to allow it to control that page.

const CACHE_NAME = 'lyric-vault-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache the page itself (the request that registered this worker)
      // plus the origin root, so a repeat visit works offline.
      return cache.addAll([
        './',
        './lyrics_app.html'
      ]).catch(() => {
        // If one of the guesses above 404s (e.g. different filename),
        // fall back to just caching whatever page is currently open.
        return caches.open(CACHE_NAME).then((c) =>
          c.add(self.location.href.replace('sw.js', ''))
        );
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache-first for the app shell, falling back to network, so the app
// keeps working when the phone loses signal. Anything not yet cached
// is fetched normally and stashed for next time.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline and not cached: nothing we can do
    })
  );
});
