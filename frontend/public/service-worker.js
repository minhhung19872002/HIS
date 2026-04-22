// HIS PWA Service Worker — Sprint 5 Item 2.19
// Network-first for API, cache-first for static assets.

const CACHE_NAME = 'his-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls or WebSocket - always network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/hubs/')) {
    event.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({ message: 'Offline: cần kết nối mạng để gọi API' }),
      { headers: { 'Content-Type': 'application/json' }, status: 503 }
    )));
    return;
  }

  // Cache-first for static assets
  if (request.method === 'GET' && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf')
  )) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Default: network then cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then(r => r || new Response('Offline', { status: 503 })))
  );
});
