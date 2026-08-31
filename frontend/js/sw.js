const CACHE_NAME = 'cuehub-v1';
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
  '/js/pick-players.js'
];

// Install: cache semua asset
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  // Jangan skipWaiting di sini — tunggu user konfirmasi
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
});

// Fetch: serve dari cache, fallback ke network
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    })
  );
});

// Pesan dari halaman
self.addEventListener('message', function(e) {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});