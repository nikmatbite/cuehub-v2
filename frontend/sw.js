const CACHE_NAME = 'cuehub-v3.1';
const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/pick-mode.html',
  '/pick-players.html',
  '/play.html',
  '/css/style.css',
  '/js/lang.js',
  '/js/api.js',
  '/js/app.js',
  '/js/play.js',
  '/js/dashboard.js',
  '/js/index.js',
  '/js/pick-mode.js',
  '/js/pick-players.js',
  '/js/sw-register.js'
];

// Install: cache semua asset
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate: hapus cache lama
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  // Langsung ambil kontrol tanpa tunggu reload
  return self.clients.claim();
});

// Fetch: cache-first untuk asset lokal, network-first untuk API GAS
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Bypass SW untuk request ke Google Apps Script (GAS) — biarkan network langsung
  if (url.hostname.includes('script.google.com')) {
    return; // tidak intercept, browser handle sendiri
  }

  // Untuk asset lokal: cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;

      // Fetch dengan redirect: 'follow' agar tidak crash saat ada redirect
      return fetch(e.request, { redirect: 'follow' }).then(function(response) {
        // Hanya cache response yang valid (status 200, bukan opaque)
        if (response && response.status === 200 && response.type === 'basic') {
          var toCache = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, toCache);
          });
        }
        return response;
      });
    })
  );
});

// Pesan dari halaman
self.addEventListener('message', function(e) {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});