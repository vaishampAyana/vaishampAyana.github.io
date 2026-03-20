const CACHE_NAME = 'pingala-chandas-v8';

self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/index.html','/style.css','/app.js','/data.json','/manifest.json','/icon-192.png','/icon-512.png'])
    ).catch(()=>{})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if(event.request.method!=='GET') return;
  const url = new URL(event.request.url);
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    event.respondWith(
      caches.match(event.request).then(c=>c||fetch(event.request).then(r=>{
        const clone=r.clone();
        caches.open(CACHE_NAME).then(c=>c.put(event.request,clone));
        return r;
      }))
    );
    return;
  }
  event.respondWith(
    fetch(event.request).then(r=>{
      if(r&&r.status===200){const clone=r.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,clone));}
      return r;
    }).catch(()=>caches.match(event.request))
  );
});
