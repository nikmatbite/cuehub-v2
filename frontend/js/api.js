// =============================================================
// CueHub v3 — api.js
// Semua komunikasi ke GAS backend lewat sini
// Tidak ada fetch() di file lain
// =============================================================

var API_URL = 'https://script.google.com/macros/s/AKfycbzn7FoP2HoOUkJuYfcC3fF4IaT9Ov07yHmsZWe-0dqtOx01lqRHTGeia8KcD34dOQT8/exec'; // Isi setelah GAS di-deploy sebagai Web App

// --- Core request ---
async function apiRequest(action, params) {
  if (!API_URL) {
    console.error('API_URL belum diisi di api.js');
    return { success: false, error: { code: 'ERR_NO_URL' } };
  }

  var token = store.get('token');
  var body = { action: action, params: params || {} };
  if (token) body.token = token;

  try {
    var res = await fetch(API_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body   : JSON.stringify(body)
    });
    var data = await res.json();

    // 🔧 FIX: Hanya logout kalau BENAR-BENAR UNAUTHORIZED
    if (data.success === false && data.error && data.error.code === 'UNAUTHORIZED') {
      console.warn('Token tidak valid, logout...');
      store.clear();
      router.go('login');
      return data;  // ← Return juga
    }

    return data;
  } catch (e) {
    console.error('API Request Error:', e);
    return { success: false, error: { code: 'NETWORK' } };
  }
}

// --- Auth ---
var api = {
  auth: {
    login    : (p) => apiRequest('auth.login',    p),
    logout   : ()  => apiRequest('auth.logout',   {}),
    register : (p) => apiRequest('auth.register', p),
    me       : ()  => apiRequest('auth.me',       {})
  },

  player: {
    getAll  : ()  => apiRequest('player.getAll',  {}),
    getById : (p) => apiRequest('player.getById', p),
    create  : (p) => apiRequest('player.create',  p),
    update  : (p) => apiRequest('player.update',  p),
    delete  : (p) => apiRequest('player.delete',  p)
  },

  session: {
    create  : (p) => apiRequest('session.create',  p),
    getAll  : (p) => apiRequest('session.getAll',  p || {}),
    getById : (p) => apiRequest('session.getById', p),
    finish  : (p) => apiRequest('session.finish',  p)
  },

  segment: {
    start     : (p) => apiRequest('segment.start',      p),
    finish    : (p) => apiRequest('segment.finish',     p),
    shuffle   : (p) => apiRequest('segment.shuffle',    p),
    getActive : (p) => apiRequest('segment.getActive',  p)
  },

  match: {
    submitWinner : (p) => apiRequest('match.submitWinner',  p),
    getBySegment : (p) => apiRequest('match.getBySegment',  p),
    editWinner   : (p) => apiRequest('match.editWinner',    p)
  },

  stats: {
    getPlayer    : (p) => apiRequest('stats.getPlayer',     p),
    getAllPlayers : ()  => apiRequest('stats.getAllPlayers', {}),
    getSession   : (p) => apiRequest('stats.getSession',    p)
  }
};
