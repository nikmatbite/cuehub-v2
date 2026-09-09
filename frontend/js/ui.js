// =============================================================
// CueHub v3 — ui.js
// Helper UI: toast, modal konfirmasi, loading overlay, ELO badge
// Semua komponen UI reusable ada di sini
// =============================================================

var ui = {

  // --- Loading overlay ---
  loading: {
    show: function(msg) {
      var el = document.getElementById('loading-overlay');
      if (!el) return;
      var text = el.querySelector('.loading-text');
      if (text) text.textContent = msg || getLang('loading');
      el.classList.remove('d-none');
    },
    hide: function() {
      var el = document.getElementById('loading-overlay');
      if (el) el.classList.add('d-none');
    }
  },

  // --- Toast notifications ---
  toast: {
    _container: null,

    _getContainer: function() {
      if (!this._container) {
        this._container = document.getElementById('toast-container');
      }
      return this._container;
    },

    show: function(message, type) {
      // type: 'success' | 'error' | 'info' | 'warning'
      type = type || 'info';
      var icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
      var container = this._getContainer();
      if (!container) return;

      var id = 'toast-' + Date.now();
      var div = document.createElement('div');
      div.id = id;
      div.className = 'ch-toast ch-toast-' + type;
      div.innerHTML =
        '<span class="ch-toast-icon">' + (icons[type] || 'ℹ') + '</span>' +
        '<span class="ch-toast-msg">' + _escHtml(message) + '</span>';

      container.appendChild(div);

      // Animasi masuk
      requestAnimationFrame(function() { div.classList.add('show'); });

      // Auto dismiss
      setTimeout(function() {
        div.classList.remove('show');
        setTimeout(function() {
          if (div.parentNode) div.parentNode.removeChild(div);
        }, 300);
      }, 3000);
    },

    success : function(msg) { this.show(msg, 'success'); },
    error   : function(msg) { this.show(msg, 'error'); },
    info    : function(msg) { this.show(msg, 'info'); },
    warning : function(msg) { this.show(msg, 'warning'); },

    apiError: function(errCode) {
      var key = 'err_' + (errCode || 'SERVER_ERROR');
      this.error(getLang(key));
    }
  },

  // --- Konfirmasi modal ---
  confirm: function(message, onConfirm, onCancel) {
    var modal = document.getElementById('confirm-modal');
    if (!modal) return;
    var msgEl = modal.querySelector('.confirm-message');
    if (msgEl) msgEl.textContent = message;

    var btnYes = modal.querySelector('.btn-confirm-yes');
    var btnNo  = modal.querySelector('.btn-confirm-no');

    // Clone untuk hapus listener lama
    var newYes = btnYes.cloneNode(true);
    var newNo  = btnNo.cloneNode(true);
    btnYes.parentNode.replaceChild(newYes, btnYes);
    btnNo.parentNode.replaceChild(newNo, btnNo);

    newYes.textContent = getLang('yes');
    newNo.textContent  = getLang('cancel');

    var bsModal = new bootstrap.Modal(modal);

    newYes.addEventListener('click', function() {
      bsModal.hide();
      if (onConfirm) onConfirm();
    });
    newNo.addEventListener('click', function() {
      bsModal.hide();
      if (onCancel) onCancel();
    });

    bsModal.show();
  },

  // --- ELO Badge ---
  eloBadge: function(elo, label) {
    var rank = _eloRank(elo);
    return '<span class="elo-badge elo-rank-' + rank.rank + '">' +
      rank.icon + ' ' + elo +
      '</span>';
  },

  eloChangeTag: function(before, after) {
    var diff = after - before;
    var cls = diff >= 0 ? 'elo-up' : 'elo-down';
    var sign = diff >= 0 ? '+' : '';
    return '<span class="elo-change ' + cls + '">' + sign + diff + '</span>';
  },

  // --- Player Avatar (inisial) ---
  avatar: function(name, size) {
    size = size || 'md';
    var initials = _getInitials(name);
    var colorIdx = _nameColorIndex(name);
    return '<div class="ch-avatar ch-avatar-' + size + ' ch-avatar-color-' + colorIdx + '">' +
      initials + '</div>';
  },

  // --- Mode Icon ---
  modeIcon: function(mode) {
    var icons = {
      duel         : '⚔️',
      king_of_table: '👑',
      team_battle  : '🛡️',
      singapore    : '🎱'
    };
    return icons[mode] || '🎱';
  },

  modeName: function(mode) {
    var keys = {
      duel         : 'mode_duel',
      king_of_table: 'mode_king',
      team_battle  : 'mode_team',
      singapore    : 'mode_singapore'
    };
    return getLang(keys[mode] || 'mode_duel');
  },

  // --- Format tanggal ---
  formatDate: function(isoStr) {
    if (!isoStr) return '-';
    var d = new Date(isoStr);
    if (isNaN(d)) return '-';
    var lang = getCurrentLang();
    return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatDateShort: function(isoStr) {
    if (!isoStr) return '-';
    var d = new Date(isoStr);
    if (isNaN(d)) return '-';
    var lang = getCurrentLang();
    return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  },

  // --- Render ke #app ---
  render: function(html) {
    var app = document.getElementById('app');
    if (app) app.innerHTML = html;
  },

  // --- Utility: set active nav ---
  setActiveNav: function(route) {
    document.querySelectorAll('[data-nav]').forEach(function(el) {
      el.classList.toggle('active', el.getAttribute('data-nav') === route);
    });
  }
};

// --- Private helpers ---
function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _getInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function _nameColorIndex(name) {
  // 8 warna avatar tersedia, mapping by nama
  var sum = 0;
  for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return (sum % 8) + 1;
}

function _eloRank(elo) {
  if (elo >= 1800) return { icon: '👑', rank: 7 };
  if (elo >= 1600) return { icon: '💎', rank: 6 };
  if (elo >= 1400) return { icon: '🥇', rank: 5 };
  if (elo >= 1200) return { icon: '🥈', rank: 4 };
  if (elo >= 1000) return { icon: '🥉', rank: 3 };
  if (elo >= 800)  return { icon: '🔰', rank: 2 };
  return { icon: '🌱', rank: 1 };
}
