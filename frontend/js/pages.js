// =============================================================
// CueHub v3 — pages.js
// Semua page renderer — satu file, satu section per halaman
// =============================================================

// ─────────────────────────────────────────
// PAGE: LOGIN
// ─────────────────────────────────────────
var PageLogin = {
  render: function() {
    ui.render(`
      <div class="ch-auth-screen">
        <div class="ch-auth-brand">
          <div class="ch-logo">🎱</div>
          <h1 class="ch-brand-name">CueHub</h1>
          <p class="ch-brand-sub" data-lang="app_tagline"></p>
        </div>

        <div class="ch-auth-form" id="login-form">
          <h2 data-lang="login_welcome"></h2>
          <p class="text-secondary mb-4" style="font-size:0.88rem" data-lang="login_subtitle"></p>

          <div class="ch-form-group">
            <label class="ch-label" data-lang="display_name"></label>
            <input id="login-name" class="ch-input" type="text" autocomplete="username" data-lang-placeholder="display_name">
          </div>
          <div class="ch-form-group">
            <label class="ch-label" data-lang="password"></label>
            <input id="login-pass" class="ch-input" type="password" autocomplete="current-password" data-lang-placeholder="password">
          </div>
          <button class="ch-btn ch-btn-primary ch-btn-block ch-btn-lg" onclick="PageLogin.submit()">
            <span data-lang="login"></span>
          </button>

          <p class="text-center mt-3" style="font-size:0.85rem; color:var(--ch-text-muted)">
            <span data-lang="no_account"></span>
            <a href="#" onclick="PageLogin.showRegister()" style="color:var(--ch-accent); text-decoration:none; margin-left:4px" data-lang="register"></a>
          </p>
        </div>

        <div class="ch-auth-form d-none" id="register-form">
          <h2 data-lang="register_title"></h2>
          <p class="text-secondary mb-4" style="font-size:0.88rem" data-lang="register_subtitle"></p>

          <div class="ch-form-group">
            <label class="ch-label" data-lang="display_name"></label>
            <input id="reg-name" class="ch-input" type="text" data-lang-placeholder="display_name">
          </div>
          <div class="ch-form-group">
            <label class="ch-label" data-lang="password"></label>
            <input id="reg-pass" class="ch-input" type="password" data-lang-placeholder="password">
          </div>
          <button class="ch-btn ch-btn-primary ch-btn-block ch-btn-lg" onclick="PageLogin.submitRegister()">
            <span data-lang="register"></span>
          </button>

          <p class="text-center mt-3" style="font-size:0.85rem; color:var(--ch-text-muted)">
            <span data-lang="have_account"></span>
            <a href="#" onclick="PageLogin.showLogin()" style="color:var(--ch-accent); text-decoration:none; margin-left:4px" data-lang="login"></a>
          </p>
        </div>
      </div>
    `);
    applyLang();

    // Enter key support
    ['login-name','login-pass'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') PageLogin.submit(); });
    });
  },

  showRegister: function() {
    document.getElementById('login-form').classList.add('d-none');
    document.getElementById('register-form').classList.remove('d-none');
  },

  showLogin: function() {
    document.getElementById('register-form').classList.add('d-none');
    document.getElementById('login-form').classList.remove('d-none');
  },

  submit: async function() {
    var name = document.getElementById('login-name').value.trim();
    var pass = document.getElementById('login-pass').value;
    if (!name || !pass) { ui.toast.warning(getLang('err_MISSING_PARAMS')); return; }

    ui.loading.show();
    var res = await api.auth.login({ display_name: name, password: pass });

    if (res.success) {
      store.set('token', res.data.token);
      store.set('user', { user_id: res.data.user_id, display_name: res.data.display_name });
      ui.loading.hide();
      router.go('dashboard');
    } else {
      ui.loading.hide();
      ui.toast.apiError(res.error && res.error.code);
    }
  },

  submitRegister: async function() {
    var name = document.getElementById('reg-name').value.trim();
    var pass = document.getElementById('reg-pass').value;
    if (!name || !pass) { ui.toast.warning(getLang('err_MISSING_PARAMS')); return; }

    ui.loading.show();
    var res = await api.auth.register({ display_name: name, password: pass });
    ui.loading.hide();

    if (res.success) {
      ui.toast.success(getLang('success'));
      PageLogin.showLogin();
    } else {
      ui.toast.apiError(res.error && res.error.code);
    }
  }
};

// ─────────────────────────────────────────
// PAGE: DASHBOARD
// ─────────────────────────────────────────
var PageDashboard = {
  _session: null,
  _stats: null,

  render: async function() {
    ui.render('<div class="ch-page" style="padding-top:24px"><div class="ch-spinner mx-auto mt-5"></div></div>');
    AppShell.renderNav('dashboard');

    var user = store.getUser();

    // Cek active session
    var sessionId = store.getSessionId();
    var segmentState = null;
    if (sessionId) {
      var segRes = await api.segment.getActive({ session_id: sessionId });
      if (segRes.success && segRes.data.segment) {
        segmentState = segRes.data;
      }
    }

    // Ambil top 3 leaderboard
    var statsRes = await api.stats.getAllPlayers();
    var topPlayers = statsRes.success ? statsRes.data.slice(0, 3) : [];

    ui.render(this._html(user, sessionId, segmentState, topPlayers));
    applyLang();
  },

  _html: function(user, sessionId, segmentState, topPlayers) {
    var greeting = new Date().getHours() < 12 ? '🌤' : new Date().getHours() < 17 ? '☀️' : '🌙';

    var sessionCard = sessionId
      ? `<div class="ch-card mb-3" style="border-color:var(--ch-accent)">
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="ch-section-label" style="margin-top:0" data-lang="active_session"></div>
              <div class="flex items-center gap-2 mt-1">
                ${segmentState && segmentState.state
                  ? `<span class="ch-mode-badge">${ui.modeIcon(segmentState.segment.game_mode)} ${ui.modeName(segmentState.segment.game_mode)}</span>`
                  : `<span style="font-size:0.8rem;color:var(--ch-text-muted)" data-lang="no_active_game"></span>`}
              </div>
            </div>
            <div class="pulse-dot"></div>
          </div>
          <div class="flex flex-col gap-2">
            <button class="ch-btn ch-btn-primary ch-btn-block" onclick="${segmentState && segmentState.state ? "router.go('play')" : "router.go('setup')"}">
              <span>▶</span> <span data-lang="${segmentState && segmentState.state ? 'resume_session' : 'start_game'}"></span>
            </button>
            <button class="ch-btn ch-btn-danger ch-btn-block" onclick="PageDashboard.endSession()">
              <span data-lang="end_session"></span>
            </button>
          </div>
        </div>`
      : `<div class="ch-card mb-3" style="text-align:center;padding:32px 20px">
          <div style="font-size:2.5rem;margin-bottom:12px">🎱</div>
          <p class="text-secondary mb-3" data-lang="no_active_session"></p>
          <button class="ch-btn ch-btn-primary ch-btn-block" onclick="PageDashboard.startSession()">
            <span>＋</span> <span data-lang="start_session"></span>
          </button>
        </div>`;

    var leaderHtml = topPlayers.length === 0 ? '' : `
      <div class="ch-section-label" data-lang="leaderboard"></div>
      <div class="flex flex-col gap-2">
        ${topPlayers.map(function(p, i) {
          var medals = ['🥇','🥈','🥉'];
          return `<div class="ch-rank-row rank-${i+1}" onclick="router.go('player-detail', {player_id:'${p.player_id}'})">
            <div class="ch-rank-num">${medals[i]}</div>
            ${ui.avatar(p.player_name, 'sm')}
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.9rem">${p.player_name}</div>
              <div style="font-size:0.75rem;color:var(--ch-text-muted)">${p.total_games} match · ${p.win_rate}% WR</div>
            </div>
            ${ui.eloBadge(p.elo)}
          </div>`;
        }).join('')}
      </div>`;

    return `
      <div class="ch-page">
        <div class="flex items-center justify-between mb-4">
          <div>
            <div style="font-size:0.82rem;color:var(--ch-text-muted)">${greeting} ${getLang('dashboard')}</div>
            <h1 style="font-size:1.5rem;margin:2px 0 0">${user ? user.display_name : ''}</h1>
          </div>
          <button class="ch-btn ch-btn-surface ch-btn-sm" onclick="router.go('settings')">⚙</button>
        </div>

        ${sessionCard}
        ${leaderHtml}
      </div>`;
  },

  startSession: async function() {
    ui.loading.show();
    var res = await api.session.create({});
    ui.loading.hide();

    if (res.success) {
      store.setSession(res.data.session_id);
      router.go('setup');
    } else {
      ui.toast.apiError(res.error && res.error.code);
    }
  },

  endSession: function() {
    ui.confirm(getLang('confirm_end_session'), async function() {
      var sessionId = store.getSessionId();
      if (sessionId) {
        ui.loading.show();
        await api.session.finish({ session_id: sessionId });
        ui.loading.hide();
      }
      store.clearSession();
      PageDashboard.render();
    });
  }
};

// ─────────────────────────────────────────
// PAGE: SETUP GAME
// ─────────────────────────────────────────
var PageSetup = {
  _players: [],
  _selected: [],
  _mode: null,
  _step: 1, // 1=mode, 2=player

  render: async function() {
    ui.render('<div class="ch-page"><div class="ch-spinner mx-auto mt-5"></div></div>');

    var res = await api.player.getAll();
    this._players = res.success ? res.data : [];
    this._selected = [];
    this._mode = null;
    this._step = 1;

    this._renderStep();
    },

  // renderFromPlay() dipanggil saat "Akhiri Game" dari PagePlay
  // Player dipertahankan, langsung ke Step 2
  renderFromPlay: function(selectedIds) {
    if (selectedIds && selectedIds.length) this._selected = selectedIds;
    this._mode = null;
    this._step = 2;
    // Muat ulang player list agar data segar, tapi jangan reset seleksi
    var self = this;
    api.player.getAll().then(function(res) {
      self._players = res.success ? res.data : [];
      self._renderStep();
    });
  },

  _renderStep: function() {
    if (this._step === 1) this._renderPlayerStep();
    else this._renderModeStep();
  },

  // ── STEP 1: PILIH PLAYER ──────────────────────────────
  _renderPlayerStep: function() {
    var self = this;

    // Form tambah player inline (muncul kalau list kosong atau user klik "+")
    var addFormHtml = `
      <div class="ch-card mb-3" id="add-player-form" style="display:none">
        <div style="font-weight:600;margin-bottom:12px">➕ <span data-lang="add_player"></span></div>
        <div class="ch-form-group">
          <input id="new-player-name" class="ch-input" type="text" data-lang-placeholder="player_name">
        </div>
        <div class="ch-form-group">
          <input id="new-player-nick" class="ch-input" type="text" data-lang-placeholder="nickname_optional">
        </div>
        <div class="flex gap-2">
          <button class="ch-btn ch-btn-surface" style="flex:1" onclick="PageSetup._hideAddForm()" data-lang="cancel"></button>
          <button class="ch-btn ch-btn-primary" style="flex:1" onclick="PageSetup._submitAddPlayer()" data-lang="save"></button>
        </div>
      </div>`;

    var playerListHtml = this._players.length === 0
      ? `<div class="ch-empty" id="empty-state">
           <div class="ch-empty-icon">👥</div>
           <div class="ch-empty-title" data-lang="no_players"></div>
           <div class="ch-empty-desc" data-lang="add_first_player"></div>
         </div>`
      : this._players.map(function(p) {
          var isSelected = self._selected.indexOf(p.player_id) !== -1;
          return `<div class="ch-player-chip ${isSelected ? 'selected' : ''}"
                       onclick="PageSetup.togglePlayer('${p.player_id}')"
                       id="chip-${p.player_id}">
            ${ui.avatar(p.player_name, 'sm')}
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.9rem">${p.player_name}</div>
              <div style="font-size:0.75rem;color:var(--ch-text-muted)">${p.nickname ? p.nickname + ' · ' : ''}${ui.eloBadge(p.elo)}</div>
            </div>
            <div class="chip-check">${isSelected ? '✓' : ''}</div>
          </div>`;
        }).join('');

    var html = `
      <div class="ch-page">
        <!-- Header -->
        <div class="flex items-center justify-between mb-1" style="padding-top:4px">
          <div>
            <div style="font-size:0.75rem;color:var(--ch-text-muted)" data-lang="step_1_of_2"></div>
            <h2 style="font-size:1.25rem;font-weight:700;margin:2px 0 0" data-lang="select_players"></h2>
          </div>
          <button class="ch-btn ch-btn-surface ch-btn-sm" onclick="router.go('settings')">⚙</button>
        </div>

        <!-- Stepper indicator -->
        <div class="flex gap-2 mb-4 mt-2">
          <div style="flex:1;height:3px;border-radius:2px;background:var(--ch-accent)"></div>
          <div style="flex:1;height:3px;border-radius:2px;background:var(--ch-border)"></div>
        </div>

        <!-- Counter + tombol tambah -->
        <div class="flex items-center justify-between mb-3">
          <div style="font-size:0.82rem;color:var(--ch-text-muted)">
            <span id="selected-count">${this._selected.length}</span> <span data-lang="selected_label"></span>
            ${this._players.length > 0 ? '· ' + getLang('min_players_note', { n: 2 }) : ''}
          </div>
          <button class="ch-btn ch-btn-surface ch-btn-sm" onclick="PageSetup._showAddForm()">
            ＋ <span data-lang="add_player"></span>
          </button>
        </div>

        ${addFormHtml}

        <!-- Search (hanya tampil kalau ada player) -->
        ${this._players.length > 0 ? `
        <div class="ch-search-wrap mb-3">
          <span class="search-icon">🔍</span>
          <input class="ch-input" id="player-search" type="text" data-lang-placeholder="search_player"
            oninput="PageSetup._filterChips(this.value)">
        </div>` : ''}

        <!-- Player list -->
        <div class="flex flex-col gap-2" id="player-chip-list">
          ${playerListHtml}
        </div>

        <!-- Actions -->
        <div style="position:sticky;bottom:80px;margin-top:20px;display:flex;flex-direction:column;gap:8px">
          <button class="ch-btn ch-btn-primary ch-btn-block ch-btn-lg" id="btn-next-mode"
            onclick="PageSetup._goToModeStep()" ${this._selected.length < 2 ? 'disabled' : ''}>
            <span data-lang="select_mode"></span> →
          </button>
          <button class="ch-btn ch-btn-danger ch-btn-block" onclick="PageSetup.endSession()">
            <span data-lang="end_session"></span>
          </button>
        </div>
      </div>`;

    ui.render(html);
    applyLang();
  },

  _showAddForm: function() {
    var form = document.getElementById('add-player-form');
    var empty = document.getElementById('empty-state');
    if (form) form.style.display = '';
    if (empty) empty.style.display = 'none';
    var inp = document.getElementById('new-player-name');
    if (inp) inp.focus();
  },

  _hideAddForm: function() {
    var form = document.getElementById('add-player-form');
    var empty = document.getElementById('empty-state');
    if (form) form.style.display = 'none';
    if (empty && this._players.length === 0) empty.style.display = '';
  },

  _submitAddPlayer: async function() {
    var name = (document.getElementById('new-player-name').value || '').trim();
    var nick = (document.getElementById('new-player-nick').value || '').trim();
    if (!name) { ui.toast.warning(getLang('err_NAME_REQUIRED')); return; }

    ui.loading.show();
    var res = await api.player.create({ player_name: name, nickname: nick });
    ui.loading.hide();

    if (res.success) {
      ui.toast.success(getLang('success'));
      // Reload player list dan re-render step 1
      var listRes = await api.player.getAll();
      this._players = listRes.success ? listRes.data : [];
      this._renderPlayerStep();
    } else {
      ui.toast.apiError(res.error && res.error.code);
    }
  },

  togglePlayer: function(playerId) {
    var idx = this._selected.indexOf(playerId);
    if (idx === -1) {
      this._selected.push(playerId);
    } else {
      this._selected.splice(idx, 1);
    }

    var chip = document.getElementById('chip-' + playerId);
    if (chip) {
      chip.classList.toggle('selected', idx === -1);
      var check = chip.querySelector('.chip-check');
      if (check) check.textContent = idx === -1 ? '✓' : '';
    }

    var cnt = document.getElementById('selected-count');
    if (cnt) cnt.textContent = this._selected.length;
    var btn = document.getElementById('btn-next-mode');
    if (btn) btn.disabled = this._selected.length < 2;
  },

  _filterChips: function(query) {
    var q = query.toLowerCase();
    document.querySelectorAll('.ch-player-chip').forEach(function(chip) {
      var name = chip.querySelector('[style*="font-weight:600"]');
      if (name) chip.style.display = name.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  _goToModeStep: function() {
    if (this._selected.length < 2) return;
    this._step = 2;
    this._renderModeStep();
  },

  // ── STEP 2: PILIH MODE ───────────────────────────────
  _renderModeStep: function() {
    var self = this;
    var count = this._selected.length;
    var modes = [
      { key: 'duel',          min: 2 },
      { key: 'king_of_table', min: 3 },
      { key: 'singapore',     min: 3 },
      { key: 'team_battle',   min: 4 }
    ];

    var modeCards = modes.map(function(m) {
      var disabled = count < m.min;
      var descKey = m.key === 'king_of_table' ? 'king' : m.key === 'team_battle' ? 'team' : m.key;
      return `<div class="ch-card ${disabled ? 'opacity-50' : ''}"
        style="cursor:${disabled ? 'not-allowed' : 'pointer'};transition:all 0.15s;${disabled ? 'filter:grayscale(0.4)' : ''}"
        onclick="${disabled ? '' : "PageSetup._startGame('" + m.key + "')"}" id="mode-${m.key}">
        <div class="flex items-center gap-3">
          <div style="font-size:2rem">${ui.modeIcon(m.key)}</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:1rem">${ui.modeName(m.key)}</div>
            <div style="font-size:0.8rem;color:var(--ch-text-secondary);margin-top:2px">
              ${getLang('mode_' + descKey + '_desc')}
            </div>
            <div style="font-size:0.72rem;margin-top:4px;color:${disabled ? 'var(--ch-danger)' : 'var(--ch-text-muted)'}">
              ${disabled
                ? '⚠ ' + getLang('min_players_note', { n: m.min })
                : getLang('min_players_note', { n: m.min }) + ' · ' + count + ' ✓'}
            </div>
          </div>
          ${disabled ? '' : '<div style="color:var(--ch-text-muted)">›</div>'}
        </div>
      </div>`;
    }).join('');

    var html = `
      <div class="ch-page">
        <!-- Header -->
        <div class="flex items-center justify-between mb-1" style="padding-top:4px">
          <div>
            <div style="font-size:0.75rem;color:var(--ch-text-muted)" data-lang="step_2_of_2"></div>
            <h2 style="font-size:1.25rem;font-weight:700;margin:2px 0 0" data-lang="select_mode"></h2>
          </div>
          <button class="ch-btn ch-btn-surface ch-btn-sm" onclick="router.go('settings')">⚙</button>
        </div>

        <!-- Stepper indicator -->
        <div class="flex gap-2 mb-4 mt-2">
          <div style="flex:1;height:3px;border-radius:2px;background:var(--ch-accent)"></div>
          <div style="flex:1;height:3px;border-radius:2px;background:var(--ch-accent)"></div>
        </div>

        <!-- Info player terpilih -->
        <div class="ch-card mb-3" style="padding:12px 16px;background:var(--ch-bg-elevated)">
          <div style="font-size:0.78rem;color:var(--ch-text-muted);margin-bottom:6px">
            👥 <span data-lang="selected_players"></span> (${count})
          </div>
          <div class="flex flex-wrap gap-2">
            ${self._selected.map(function(id) {
              var p = self._players.find(function(x) { return x.player_id === id; });
              var name = p ? p.player_name : id.substring(0, 6);
              return '<span style="font-size:0.8rem;background:var(--ch-bg-surface);border:1px solid var(--ch-border);border-radius:20px;padding:2px 10px">' + name + '</span>';
            }).join('')}
          </div>
        </div>

        <!-- Mode cards -->
        <div class="flex flex-col gap-3">
          ${modeCards}
        </div>

        <!-- Actions -->
        <div style="position:sticky;bottom:80px;margin-top:20px;display:flex;flex-direction:column;gap:8px">
          <button class="ch-btn ch-btn-surface ch-btn-block" onclick="PageSetup._backToPlayerStep()">
            ‹ <span data-lang="select_players"></span>
          </button>
          <button class="ch-btn ch-btn-danger ch-btn-block" onclick="PageSetup.endSession()">
            <span data-lang="end_session"></span>
          </button>
        </div>
      </div>`;

    ui.render(html);
    applyLang();
  },

  _backToPlayerStep: function() {
    this._step = 1;
    // Player tetap, tidak di-reset
    this._renderPlayerStep();
  },

  _startGame: async function(mode) {
    this._mode = mode;
    var sessionId = store.getSessionId();
    if (!sessionId) { ui.toast.error(getLang('err_SESSION_NOT_FOUND')); return; }

    ui.loading.show();
    var res = await api.segment.start({
      session_id : sessionId,
      game_mode  : mode,
      player_ids : this._selected
    });
    ui.loading.hide();

    if (res.success) {
      store.setSegment(res.data.segment_id);
      router.go('play');
    } else {
      ui.toast.apiError(res.error && res.error.code);
    }
  },

  endSession: function() {
    ui.confirm(getLang('confirm_end_session'), async function() {
      var sessionId = store.getSessionId();
      if (sessionId) {
        ui.loading.show();
        await api.session.finish({ session_id: sessionId });
        ui.loading.hide();
      }
      store.clearSession();
      router.go('dashboard');
    });
  }
};

// ─────────────────────────────────────────
// PAGE: PLAY
// ─────────────────────────────────────────
var PagePlay = {
  _segment: null,
  _state: null,
  _players: {},  // { player_id: player_data }
  _matchCount: 0,

  render: async function() {
    ui.render('<div class="ch-page"><div class="ch-spinner mx-auto mt-5"></div></div>');

    var sessionId = store.getSessionId();
    if (!sessionId) { router.go('dashboard'); return; }

    // Load segment aktif
    var segRes = await api.segment.getActive({ session_id: sessionId });
    if (!segRes.success || !segRes.data.segment) {
      router.go('setup');
      return;
    }

    this._segment = segRes.data.segment;
    this._state   = segRes.data.state;

    // Load player data untuk nama
    var playerRes = await api.player.getAll();
    if (playerRes.success) {
      var map = {};
      playerRes.data.forEach(function(p) { map[p.player_id] = p; });
      this._players = map;
    }

    // Hitung match count
    var matchRes = await api.match.getBySegment({ segment_id: this._segment.segment_id });
    this._matchCount = matchRes.success ? matchRes.data.length : 0;
    if (matchRes.success && matchRes.data.length > 0) {
      var self = this;
      this._matchHistory = matchRes.data.slice(-10).reverse().map(function(m) {
        var winnerIds = typeof m.winner_ids === 'string' ? JSON.parse(m.winner_ids) : m.winner_ids;
        var winnerNames = winnerIds.map(function(id) {
          return self._players[id] ? self._players[id].player_name : id.substring(0,6);
        });
        return { winners: winnerNames, mode: m.game_mode || '' };
      });
    } else {
      this._matchHistory = [];
    }

    this._renderPlay();
  },

  _renderPlay: function() {
    var self = this;
    var state = this._state;
    var mode = state ? state.mode : '';

    var nowPlayingHtml = this._renderNowPlaying(state);
    var nextHtml       = this._renderNext(state);
    var queueHtml      = this._renderQueue(state);

    var html = `
      <div class="ch-page" style="padding-top:0">
        <!-- Header -->
        <div style="padding:16px 16px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--ch-border)">
          <div class="flex items-center gap-2">
            <span class="ch-mode-badge">${ui.modeIcon(mode)} ${ui.modeName(mode)}</span>
            <span style="font-size:0.78rem;color:var(--ch-text-muted)" data-lang="match_count"
              data-lang-n="${this._matchCount}">
              ${getLang('match_count', { n: this._matchCount })}
            </span>
          </div>
          <div class="flex gap-2">
            <button class="ch-btn ch-btn-surface ch-btn-sm" onclick="PagePlay.doShuffle()" title="${getLang('shuffle_cycle')}">🔀</button>
            <button class="ch-btn ch-btn-danger ch-btn-sm" onclick="PagePlay.doEndGame()">
              <span data-lang="end_game"></span>
            </button>
          </div>
        </div>

        <!-- Now Playing -->
        <div style="padding:16px 16px 8px">
          <div class="ch-section-label" style="margin-top:0" data-lang="now_playing"></div>
          ${nowPlayingHtml}
        </div>

        <!-- Next -->
        ${nextHtml ? `
        <div style="padding:0 16px 8px">
          <div class="ch-section-label" data-lang="next_match"></div>
          ${nextHtml}
        </div>` : ''}

        <!-- Queue / Resting -->
        ${queueHtml ? `
        <div style="padding:0 16px 8px">
          <div class="ch-section-label" data-lang="${mode === 'king_of_table' ? 'king_queue' : 'queue'}"></div>
          ${queueHtml}
        </div>` : ''}

        <!-- Resting for team/singapore -->
        ${this._renderResting(state)}

          <!-- Match History -->
          ${this._renderHistory()}
        </div>`;

    ui.render(html);
    applyLang();
  },

  _pName: function(id) {
    var p = this._players[id];
    return p ? p.player_name : id.substring(0, 8);
  },

  _renderNowPlaying: function(state) {
    var self = this;
    if (!state) return '';
    var mode = state.mode;

    if (mode === 'duel' || mode === 'king_of_table') {
      var p1 = state.playing[0];
      var p2 = state.playing[1];
      if (!p1 || !p2) return '';

      return `
        <div class="ch-match-card playing">
          <div class="flex items-center gap-3 mb-4">
            <div class="ch-player-slot" style="flex:1">
              ${ui.avatar(self._pName(p1), 'lg')}
              <div class="player-name">${self._pName(p1)}</div>
              ${mode === 'king_of_table' ? '<div style="font-size:0.7rem;color:var(--ch-text-muted)">👑 King</div>' : ''}
            </div>
            <div class="ch-vs-divider">${getLang('vs')}</div>
            <div class="ch-player-slot" style="flex:1">
              ${ui.avatar(self._pName(p2), 'lg')}
              <div class="player-name">${self._pName(p2)}</div>
              ${mode === 'king_of_table' ? '<div style="font-size:0.7rem;color:var(--ch-text-muted)">' + getLang('king_challenger') + '</div>' : ''}
            </div>
          </div>

          <div class="ch-section-label" style="margin-top:0;text-align:center" data-lang="pick_winner"></div>
          <div class="flex gap-3">
            <button class="ch-winner-btn" onclick="PagePlay.pickWinner(['${p1}'], ['${p1}','${p2}'])">
              ${ui.avatar(self._pName(p1), 'sm')}
              <div style="font-weight:600;font-size:0.9rem;margin-top:6px">${self._pName(p1)}</div>
            </button>
            <button class="ch-winner-btn" onclick="PagePlay.pickWinner(['${p2}'], ['${p1}','${p2}'])">
              ${ui.avatar(self._pName(p2), 'sm')}
              <div style="font-weight:600;font-size:0.9rem;margin-top:6px">${self._pName(p2)}</div>
            </button>
          </div>
        </div>`;
    }

    if (mode === 'team_battle') {
      var tA = state.playing.teamA;
      var tB = state.playing.teamB;
      return `
        <div class="ch-match-card playing">
          <div class="flex gap-3 mb-4">
            <div style="flex:1;text-align:center;padding:12px;background:var(--ch-bg-elevated);border-radius:var(--ch-radius-md)">
              <div style="font-size:0.72rem;font-weight:700;color:var(--ch-accent);margin-bottom:8px" data-lang="team_a"></div>
              ${tA.map(function(id) { return `<div class="flex items-center gap-2 mb-2">${ui.avatar(self._pName(id),'sm')}<span style="font-size:0.88rem;font-weight:600">${self._pName(id)}</span></div>`; }).join('')}
            </div>
            <div class="ch-vs-divider" style="align-self:center">${getLang('vs')}</div>
            <div style="flex:1;text-align:center;padding:12px;background:var(--ch-bg-elevated);border-radius:var(--ch-radius-md)">
              <div style="font-size:0.72rem;font-weight:700;color:var(--ch-warning);margin-bottom:8px" data-lang="team_b"></div>
              ${tB.map(function(id) { return `<div class="flex items-center gap-2 mb-2">${ui.avatar(self._pName(id),'sm')}<span style="font-size:0.88rem;font-weight:600">${self._pName(id)}</span></div>`; }).join('')}
            </div>
          </div>
          <div class="ch-section-label" style="margin-top:0;text-align:center" data-lang="pick_winner"></div>
          <div class="flex gap-3">
            <button class="ch-winner-btn"
              onclick="PagePlay.pickWinnerTeamEl(this)"
              data-team="A" data-ta='${JSON.stringify(tA)}' data-tb='${JSON.stringify(tB)}'>
              <div style="font-weight:700" data-lang="team_a"></div>
            </button>
            <button class="ch-winner-btn"
              onclick="PagePlay.pickWinnerTeamEl(this)"
              data-team="B" data-ta='${JSON.stringify(tA)}' data-tb='${JSON.stringify(tB)}'>
              <div style="font-weight:700" data-lang="team_b"></div>
            </button>
          </div>
        </div>`;
    }

    if (mode === 'singapore') {
      var players = state.playing;
      return `
        <div class="ch-match-card playing" style="overflow:hidden">
          <div class="flex justify-around mb-4">
            ${players.map(function(id) {
              return `<div class="ch-player-slot" style="flex:1;text-align:center">
                ${ui.avatar(self._pName(id), 'md')}
                <div class="player-name" style="font-size:0.82rem;margin-top:4px">${self._pName(id)}</div>
              </div>`;
            }).join('')}
          </div>
          <div class="ch-section-label" style="margin-top:0;text-align:center" data-lang="pick_winner"></div>
          <div class="flex flex-col gap-2" style="margin-top:8px">
            ${players.map(function(id) {
              return `<button class="ch-winner-btn"
                style="display:flex;align-items:center;gap:10px;padding:10px 16px;width:100%;box-sizing:border-box"
                onclick="PagePlay.pickWinnerEl(this)"
                data-winner='["' + id + '"]'
                data-players='${JSON.stringify(players)}'>
                ${ui.avatar(self._pName(id), 'sm')}
                <span style="font-weight:600">${self._pName(id)}</span>
              </button>`;
            }).join('')}
          </div>
        </div>`;
    }

    return '';
  },

  _renderNext: function(state) {
    var self = this;
    if (!state || !state.next) return '';
    var mode = state.mode;

    if (mode === 'duel' || mode === 'king_of_table') {
      var p1 = state.next[0];
      var p2 = state.next[1];
      if (!p1 || !p2) return '';
      return `<div class="ch-match-card" style="opacity:0.75;padding:14px 16px">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">${ui.avatar(self._pName(p1),'sm')}<span style="font-size:0.88rem;font-weight:600">${self._pName(p1)}</span></div>
          <div style="color:var(--ch-text-muted);font-size:0.82rem">${getLang('vs')}</div>
          <div class="flex items-center gap-2">${ui.avatar(self._pName(p2),'sm')}<span style="font-size:0.88rem;font-weight:600">${self._pName(p2)}</span></div>
        </div>
      </div>`;
    }

    if (mode === 'team_battle') {
      var tA = state.next.teamA;
      var tB = state.next.teamB;
      return `<div class="ch-match-card" style="opacity:0.75;padding:14px 16px">
        <div class="flex items-center gap-2 flex-wrap">
          ${tA.map(function(id) { return `<div class="flex items-center gap-1">${ui.avatar(self._pName(id),'sm')}<span style="font-size:0.82rem">${self._pName(id)}</span></div>`; }).join('')}
          <div style="color:var(--ch-text-muted);margin:0 4px">${getLang('vs')}</div>
          ${tB.map(function(id) { return `<div class="flex items-center gap-1">${ui.avatar(self._pName(id),'sm')}<span style="font-size:0.82rem">${self._pName(id)}</span></div>`; }).join('')}
        </div>
      </div>`;
    }

    if (mode === 'singapore') {
      return `<div class="ch-match-card" style="opacity:0.75;padding:14px 16px">
        <div class="flex gap-2">
          ${state.next.map(function(id) { return `<div class="flex items-center gap-1">${ui.avatar(self._pName(id),'sm')}<span style="font-size:0.82rem">${self._pName(id)}</span></div>`; }).join('')}
        </div>
      </div>`;
    }

    return '';
  },

  _renderQueue: function(state) {
    var self = this;
    if (!state || !state.queue || state.queue.length === 0) return '';

    return state.queue.map(function(id, i) {
      return `<div class="ch-queue-item">
        <div class="ch-queue-badge">${i + 1}</div>
        ${ui.avatar(self._pName(id), 'sm')}
        <div style="font-size:0.9rem;font-weight:600">${self._pName(id)}</div>
      </div>`;
    }).join('');
  },

  _renderResting: function(state) {
    var self = this;
    if (!state || !state.resting || state.resting.length === 0) return '';
    return `
      <div style="padding:0 16px 8px">
        <div class="ch-section-label" data-lang="resting"></div>
        <div class="flex gap-2 flex-wrap">
          ${state.resting.map(function(id) {
            return `<div class="flex items-center gap-2 ch-queue-item" style="padding:8px 12px">
              ${ui.avatar(self._pName(id), 'sm')}
              <span style="font-size:0.85rem;font-weight:600">${self._pName(id)}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  // Helper untuk Singapore/Team: baca data dari data-attribute agar tidak ada quote conflict di onclick
  pickWinnerEl: function(el) {
    var winnerIds = JSON.parse(el.getAttribute('data-winner'));
    var playerIds = JSON.parse(el.getAttribute('data-players'));
    this.pickWinner(winnerIds, playerIds);
  },

  pickWinnerTeamEl: function(el) {
    var team  = el.getAttribute('data-team');
    var teamA = JSON.parse(el.getAttribute('data-ta'));
    var teamB = JSON.parse(el.getAttribute('data-tb'));
    this.pickWinnerTeam(team, teamA, teamB);
  },

  _renderHistory: function() {
    if (!this._matchHistory || this._matchHistory.length === 0) return '';
    var rows = this._matchHistory.map(function(m, i) {
      var label = m.team ? m.team + ' (' + m.winners.join(', ') + ')' : m.winners.join(' & ');
      return `<div class="flex items-center gap-2" style="padding:6px 0;border-bottom:1px solid var(--ch-border);font-size:0.82rem">
        <span style="color:var(--ch-text-muted);min-width:18px">${i + 1}.</span>
        <span>🏆</span>
        <span style="font-weight:600">${label}</span>
      </div>`;
    }).join('');
    return `
      <div style="padding:0 16px 16px">
        <div class="ch-section-label" data-lang="recent_matches"></div>
        <div>${rows}</div>
      </div>`;
  },

  pickWinner: async function(winnerIds, playerIds) {
    var segId = this._segment.segment_id;
    ui.loading.show();
    var res = await api.match.submitWinner({
      segment_id: segId,
      winner_ids: winnerIds,
      player_ids: playerIds
    });
    ui.loading.hide();

    if (res.success) {
      this._matchCount++;
      this._state = res.data.next_state;
      // Tampilkan ELO change
      var before = res.data.elo_before;
      var after  = res.data.elo_after;
      var winner = this._players[winnerIds[0]];
      var wName  = winner ? winner.player_name : '';
      var wEloChange = after[winnerIds[0]] - before[winnerIds[0]];
      var sign = wEloChange >= 0 ? '+' : '';
      ui.toast.success('🏆 ' + wName + '  ' + sign + wEloChange + ' ELO');
      var wNames = winnerIds.map(function(id) {
        return this._players[id] ? this._players[id].player_name : id.substring(0,6);
      }, this);
      this._matchHistory.unshift({ winners: wNames });
      if (this._matchHistory.length > 10) this._matchHistory.pop();
      this._renderPlay();
    } else {
      ui.toast.apiError(res.error && res.error.code);
    }
  },

  pickWinnerTeam: async function(winnerTeam, teamA, teamB) {
    var winnerIds = winnerTeam === 'A' ? teamA : teamB;
    var playerIds = teamA.concat(teamB);
    var segId = this._segment.segment_id;

    ui.loading.show();
    var res = await api.match.submitWinner({
      segment_id: segId,
      winner_ids: winnerIds,
      player_ids: playerIds,
      team_a    : teamA,
      team_b    : teamB
    });
    ui.loading.hide();

    if (res.success) {
      this._matchCount++;
      this._state = res.data.next_state;
      var tName = getLang('team_' + winnerTeam.toLowerCase());
      ui.toast.success('🏆 ' + tName + ' ' + getLang('winner_label'));
      var wNames = winnerIds.map(function(id) {
        return this._players[id] ? this._players[id].player_name : id.substring(0,6);
      }, this);
      this._matchHistory.unshift({ winners: wNames, team: tName });
      if (this._matchHistory.length > 10) this._matchHistory.pop();
      this._renderPlay();
    } else {
      ui.toast.apiError(res.error && res.error.code);
    }
  },

  pickWinnerTeamEl: function(el) {
    var team    = el.getAttribute('data-team');
    var teamA   = JSON.parse(el.getAttribute('data-ta'));
    var teamB   = JSON.parse(el.getAttribute('data-tb'));
    this.pickWinnerTeam(team, teamA, teamB);
  },

  pickWinnerEl: function(el) {
    var winnerIds = JSON.parse(el.getAttribute('data-winner'));
    var playerIds = JSON.parse(el.getAttribute('data-players'));
    this.pickWinner(winnerIds, playerIds);
  },

  doEndGame: function() {
    var self = this;
    ui.confirm(getLang('confirm_end_game'), async function() {
      ui.loading.show();
      var res = await api.segment.finish({ segment_id: self._segment.segment_id });
      ui.loading.hide();
      if (res.success) {
        store.remove('active_segment_id');
        // Kembali ke Step 2 (pilih mode) dengan player yang sama
        // player_ids dari backend adalah JSON string, perlu di-parse
        var rawIds = self._segment.player_ids || '[]';
        var currentPlayerIds = typeof rawIds === 'string' ? JSON.parse(rawIds) : rawIds;
        history.replaceState(null, '', '#/setup');
        PageSetup.renderFromPlay(currentPlayerIds);
      } else {
        ui.toast.apiError(res.error && res.error.code);
      }
    });
  },

  doShuffle: function() {
    var self = this;
    ui.confirm(getLang('confirm_shuffle'), async function() {
      ui.loading.show();
      var res = await api.segment.shuffle({ segment_id: self._segment.segment_id });
      ui.loading.hide();
      if (res.success) {
        self._state = res.data.state;
        self._renderPlay();
        ui.toast.info('🔀 ' + getLang('shuffle_cycle'));
      } else {
        ui.toast.apiError(res.error && res.error.code);
      }
    });
  }
};

// ─────────────────────────────────────────
// PAGE: PLAYERS (list + add)
// ─────────────────────────────────────────
var PagePlayers = {
  _players: [],

  render: async function() {
    ui.render('<div class="ch-page"><div class="ch-spinner mx-auto mt-5"></div></div>');
    AppShell.renderNav('players');

    var res = await api.player.getAll();
    this._players = res.success ? res.data : [];
    this._renderList();
  },

  _renderList: function() {
    var self = this;

    var listHtml = this._players.length === 0
      ? `<div class="ch-empty">
           <div class="ch-empty-icon">👥</div>
           <div class="ch-empty-title" data-lang="no_players"></div>
           <div class="ch-empty-desc" data-lang="add_first_player"></div>
         </div>`
      : this._players.map(function(p) {
          return `<div class="ch-rank-row" style="cursor:default">
            ${ui.avatar(p.player_name, 'md')}
            <div style="flex:1">
              <div style="font-weight:600">${p.player_name}</div>
              <div style="font-size:0.75rem;color:var(--ch-text-muted)">${p.nickname ? p.nickname + ' · ' : ''}${p.total_games} match</div>
            </div>
            ${ui.eloBadge(p.elo)}
            <button class="ch-btn ch-btn-surface ch-btn-sm" onclick="PagePlayers.showEdit('${p.player_id}')">✎</button>
          </div>`;
        }).join('');

    ui.render(`
      <div>
        <div class="ch-page-header">
          <div class="flex items-center justify-between">
            <h2 class="ch-page-title" data-lang="players"></h2>
            <button class="ch-btn ch-btn-primary ch-btn-sm" onclick="PagePlayers.showAdd()">
              + <span data-lang="add_player"></span>
            </button>
          </div>
        </div>
        <div class="ch-page">
          <div class="ch-search-wrap">
            <span class="search-icon">🔍</span>
            <input class="ch-input" type="text" data-lang-placeholder="search_player"
              oninput="PagePlayers._filter(this.value)">
          </div>
          <div class="flex flex-col gap-2" id="player-list">${listHtml}</div>
        </div>
      </div>`);
    applyLang();
  },

  _filter: function(q) {
    q = q.toLowerCase();
    document.querySelectorAll('#player-list .ch-rank-row').forEach(function(row) {
      var name = row.querySelector('[style*="font-weight:600"]');
      if (name) row.style.display = name.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  showAdd: function() {
    this._showModal();
  },

  showEdit: function(playerId) {
    var p = this._players.find(function(x) { return x.player_id === playerId; });
    if (!p) return;
    this._showModal(p);
  },

  _showModal: function(player) {
    var isEdit = !!player;
    var modalEl = document.getElementById('player-modal');
    if (!modalEl) return;

    modalEl.querySelector('.modal-title').textContent = getLang(isEdit ? 'edit_player' : 'add_player');
    document.getElementById('pm-name').value     = isEdit ? player.player_name : '';
    document.getElementById('pm-nickname').value = isEdit ? (player.nickname || '') : '';
    document.getElementById('pm-player-id').value = isEdit ? player.player_id : '';

    var deleteBtn = document.getElementById('pm-delete');
    deleteBtn.style.display = isEdit ? 'block' : 'none';
    deleteBtn.onclick = function() { PagePlayers.deletePlayer(player.player_id); };

    var bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    document.getElementById('pm-save').onclick = function() { PagePlayers.savePlayer(bsModal); };
  },

  savePlayer: async function(bsModal) {
    var name     = document.getElementById('pm-name').value.trim();
    var nickname = document.getElementById('pm-nickname').value.trim();
    var playerId = document.getElementById('pm-player-id').value;

    if (!name) { ui.toast.warning(getLang('err_NAME_REQUIRED')); return; }

    ui.loading.show();
    var res = playerId
      ? await api.player.update({ player_id: playerId, player_name: name, nickname: nickname })
      : await api.player.create({ player_name: name, nickname: nickname });
    ui.loading.hide();

    if (res.success) {
      bsModal.hide();
      ui.toast.success(getLang('success'));
      var refreshRes = await api.player.getAll();
      this._players = refreshRes.success ? refreshRes.data : [];
      this._renderList();
    } else {
      ui.toast.apiError(res.error && res.error.code);
    }
  },

  deletePlayer: function(playerId) {
    ui.confirm(getLang('delete_confirm'), async function() {
      var bsModal = bootstrap.Modal.getInstance(document.getElementById('player-modal'));
      if (bsModal) bsModal.hide();
      var res = await api.player.delete({ player_id: playerId });
      if (res.success) {
        ui.toast.success(getLang('success'));
        var refreshRes = await api.player.getAll();
        PagePlayers._players = refreshRes.success ? refreshRes.data : [];
        PagePlayers._renderList();
      } else {
        ui.toast.apiError(res.error && res.error.code);
      }
    });
  }
};

// ─────────────────────────────────────────
// PAGE: HISTORY
// ─────────────────────────────────────────
var PageHistory = {
  render: async function() {
    ui.render('<div class="ch-page"><div class="ch-spinner mx-auto mt-5"></div></div>');
    AppShell.renderNav('history');

    var res = await api.session.getAll({ limit: 30 });
    var sessions = res.success ? res.data : [];

    var listHtml = sessions.length === 0
      ? `<div class="ch-empty"><div class="ch-empty-icon">📋</div>
           <div class="ch-empty-title" data-lang="no_history"></div></div>`
      : sessions.map(function(s) {
          var status = s.status === 'ongoing'
            ? '<span style="font-size:0.7rem;color:var(--ch-success);font-weight:700">● LIVE</span>'
            : '';
          return `<div class="ch-card mb-2" style="cursor:pointer" onclick="PageHistory.viewSession('${s.session_id}')">
            <div class="flex items-center justify-between">
              <div>
                <div style="font-weight:700">${getLang('session_number', { n: s.session_number })}</div>
                <div style="font-size:0.78rem;color:var(--ch-text-muted)">${ui.formatDate(s.started_at)}</div>
              </div>
              <div class="flex items-center gap-2">
                ${status}
                <span style="color:var(--ch-text-muted)">›</span>
              </div>
            </div>
            ${s.notes ? `<div style="font-size:0.8rem;color:var(--ch-text-secondary);margin-top:6px">${s.notes}</div>` : ''}
          </div>`;
        }).join('');

    ui.render(`
      <div>
        <div class="ch-page-header">
          <h2 class="ch-page-title" data-lang="history"></h2>
        </div>
        <div class="ch-page">${listHtml}</div>
      </div>`);
    applyLang();
  },

  viewSession: async function(sessionId) {
    ui.loading.show();
    var res = await api.stats.getSession({ session_id: sessionId });
    ui.loading.hide();
    if (!res.success) { ui.toast.apiError(res.error && res.error.code); return; }

    var d = res.data;
    var champ = d.champion_id ? d.player_names[d.champion_id] : null;

    var html = `
      <div>
        <div class="ch-page-header">
          <div class="flex items-center gap-2">
            <button class="ch-btn ch-btn-surface ch-btn-sm" onclick="router.go('history')">‹</button>
            <h2 class="ch-page-title">${getLang('session_number', { n: d.session.session_number })}</h2>
          </div>
        </div>
        <div class="ch-page">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
            <div class="ch-stat-box"><div class="ch-stat-value">${d.total_matches}</div><div class="ch-stat-label" data-lang="total_matches"></div></div>
            <div class="ch-stat-box"><div class="ch-stat-value">${d.total_players}</div><div class="ch-stat-label">Pemain</div></div>
            <div class="ch-stat-box"><div class="ch-stat-value">${d.segments.length}</div><div class="ch-stat-label">Game</div></div>
          </div>
          ${champ ? `
          <div class="ch-card mb-4" style="text-align:center;border-color:var(--ch-accent)">
            <div style="font-size:1.6rem">🏆</div>
            <div style="font-size:0.75rem;color:var(--ch-text-muted);font-weight:700;margin:4px 0 2px" data-lang="champion"></div>
            <div style="font-size:1.1rem;font-weight:700">${champ}</div>
            <div style="font-size:0.8rem;color:var(--ch-text-secondary)">${d.champion_wins} wins</div>
          </div>` : ''}
          <div class="ch-section-label">Segments</div>
          ${d.segments.map(function(seg) {
            return `<div class="ch-card mb-2">
              <div class="flex items-center gap-2">
                <span class="ch-mode-badge">${ui.modeIcon(seg.game_mode)} ${ui.modeName(seg.game_mode)}</span>
                <span style="font-size:0.78rem;color:var(--ch-text-muted)">${ui.formatDate(seg.started_at)}</span>
              </div>
            </div>`;
          }).join('')}
          <div style="margin-top:16px">
            <div class="ch-section-label">Win Count</div>
            ${Object.entries(d.win_counts).sort(function(a,b){return b[1]-a[1];}).map(function(e) {
              return `<div class="ch-queue-item mb-2">
                <div style="flex:1;font-weight:600">${d.player_names[e[0]] || e[0]}</div>
                <div style="font-weight:700;color:var(--ch-success)">${e[1]} 🏆</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    ui.render(html);
    applyLang();
  }
};

// ─────────────────────────────────────────
// PAGE: STATS / LEADERBOARD
// ─────────────────────────────────────────
var PageStats = {
  render: async function() {
    ui.render('<div class="ch-page"><div class="ch-spinner mx-auto mt-5"></div></div>');
    AppShell.renderNav('stats');

    var res = await api.stats.getAllPlayers();
    var players = res.success ? res.data : [];

    var html = `
      <div>
        <div class="ch-page-header">
          <h2 class="ch-page-title" data-lang="leaderboard"></h2>
        </div>
        <div class="ch-page">
          ${players.length === 0
            ? '<div class="ch-empty"><div class="ch-empty-icon">📊</div><div class="ch-empty-title">Belum ada data</div></div>'
            : players.map(function(p, i) {
                var medals = { 0: '🥇', 1: '🥈', 2: '🥉' };
                var rankNum = medals[i] || (i + 1);
                return `<div class="ch-rank-row rank-${i+1} mb-2" onclick="PageStats.viewPlayer('${p.player_id}')">
                  <div class="ch-rank-num">${rankNum}</div>
                  ${ui.avatar(p.player_name, 'md')}
                  <div style="flex:1">
                    <div style="font-weight:700;font-size:0.95rem">${p.player_name}</div>
                    <div style="font-size:0.75rem;color:var(--ch-text-muted)">${p.total_games} match · ${p.win_rate}% WR · ${p.session_count} sesi</div>
                  </div>
                  <div class="flex flex-col items-center gap-1">
                    ${ui.eloBadge(p.elo)}
                  </div>
                </div>`;
              }).join('')
          }
        </div>
      </div>`;
    ui.render(html);
    applyLang();
  },

  viewPlayer: async function(playerId) {
    ui.loading.show();
    var res = await api.stats.getPlayer({ player_id: playerId });
    ui.loading.hide();
    if (!res.success) { ui.toast.apiError(res.error && res.error.code); return; }

    var d = res.data;
    var p = d.player;
    var s = d.stats;
    var eloLabel = d.elo_label;

    var html = `
      <div>
        <div class="ch-page-header">
          <div class="flex items-center gap-2">
            <button class="ch-btn ch-btn-surface ch-btn-sm" onclick="router.go('stats')">‹</button>
            <h2 class="ch-page-title">${p.player_name}</h2>
          </div>
        </div>
        <div class="ch-page">
          <div class="text-center mb-4">
            ${ui.avatar(p.player_name, 'xl')}
            <div style="font-size:1.2rem;font-weight:700;margin-top:12px">${p.player_name}</div>
            ${p.nickname ? `<div style="color:var(--ch-text-muted);font-size:0.85rem">${p.nickname}</div>` : ''}
            <div class="mt-2">${ui.eloBadge(p.elo)} <span style="font-size:0.8rem;color:var(--ch-text-muted);margin-left:4px">${eloLabel.label}</span></div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">
            <div class="ch-stat-box"><div class="ch-stat-value">${p.total_games || 0}</div><div class="ch-stat-label" data-lang="total_matches"></div></div>
            <div class="ch-stat-box"><div class="ch-stat-value text-success">${p.total_wins || 0}</div><div class="ch-stat-label" data-lang="total_wins"></div></div>
            <div class="ch-stat-box"><div class="ch-stat-value" style="color:var(--ch-danger)">${p.total_losses || 0}</div><div class="ch-stat-label" data-lang="total_losses"></div></div>
            <div class="ch-stat-box"><div class="ch-stat-value">${s ? (s.win_rate || 0) : 0}%</div><div class="ch-stat-label" data-lang="win_rate"></div></div>
          </div>

          ${s && s.peak_elo ? `
          <div class="ch-card mb-3">
            <div class="flex justify-between">
              <div><div style="font-size:0.75rem;color:var(--ch-text-muted)" data-lang="peak_elo"></div>
                <div style="font-weight:700;font-size:1.1rem">${s.peak_elo}</div></div>
              <div><div style="font-size:0.75rem;color:var(--ch-text-muted)" data-lang="total_sessions"></div>
                <div style="font-weight:700;font-size:1.1rem">${s.session_count || 0}</div></div>
              <div><div style="font-size:0.75rem;color:var(--ch-text-muted)" data-lang="last_played"></div>
                <div style="font-weight:700;font-size:0.85rem">${ui.formatDateShort(p.last_played_at)}</div></div>
            </div>
          </div>` : ''}

          ${d.elo_history.length > 0 ? `
          <div class="ch-section-label" data-lang="elo_rating"></div>
          <div class="ch-card">
            <div style="display:flex;gap:3px;align-items:flex-end;height:60px">
              ${_renderMiniChart(d.elo_history)}
            </div>
            <div style="font-size:0.72rem;color:var(--ch-text-muted);margin-top:8px">20 match terakhir</div>
          </div>` : ''}
        </div>
      </div>`;
    ui.render(html);
    applyLang();
  }
};

function _renderMiniChart(history) {
  if (!history || history.length === 0) return '';
  var elos = history.map(function(h) { return h.elo || 1000; });
  var min = Math.min.apply(null, elos);
  var max = Math.max.apply(null, elos);
  var range = max - min || 1;

  return elos.map(function(e, i) {
    var pct = ((e - min) / range) * 100;
    var won = history[i].won;
    var color = won ? 'var(--ch-success)' : 'var(--ch-danger)';
    return `<div style="flex:1;background:${color};height:${Math.max(pct, 8)}%;border-radius:3px;opacity:0.8" title="${e}"></div>`;
  }).join('');
}

// ─────────────────────────────────────────
// PAGE: SETTINGS
// ─────────────────────────────────────────
var PageSettings = {
  render: function() {
    AppShell.renderNav('settings');
    var currentTheme = store.getTheme();
    var currentLang  = getCurrentLang();
    var user = store.getUser();

    var themes = [
      { key: 'dark',   labelKey: 'theme_dark',   icon: '🌑' },
      { key: 'light',  labelKey: 'theme_light',  icon: '☀️' },
      { key: 'green',  labelKey: 'theme_green',  icon: '🌿' },
      { key: 'purple', labelKey: 'theme_purple', icon: '💜' },
      { key: 'gold',   labelKey: 'theme_gold',   icon: '✨' }
    ];

    ui.render(`
      <div>
        <div class="ch-page-header">
          <h2 class="ch-page-title" data-lang="settings"></h2>
        </div>
        <div class="ch-page">

          <!-- Profil -->
          <div class="ch-card mb-4">
            <div class="flex items-center gap-3">
              ${ui.avatar(user ? user.display_name : '?', 'md')}
              <div>
                <div style="font-weight:700">${user ? user.display_name : ''}</div>
                <div style="font-size:0.78rem;color:var(--ch-text-muted)">Fasilitator</div>
              </div>
              <button class="ch-btn ch-btn-danger ch-btn-sm" style="margin-left:auto" onclick="PageSettings.logout()">
                <span data-lang="logout"></span>
              </button>
            </div>
          </div>

          <!-- Bahasa -->
          <div class="ch-section-label" data-lang="language"></div>
          <div class="ch-lang-toggle mb-4">
            <button class="ch-lang-btn ${currentLang === 'id' ? 'active' : ''}" onclick="PageSettings.setLang('id')">🇮🇩 Indonesia</button>
            <button class="ch-lang-btn ${currentLang === 'en' ? 'active' : ''}" onclick="PageSettings.setLang('en')">🇬🇧 English</button>
          </div>

          <!-- Tema -->
          <div class="ch-section-label" data-lang="theme"></div>
          <div class="ch-theme-grid mb-4">
            ${themes.map(function(t) {
              return `<div class="ch-theme-option ${currentTheme === t.key ? 'active' : ''}"
                onclick="PageSettings.setTheme('${t.key}')">
                <div style="font-size:1.4rem;margin-bottom:4px">${t.icon}</div>
                <div data-lang="${t.labelKey}"></div>
              </div>`;
            }).join('')}
          </div>

        </div>
      </div>`);
    applyLang();
  },

  setTheme: function(theme) {
    store.setTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.render();
  },

  setLang: function(lang) {
    setLang(lang);
    this.render();
  },

  logout: function() {
    ui.confirm(getLang('logout') + '?', async function() {
      await api.auth.logout();
      store.clear();
      router.go('login');
    });
  }
};

// ─────────────────────────────────────────
// APP SHELL — nav + layout chrome
// ─────────────────────────────────────────
var AppShell = {
  renderNav: function(active) {
    var hasSession = !!store.getSessionId();
    var navItems = [
      { key: 'dashboard', icon: '⚡', labelKey: 'nav_home' },
      { key: 'players',   icon: '👥', labelKey: 'nav_players' },
      { key: 'stats',     icon: '🏆', labelKey: 'leaderboard' },
      { key: 'history',   icon: '📋', labelKey: 'nav_history' }
    ];

    var nav = document.getElementById('bottom-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'bottom-nav';
      nav.className = 'ch-bottom-nav';
      document.body.appendChild(nav);
    }

    nav.innerHTML = navItems.map(function(item) {
      return `<a class="ch-nav-item ${active === item.key ? 'active' : ''}"
        data-nav="${item.key}"
        onclick="router.go('${item.key}')">
        <span class="nav-icon">${item.icon}</span>
        <span data-lang="${item.labelKey}"></span>
      </a>`;
    }).join('');

    applyLang();
  }
};