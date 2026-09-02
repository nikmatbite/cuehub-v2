(function () {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then(function(reg) { reg.update(); })
    .catch(function(err) { console.warn('SW register gagal:', err); });
})();
