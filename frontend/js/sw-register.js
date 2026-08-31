(function () {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then(function (reg) {
      // Paksa cek update setiap buka halaman
      reg.update();
    })
    .catch(function (err) {
      console.warn('SW register gagal:', err);
    });
})();