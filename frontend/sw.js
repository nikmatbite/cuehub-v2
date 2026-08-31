const CACHE_NAME = 'cuehub-v5.5';
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

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // langsung aktif, tidak tunggu tab lama ditutup
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim(); // langsung kontrol semua tab
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Bypass SW untuk API Google dan request non-GET
  if (url.hostname.includes('script.google.com')) {
    e.respondWith(fetch(e.request));
    return;
  }
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      // Pakai redirect: 'follow' supaya SW bisa ikuti redirect dari server
      return fetch(e.request, { redirect: 'follow' });
    })
  );
});