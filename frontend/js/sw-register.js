(function () {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js').then(function (reg) {

    // Cek update setiap kali halaman dimuat
    reg.update();

    // Ada SW baru menunggu → tampilkan pop-up
    function checkWaiting(reg) {
      if (reg.waiting) {
        showUpdateToast(reg.waiting);
      }
    }

    checkWaiting(reg);

    reg.addEventListener('updatefound', function () {
      var newWorker = reg.installing;
      newWorker.addEventListener('statechange', function () {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateToast(newWorker);
        }
      });
    });

  }).catch(function (err) {
    console.warn('SW register gagal:', err);
  });

  // Reload otomatis setelah SW baru aktif
  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  function showUpdateToast(worker) {
    // Hindari duplikat
    if (document.getElementById('sw-update-toast')) return;

    var toast = document.createElement('div');
    toast.id = 'sw-update-toast';
    toast.innerHTML =
      '<span>🔄 Ada pembaruan tersedia</span>' +
      '<button id="sw-update-btn">Perbarui</button>';

    document.body.appendChild(toast);

    document.getElementById('sw-update-btn').addEventListener('click', function () {
      toast.remove();
      worker.postMessage('SKIP_WAITING');
    });
  }
})();