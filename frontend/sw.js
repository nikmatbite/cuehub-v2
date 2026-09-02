// CueHub v2 — Service Worker (installable only, no offline cache)
const CACHE_NAME = 'cuehub-v2-shell';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  // Hapus semua cache lama
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Semua request langsung ke network — tidak ada cache intercept
self.addEventListener('fetch', function(e) {
  // Biarkan browser handle sendiri (tidak intercept apapun)
  return;
});
