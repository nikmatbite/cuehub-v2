(function () {

  // ============================================================
  // AUTH GUARD
  // ============================================================
  var user = requireAuth();
  if (!user) return;

  // ============================================================
  // STATE
  // ============================================================
  var currentTab     = 'home';
  var currentHTab    = 'session'; // sub-toggle di History
  var allPlayers     = [];        // cache player list
  var playerSearchQ  = '';

  // ============================================================
  // ELEMEN
  // ============================================================
  var navTabs          = document.querySelectorAll('.nav-tab');
  var tabPanels        = document.querySelectorAll('.tab-panel');
  var btnSettings      = document.getElementById('btn-settings');
  var settingsOverlay  = document.getElementById('settings-overlay');
  var btnStartHome     = document.getElementById('btn-start-home');
  var btnResumeSession = document.getElementById('btn-resume-session');
  var btnNewSession    = document.getElementById('btn-new-session');
  var newSessionOverlay  = document.getElementById('new-session-overlay');
  var btnCancelNewSess   = document.getElementById('btn-cancel-new-session');
  var btnConfirmNewSess  = document.getElementById('btn-confirm-new-session');
  var newSessionError    = document.getElementById('new-session-error');
  var playerSearchInput  = document.getElementById('player-search');
  var historyToggleBtns  = document.querySelectorAll('#history-toggle .nav-link');

  // ============================================================
  // TAB SWITCHING
  // ============================================================
  function switchTab(tab) {
    currentTab = tab;

    navTabs.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });

    tabPanels.forEach(function (panel) {
      panel.classList.add('d-none');
    });
    document.getElementById('tab-' + tab).classList.remove('d-none');

    // Topbar title: Home pakai logo "CueHub", lainnya pakai label
    var topbarTitle = document.querySelector('.topbar-title');
    if (tab === 'home') {
      topbarTitle.textContent = 'CueHub';
    } else {
      var keys = { session: 'NAV_SESSION', players: 'NAV_PLAYERS', history: 'NAV_HISTORY' };
      topbarTitle.textContent = getLang(keys[tab] || 'CueHub');
    }

    // Lazy load per tab
    if (tab === 'home')    loadHome();
    if (tab === 'session') loadSession();
    if (tab === 'players') loadPlayers();
    if (tab === 'history') loadHistory(currentHTab);
  }

  navTabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // ============================================================
  // SETTINGS SHEET
  // ============================================================
  function openSettings() { settingsOverlay.classList.remove('d-none'); }
  function closeSettings() { settingsOverlay.classList.add('d-none'); }

  btnSettings.addEventListener('click', openSettings);

  settingsOverlay.addEventListener('click', function (e) {
    if (e.target === settingsOverlay) closeSettings();
  });

  // Language
  document.getElementById('lang-id').addEventListener('click', function () {
    localStorage.setItem(LANG_KEY, 'id');
    applyLang();
    switchTab(currentTab); // re-render label
    closeSettings();
  });
  document.getElementById('lang-en').addEventListener('click', function () {
    localStorage.setItem(LANG_KEY, 'en');
    applyLang();
    switchTab(currentTab);
    closeSettings();
  });

  // Theme
  document.querySelectorAll('[data-theme-pick]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.getAttribute('data-theme-pick'));
      closeSettings();
    });
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', function () {
    closeSettings();
    showConfirm('CONFIRM_LOGOUT', function () {
      clearSession();
      goTo('index.html');
    });
  });

  // ============================================================
  // NEW SESSION SHEET
  // ============================================================
  function openNewSession() {
    // Default tanggal hari ini
    var today = new Date();
    var yyyy  = today.getFullYear();
    var mm    = String(today.getMonth() + 1).padStart(2, '0');
    var dd    = String(today.getDate()).padStart(2, '0');
    document.getElementById('new-session-date').value = yyyy + '-' + mm + '-' + dd;
    document.getElementById('new-session-title').value = '';
    newSessionError.classList.add('d-none');
    newSessionOverlay.classList.remove('d-none');
  }

  function closeNewSession() { newSessionOverlay.classList.add('d-none'); }

  btnNewSession.addEventListener('click', openNewSession);
  btnCancelNewSess.addEventListener('click', closeNewSession);

  newSessionOverlay.addEventListener('click', function (e) {
    if (e.target === newSessionOverlay) closeNewSession();
  });

  btnConfirmNewSess.addEventListener('click', function () {
    var title = document.getElementById('new-session-title').value.trim();
    var date  = document.getElementById('new-session-date').value;

    newSessionError.classList.add('d-none');

    if (!title || !date) {
      newSessionError.textContent = getLang('MISSING_FIELD');
      newSessionError.classList.remove('d-none');
      return;
    }

    var label   = btnConfirmNewSess.querySelector('.btn-label');
    var spinner = btnConfirmNewSess.querySelector('.btn-spinner');
    btnConfirmNewSess.disabled = true;
    label.classList.add('d-none');
    spinner.classList.remove('d-none');

    Api.session.create({ title: title, date: date })
      .then(function (data) {
        closeNewSession();
        // Simpan session_id ke active state lalu ke pick-players
        var active = getActiveState() || {};
        active.session_id = data.session_id;
        active.session_title = title;
        active.players = [];
        saveActiveState(active);
        goTo('pick-players.html');
      })
      .catch(function (err) {
        btnConfirmNewSess.disabled = false;
        label.classList.remove('d-none');
        spinner.classList.add('d-none');
        newSessionError.textContent = resolveError(err);
        newSessionError.classList.remove('d-none');
      });
  });

  // ============================================================
  // TAB HOME
  // ============================================================
  function loadHome() {
    // Nama user
    document.getElementById('home-display-name').textContent =
      (user.display_name || user.email || '—') + ' 👋';

    // Stats dari localStorage (cache) — refresh dari API
    var playerStats = null;
    Api.statistics.getPlayer(user.user_id)
      .then(function (data) {
        playerStats = data;
        renderHomeStats(data);
      })
      .catch(function () {
        renderHomeStats(null);
      });

    // Last session
    Api.session.getAll()
      .then(function (sessions) {
        var finished = (sessions || []).filter(function (s) {
          return s.status === 'finished';
        });
        finished.sort(function (a, b) {
          return new Date(b.date) - new Date(a.date);
        });
        renderLastSession(finished[0] || null);
      })
      .catch(function () {
        renderLastSession(null);
      });
  }

  function renderHomeStats(data) {
    document.getElementById('stat-total-session').textContent = data ? (data.session || 0) : '—';
    document.getElementById('stat-win-rate').textContent      = data ? formatWinRate(data.win_rate) : '—';
    document.getElementById('stat-total-match').textContent   = data ? (data.match || 0) : '—';
    document.getElementById('stat-streak').textContent        = data ? (data.longest_streak || 0) : '—';
  }

  function renderLastSession(session) {
    var el = document.getElementById('home-last-session');
    if (!session) {
      el.innerHTML = '<div class="empty-state" style="padding:1.25rem 0;">' +
        '<i class="fa-solid fa-circle-dot"></i>' +
        '<p data-lang="DASH_NO_SESSION">' + getLang('DASH_NO_SESSION') + '</p>' +
        '</div>';
      return;
    }
    el.innerHTML = '<div class="ch-card" style="margin-bottom:.75rem;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-size:.875rem;font-weight:600;">' + esc(session.title) + '</span>' +
        '<span class="badge-status badge-success">' + getLang('SESSION_FINISHED') + '</span>' +
      '</div>' +
      '<div style="font-size:.75rem;color:var(--color-text-secondary);margin-top:3px;">' +
        formatDate(session.date) +
      '</div>' +
    '</div>';
  }

  btnStartHome.addEventListener('click', function () { startNewPlay(); });

  // ============================================================
  // TAB SESSION
  // ============================================================
  function loadSession() {
    var active = getActiveState();

    // Banner sesi aktif
    var banner = document.getElementById('session-active-banner');
    if (active && active.session_id) {
      document.getElementById('banner-title').textContent = active.session_title || '—';
      document.getElementById('banner-meta').textContent  = '';
      document.getElementById('banner-status').textContent = getLang('SESSION_ONGOING');
      banner.classList.remove('d-none');
    } else {
      banner.classList.add('d-none');
    }

    // List semua sesi
    var listEl = document.getElementById('session-list');
    listEl.innerHTML = '<div class="empty-state"><div class="spinner-border" style="width:1.25rem;height:1.25rem;color:var(--color-primary);"></div></div>';

    Api.session.getAll()
      .then(function (sessions) {
        renderSessionList(sessions || []);
      })
      .catch(function () {
        listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>' + resolveError(null) + '</p></div>';
      });
  }

  function renderSessionList(sessions) {
    var listEl = document.getElementById('session-list');
    if (!sessions.length) {
      listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-dot"></i><p>' + getLang('HISTORY_NO_DATA') + '</p></div>';
      return;
    }

    sessions.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    var html = '';
    sessions.forEach(function (s) {
      var badgeCls  = statusBadgeClass(s.status);
      var badgeLbl  = getLang('SESSION_' + s.status.toUpperCase()) || s.status;
      html += '<div class="ch-card">' +
        '<div style="display:flex;align-items:center;gap:.625rem;">' +
          '<div style="width:2rem;height:2rem;border-radius:var(--radius-sm);background:var(--color-surface-2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            '<i class="fa-solid fa-circle-dot" style="font-size:1rem;color:var(--color-primary);"></i>' +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
              '<span style="font-size:.875rem;font-weight:600;">' + esc(s.title) + '</span>' +
              '<span class="badge-status ' + badgeCls + '">' + badgeLbl + '</span>' +
            '</div>' +
            '<div style="font-size:.75rem;color:var(--color-text-secondary);margin-top:3px;">' + formatDate(s.date) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    });
    listEl.innerHTML = html;
  }

  btnResumeSession.addEventListener('click', function () {
    goTo('pick-players.html');
  });

  // ============================================================
  // TAB PLAYERS
  // ============================================================
  function loadPlayers() {
    if (allPlayers.length) {
      renderPlayerList(allPlayers, playerSearchQ);
      return;
    }

    var listEl = document.getElementById('player-list');
    listEl.innerHTML = '<div class="empty-state"><div class="spinner-border" style="width:1.25rem;height:1.25rem;color:var(--color-primary);"></div></div>';

    Api.player.getAll()
      .then(function (data) {
        allPlayers = data || [];
        renderPlayerList(allPlayers, '');
      })
      .catch(function () {
        listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>' + resolveError(null) + '</p></div>';
      });
  }

  playerSearchInput.addEventListener('input', function () {
    playerSearchQ = this.value.trim();
    renderPlayerList(allPlayers, playerSearchQ);
  });

  function renderPlayerList(players, query) {
    var listEl = document.getElementById('player-list');

    var filtered = players;
    if (query) {
      var q = query.toLowerCase();
      filtered = players.filter(function (p) {
        return (p.player_name || '').toLowerCase().indexOf(q) !== -1 ||
               (p.nickname || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    if (!filtered.length) {
      listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-users"></i><p>' + getLang('PLAYER_NOT_FOUND') + '</p></div>';
      return;
    }

    var html = '';
    filtered.forEach(function (p) {
      var initials = (p.player_name || '?').split(' ').slice(0, 2)
        .map(function (w) { return w[0]; }).join('').toUpperCase();
      var statHtml = '';
      if (p.win_rate !== undefined || p.session !== undefined) {
        statHtml = '<div class="stat-grid" style="gap:.35rem;margin-top:.5rem;">' +
          '<div class="stat-box" style="padding:.35rem .5rem;">' +
            '<div class="stat-val" style="font-size:.85rem;">' + formatWinRate(p.win_rate) + '</div>' +
            '<div class="stat-lbl">' + getLang('DASH_WIN_RATE') + '</div>' +
          '</div>' +
          '<div class="stat-box" style="padding:.35rem .5rem;">' +
            '<div class="stat-val" style="font-size:.85rem;">' + (p.longest_streak || 0) + '</div>' +
            '<div class="stat-lbl">' + getLang('DASH_STREAK') + '</div>' +
          '</div>' +
        '</div>';
      }

      var sinceDate = p.created_at ? formatDate(p.created_at) : '';
      var metaParts = [];
      if (p.session) metaParts.push(p.session + ' ' + getLang('PLAYER_STATS_SESSION'));
      if (sinceDate) metaParts.push(getLang('PLAYER_STATS_SINCE') + ' ' + sinceDate);

      html += '<div class="ch-card">' +
        '<div style="display:flex;align-items:center;gap:.625rem;">' +
          '<div class="avatar">' + initials + '</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:.875rem;font-weight:600;">' + esc(p.player_name) + '</div>' +
            (p.nickname ? '<div style="font-size:.75rem;color:var(--color-text-secondary);">' + esc(p.nickname) + '</div>' : '') +
          '</div>' +
          (metaParts.length ? '<div style="font-size:.7rem;color:var(--color-text-muted);">' + metaParts.join(' · ') + '</div>' : '') +
        '</div>' +
        statHtml +
      '</div>';
    });
    listEl.innerHTML = html;
  }

  // ============================================================
  // TAB HISTORY
  // ============================================================
  historyToggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      historyToggleBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentHTab = btn.getAttribute('data-htab');
      loadHistory(currentHTab);
    });
  });

  function loadHistory(mode) {
    var listEl = document.getElementById('history-list');
    listEl.innerHTML = '<div class="empty-state"><div class="spinner-border" style="width:1.25rem;height:1.25rem;color:var(--color-primary);"></div></div>';

    if (mode === 'session') {
      Api.session.getAll('finished')
        .then(function (data) { renderHistorySession(data || []); })
        .catch(function () {
          listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>' + resolveError(null) + '</p></div>';
        });
    } else {
      // By game: ambil semua sesi finished, lalu ambil session games per sesi
      Api.session.getAll('finished')
        .then(function (sessions) {
          if (!sessions || !sessions.length) {
            renderHistoryGames([]);
            return Promise.resolve([]);
          }
          // Ambil session games dari sesi terbaru saja (5 terakhir) untuk performa
          sessions.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
          var recent = sessions.slice(0, 5);
          var promises = recent.map(function (s) {
            return Api.sessionGame.getAll(s.session_id)
              .then(function (games) {
                return { session: s, games: games || [] };
              })
              .catch(function () { return { session: s, games: [] }; });
          });
          return Promise.all(promises);
        })
        .then(function (results) {
          if (!results || !results.length) return;
          renderHistoryGames(results);
        })
        .catch(function () {
          listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>' + resolveError(null) + '</p></div>';
        });
    }
  }

  function renderHistorySession(sessions) {
    var listEl = document.getElementById('history-list');
    if (!sessions.length) {
      listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>' + getLang('HISTORY_NO_DATA') + '</p></div>';
      return;
    }
    sessions.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var html = '';
    sessions.forEach(function (s) {
      html += '<div class="ch-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<span style="font-size:.875rem;font-weight:600;">' + esc(s.title) + '</span>' +
          '<span class="badge-status badge-success">' + getLang('SESSION_FINISHED') + '</span>' +
        '</div>' +
        '<div style="font-size:.75rem;color:var(--color-text-secondary);margin-top:3px;">' + formatDate(s.date) + '</div>' +
        (s.notes ? '<div style="font-size:.75rem;color:var(--color-text-muted);margin-top:3px;">' + esc(s.notes) + '</div>' : '') +
      '</div>';
    });
    listEl.innerHTML = html;
  }

  function renderHistoryGames(results) {
    var listEl = document.getElementById('history-list');
    var hasAny = results.some(function (r) { return r.games.length > 0; });
    if (!hasAny) {
      listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>' + getLang('HISTORY_NO_DATA') + '</p></div>';
      return;
    }
    var html = '';
    results.forEach(function (r) {
      r.games.forEach(function (g) {
        html += '<div class="ch-card">' +
          '<div style="font-size:.875rem;font-weight:600;">' + esc(g.game_name || g.game_id) + '</div>' +
          '<div style="font-size:.75rem;color:var(--color-text-secondary);margin-top:3px;">' +
            esc(r.session.title) + ' · ' + formatDate(r.session.date) +
          '</div>' +
        '</div>';
      });
    });
    listEl.innerHTML = html;
  }

  // ============================================================
  // MULAI MAIN (dari Home atau Session)
  // ============================================================
  function startNewPlay() {
    // Cek ada sesi ongoing?
    var active = getActiveState();
    if (active && active.session_id) {
      goTo('pick-players.html');
      return;
    }
    // Belum ada sesi — buka sheet new session
    switchTab('session');
    openNewSession();
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function statusBadgeClass(status) {
    var map = {
      ongoing:   'badge-primary',
      scheduled: 'badge-warning',
      finished:  'badge-success',
      cancelled: 'badge-danger'
    };
    return map[status] || 'badge-primary';
  }

  // ============================================================
  // INIT
  // ============================================================
  switchTab('home');

}());