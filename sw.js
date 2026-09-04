const CACHE_NAME = 'qna-hub-cache-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Skip non-HTTP(S)
  if (!url.protocol.startsWith('http')) return;

  const isHTML = event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html');
  const isData = url.pathname.includes('/data/') || url.pathname.endsWith('.json') || url.pathname.endsWith('.txt') || url.pathname.endsWith('.tsv');

  if (isHTML || isData) {
    // Network First, fallback to cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Stale-While-Revalidate for assets (JS, CSS, fonts, images)
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        }).catch(() => {}); // ignore offline errors for assets
        
        return cachedResponse || fetchPromise;
      })
    );
  }
});
