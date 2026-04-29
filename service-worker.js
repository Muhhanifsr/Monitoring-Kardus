/**
 * StockMonitor Pro — Service Worker
 * PWA Caching Strategy:
 *  - Static assets (HTML, CSS, JS, icons, fonts) → Cache First
 *  - Google Fonts / Font Awesome CDN              → Stale While Revalidate
 *  - Google Apps Script API calls                 → Network First (no cache)
 */

const CACHE_NAME    = 'stockmonitor-v1.4';
const STATIC_ASSETS = [
  '/Monitoring-Kardus/',
  '/Monitoring-Kardus/index.html',
  '/Monitoring-Kardus/manifest.json',
  '/Monitoring-Kardus/css/bootstrap.min.css',
  '/Monitoring-Kardus/css/custom.css',
  '/Monitoring-Kardus/js/bootstrap.bundle.min.js',
  '/Monitoring-Kardus/js/app.js',
  '/Monitoring-Kardus/icons/icon-192.png',
  '/Monitoring-Kardus/icons/icon-512.png',
  '/Monitoring-Kardus/icons/apple-touch-icon.png',
  '/Monitoring-Kardus/icons/favicon-32.png',
  '/Monitoring-Kardus/PT.-Inti-Pantja-Press-Industri.webp',
  '/Monitoring-Kardus/thumb_ippi-removebg-preview.png',
];

const CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] Pre-caching static assets...');
        await Promise.allSettled(
          STATIC_ASSETS.map(async (asset) => {
            const response = await fetch(asset, { cache: 'no-cache' });
            if (response.ok) {
              await cache.put(asset, response);
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // 1. Google Apps Script API → Network First, no cache
  if (url.hostname === 'script.google.com') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 2. CDN (Fonts, Font Awesome) → Stale While Revalidate
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 3. Same-origin static assets → Cache First
  if (url.origin === location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 4. Everything else → Network with fallback
  event.respondWith(networkFirst(request));
});

// ─── Strategy: Cache First ───────────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback: serve index.html for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/Monitoring-Kardus/index.html');
    }
    return new Response('Offline – resource not available', { status: 503 });
  }
}

// ─── Strategy: Network First ─────────────────────────────────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match('/Monitoring-Kardus/index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

// ─── Strategy: Stale While Revalidate ────────────────────────────────────────
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}
