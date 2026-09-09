// =============================================================
// CueHub v3 — store.js
// State management ringan — localStorage wrapper + in-memory cache
// Semua state sensitif (token, session) lewat sini
// =============================================================

var store = (function() {
  var PREFIX = 'ch3_';

  // In-memory cache untuk state yang sering dibaca
  var _cache = {};

  return {
    // Simpan key-value (otomatis JSON.stringify untuk object/array)
    set: function(key, value) {
      _cache[key] = value;
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch(e) {}
    },

    // Baca dari cache dulu, fallback ke localStorage
    get: function(key, defaultValue) {
      if (_cache[key] !== undefined) return _cache[key];
      try {
        var raw = localStorage.getItem(PREFIX + key);
        if (raw === null) return defaultValue !== undefined ? defaultValue : null;
        var parsed = JSON.parse(raw);
        _cache[key] = parsed;
        return parsed;
      } catch(e) {
        return defaultValue !== undefined ? defaultValue : null;
      }
    },

    // Hapus satu key
    remove: function(key) {
      delete _cache[key];
      try { localStorage.removeItem(PREFIX + key); } catch(e) {}
    },

    // Clear semua state (logout)
    clear: function() {
      _cache = {};
      var keys = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.startsWith(PREFIX)) keys.push(k);
        }
        keys.forEach(function(k) { localStorage.removeItem(k); });
      } catch(e) {}
    },

    // --- Shorthand helpers ---

    isLoggedIn: function() {
      return !!this.get('token');
    },

    getUser: function() {
      return this.get('user') || null;
    },

    getToken: function() {
      return this.get('token') || null;
    },

    setSession: function(sessionId) {
      this.set('active_session_id', sessionId);
    },

    getSessionId: function() {
      return this.get('active_session_id') || null;
    },

    clearSession: function() {
      this.remove('active_session_id');
      this.remove('active_segment_id');
    },

    setSegment: function(segmentId) {
      this.set('active_segment_id', segmentId);
    },

    getSegmentId: function() {
      return this.get('active_segment_id') || null;
    },

    // Theme & lang disimpan dengan key berbeda (tanpa prefix session)
    getTheme: function() {
      return this.get('theme') || 'dark';
    },

    setTheme: function(theme) {
      this.set('theme', theme);
    }
  };
})();
