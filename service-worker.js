const CACHE_NAME = ‘pingala-chandas-v6’;

// When user taps “Update” — skip waiting and activate immediately
self.addEventListener(‘message’, event => {
if(event.data?.type === ‘SKIP_WAITING’) self.skipWaiting();
});

self.addEventListener(‘install’, event => {
// Do NOT skipWaiting automatically — wait for user to tap update
event.waitUntil(
caches.open(CACHE_NAME).then(cache =>
cache.addAll([’/manifest.json’, ‘/icon-192.png’, ‘/icon-512.png’])
)
);
});

self.addEventListener(‘activate’, event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
).then(() => self.clients.claim())
);
});

self.addEventListener(‘fetch’, event => {
if(event.request.method !== ‘GET’) return;
const url = new URL(event.request.url);

// Fonts — cache first
if(url.hostname === ‘fonts.googleapis.com’ || url.hostname === ‘fonts.gstatic.com’){
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

// Everything else — network first, cache fallback
event.respondWith(
fetch(event.request)
.then(res => {
if(res && res.status === 200){
const clone = res.clone();
caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
}
return res;
})
.catch(() => caches.match(event.request))
);
});
