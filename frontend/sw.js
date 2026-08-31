const CACHE_NAME = 'cuehub-v3.2';

// Install — langsung skipWaiting, tidak cache dulu
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

// Activate — hapus semua cache lama, langsung claim
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — network-first untuk semua asset lokal
// Cache hanya sebagai fallback offline
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Skip: bukan GET, atau request ke luar domain (GAS, CDN, dll)
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request).then(function(response) {
      // Simpan ke cache sebagai fallback offline
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Offline — ambil dari cache
      return caches.match(e.request);
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});