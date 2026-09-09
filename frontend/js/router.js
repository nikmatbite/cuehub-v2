// =============================================================
// CueHub v3 — router.js
// SPA router berbasis hash (#/route)
// Semua navigasi lewat router.go() — tidak ada window.location langsung
// =============================================================

var router = (function() {
  var _routes = {};
  var _currentRoute = null;
  var _beforeEach = null; // guard function

  return {
    // Daftarkan route: router.on('login', PageLogin.render)
    on: function(name, handler) {
      _routes[name] = handler;
    },

    // Pasang global guard (misal: redirect ke login kalau belum auth)
    beforeEach: function(fn) {
      _beforeEach = fn;
    },

    // Navigasi ke route
    go: function(name, params) {
      window.location.hash = '#/' + name;
      _navigate(name, params);
    },

    // Replace route tanpa tambah history
    replace: function(name, params) {
      window.location.replace('#/' + name);
      _navigate(name, params);
    },

    // Init — panggil sekali saat app load
    init: function() {
      window.addEventListener('hashchange', function() {
        var name = _getHashRoute();
        _navigate(name);
      });
      // Handle load awal
      var initial = _getHashRoute();
      _navigate(initial || 'login');
    },

    current: function() {
      return _currentRoute;
    }
  };

  function _getHashRoute() {
    var hash = window.location.hash; // '#/dashboard'
    if (!hash || hash === '#') return 'login';
    return hash.replace('#/', '').split('?')[0];
  }

  function _navigate(name, params) {
    // Guard
    if (_beforeEach) {
      var allowed = _beforeEach(name);
      if (allowed !== true && allowed !== undefined) {
        _navigate(allowed);
        window.location.replace('#/' + allowed);
        return;
      }
    }

    var handler = _routes[name];
    if (!handler) {
      handler = _routes['404'] || function() {
        document.getElementById('app').innerHTML =
          '<div class="text-center p-5"><h2>404</h2><p>Halaman tidak ditemukan</p></div>';
      };
    }

    _currentRoute = name;
    handler(params);
  }
})();
