const CACHE_NAME = 'qna-hub-cache-v3';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './data/manifest.json',
  './data/GIT-Enhanced.json',
  './data/Cardio-1.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW] Precache notice (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
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

  // Skip chrome-extension and unsupported schemes
  if (!url.protocol.startsWith('http')) return;

  const isNavigation = event.request.mode === 'navigate';
  const isHTML = isNavigation || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));
  const isData = url.pathname.includes('/data/') || url.pathname.endsWith('.json') || url.pathname.endsWith('.txt') || url.pathname.endsWith('.tsv');

  if (isHTML) {
    // Navigation / HTML: Network-first, fallback to exact cached request, then fallback to cached index.html
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            try {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
            } catch {}
          }
          return response;
        })
        .catch(async () => {
          const matched = await caches.match(event.request);
          if (matched) return matched;
          const fallbackIndex = (await caches.match('./index.html')) || (await caches.match('./')) || (await caches.match('/index.html'));
          if (fallbackIndex) return fallbackIndex;
          return new Response('Offline — QnA Hub shell cached', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
  } else if (isData) {
    // Data files: Network-first, fallback to cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            try {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
            } catch {}
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          // Try matching filename alone in cache
          const fname = url.pathname.split('/').pop();
          if (fname) {
            try {
              const keys = await (await caches.open(CACHE_NAME)).keys();
              for (const req of keys) {
                if (req.url.endsWith(fname)) {
                  return caches.match(req);
                }
              }
            } catch {}
          }
          return new Response('[]', { status: 404, headers: { 'Content-Type': 'application/json' } });
        })
    );
  } else {
    // Static assets (JS, CSS, fonts, icons): Stale-While-Revalidate with safe synchronous clone
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              try {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
              } catch {}
            }
            return networkResponse;
          })
          .catch(() => {});

        return cachedResponse || fetchPromise;
      })
    );
  }
});
