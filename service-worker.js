// Service Worker — Piṅgala Chandaḥśāstram PWA
// Strategy: Network-first for HTML, Cache-first for fonts

const CACHE_NAME = 'pingala-chandas-v3'; // increment to bust old cache

// On install — cache core files
self.addEventListener('install', event => {
  self.skipWaiting(); // activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/manifest.json', '/icon-192.png', '/icon-512.png'])
    )
  );
});

// On activate — delete ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - index.html → NETWORK FIRST (always get fresh version)
// - Google Fonts → cache first
// - Everything else → network first
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Google Fonts — cache first (they never change)
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    event.respondWith(
      caches.match(event.request).then(cached => cached ||
        fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Everything else (including index.html) — NETWORK FIRST
  event.respondWith(
    fetch(event.request)
      .then(res => {
        // Cache the fresh response
        if(res && res.status === 200){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request)) // fallback to cache if offline
  );
});
