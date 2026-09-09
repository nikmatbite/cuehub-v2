// =============================================================
// CueHub v3 — router.js
// SPA router berbasis hash (#/route)
// Semua navigasi lewat router.go() — tidak ada window.location langsung
// =============================================================

var router = (function() {
  var _routes = {};
  var _currentRoute = null;
  var _beforeEach = null;
  var _navigating = false;

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
      _navigating = true;
      window.location.hash = '#/' + name;
      _navigate(name, params);
      // Reset flag setelah hashchange sempat fire
      setTimeout(function() { _navigating = false; }, 50);
    },

    replace: function(name, params) {
      _navigating = true;
      window.location.replace('#/' + name);
      _navigate(name, params);
      setTimeout(function() { _navigating = false; }, 50);
    },

    init: function() {
      window.addEventListener('hashchange', function() {
        if (_navigating) return;
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
        _navigating = true;
        window.location.replace('#/' + allowed);
        _navigating = false;
        _currentRoute = allowed;
        var redirectHandler = _routes[allowed];
        if (redirectHandler) redirectHandler();
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