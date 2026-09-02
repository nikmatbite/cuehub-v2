(function () {
  var user = requireAuth();
  if (!user) return;

  // ── State ──
  var allSessions = [];
  var allPlayers  = [];
  var currentTab  = 'sessions';
  var playerSearchQ = '';
  var sessionFilter = 'all';

  // ── DOM refs ──
  var userNameEl   = document.getElementById('user-name');
  var userAvatarEl = document.getElementById('user-avatar');
  var tabBtns      = document.querySelectorAll('.tab-btn');
  var tabPanels    = document.querySelectorAll('.tab-panel');
  var sessionList  = document.getElementById('session-list');
  var playerList   = document.getElementById('player-list');
  var btnNewSession   = document.getElementById('btn-new-session');
  var btnAddPlayer    = document.getElementById('btn-add-player');
  var filterBtns      = document.querySelectorAll('.filter-btn[data-filter]');
  var playerSearchEl  = document.getElementById('player-search');
  var btnLogout       = document.getElementById('btn-logout');
  var btnTheme        = document.getElementById('btn-theme');

  // ── Init ──
  if (userNameEl)   userNameEl.textContent  = user.display_name || user.email;
  if (userAvatarEl) userAvatarEl.innerHTML  = makeAvatar(user.display_name || user.email);

  // ── Tab switching ──
  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var target = btn.getAttribute('data-tab');
      tabBtns.forEach(function(b) { b.classList.remove('active'); });
      tabPanels.forEach(function(p) { p.classList.add('d-none'); });
      btn.classList.add('active');
      var panel = document.getElementById('tab-' + target);
      if (panel) panel.classList.remove('d-none');
      currentTab = target;
      if (target === 'sessions') loadSessions();
      if (target === 'players')  loadPlayers();
      if (target === 'stats')    loadStats();
    });
  });

  // ── Filter sessions ──
  filterBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      sessionFilter = btn.getAttribute('data-filter');
      renderSessions();
    });
  });

  // ── Player search ──
  if (playerSearchEl) {
    playerSearchEl.addEventListener('input', function() {
      playerSearchQ = this.value.trim().toLowerCase();
      renderPlayerList();
    });
  }

  // ── Logout ──
  if (btnLogout) {
    btnLogout.addEventListener('click', function() {
      showConfirm('LOGOUT_CONFIRM', function() {
        clearSession();
        goTo('index.html');
      });
    });
  }

  // ── Theme cycle ──
  if (btnTheme) {
    btnTheme.addEventListener('click', function() {
      var themes = ['blue', 'green', 'purple', 'gold'];
      var cur    = getCurrentTheme();
      var next   = themes[(themes.indexOf(cur) + 1) % themes.length];
      applyTheme(next);
    });
  }

  // ── New session ──
  if (btnNewSession) {
    btnNewSession.addEventListener('click', function() {
      openNewSessionModal();
    });
  }

  // ── Add player ──
  if (btnAddPlayer) {
    btnAddPlayer.addEventListener('click', function() {
      openAddPlayerModal();
    });
  }

  // ══════════════════════════════════════════
  // SESSIONS
  // ══════════════════════════════════════════
  function loadSessions() {
    sessionList.innerHTML = emptySpinner();
    Api.session.getAll()
      .then(function(data) {
        allSessions = data || [];
        renderSessions();
      })
      .catch(function(err) {
        sessionList.innerHTML = emptyError(resolveError(err));
      });
  }

  function renderSessions() {
    var filtered = allSessions.filter(function(s) {
      if (sessionFilter === 'all') return true;
      return s.status === sessionFilter;
    });

    if (!filtered.length) {
      sessionList.innerHTML = emptyState(getLang('EMPTY_SESSIONS'));
      return;
    }

    sessionList.innerHTML = filtered.map(function(s) {
      var statusCls = {
        scheduled: 'badge-scheduled',
        ongoing:   'badge-ongoing',
        finished:  'badge-finished',
        cancelled: 'badge-cancelled'
      }[s.status] || '';
      return '<div class="ch-card session-card" data-id="' + esc(s.session_id) + '">' +
        '<div class="session-card-header">' +
          '<div class="session-name">' + esc(s.session_name) + '</div>' +
          '<span class="badge ' + statusCls + '">' + getLang('STATUS_' + s.status.toUpperCase()) + '</span>' +
        '</div>' +
        '<div class="session-meta">' +
          '<span><i class="fa-regular fa-calendar"></i> ' + formatDate(s.session_date) + '</span>' +
          '<span><i class="fa-solid fa-location-dot"></i> ' + esc(s.location || '-') + '</span>' +
        '</div>' +
        '<div class="session-meta">' +
          '<span><i class="fa-solid fa-users"></i> ' + (s.player_count || 0) + ' ' + getLang('PLAYERS') + '</span>' +
          '<span><i class="fa-solid fa-gamepad"></i> ' + (s.game_count || 0) + ' ' + getLang('GAMES') + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    sessionList.querySelectorAll('.session-card').forEach(function(card) {
      card.addEventListener('click', function() {
        var id = card.getAttribute('data-id');
        saveActiveState({ session_id: id });
        goTo('pick-mode.html');
      });
    });
  }

  function openNewSessionModal() {
    Swal.fire({
      title: getLang('SESSION_NEW_TITLE'),
      html:
        '<input id="swal-sname" class="swal2-input" placeholder="' + getLang('SESSION_NAME_PH') + '">' +
        '<input id="swal-sloc"  class="swal2-input" placeholder="' + getLang('SESSION_LOC_PH') + '">' +
        '<input id="swal-sdate" class="swal2-input" type="date">',
      showCancelButton: true,
      confirmButtonText: getLang('CREATE'),
      cancelButtonText:  getLang('CANCEL'),
      confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
      preConfirm: function() {
        var name = document.getElementById('swal-sname').value.trim();
        var loc  = document.getElementById('swal-sloc').value.trim();
        var date = document.getElementById('swal-sdate').value;
        if (!name) { Swal.showValidationMessage(getLang('MISSING_FIELD')); return false; }
        return { session_name: name, location: loc, session_date: date || new Date().toISOString().slice(0,10) };
      }
    }).then(function(result) {
      if (!result.isConfirmed) return;
      showLoading();
      Api.session.create(result.value)
        .then(function(data) {
          hideLoading();
          saveActiveState({ session_id: data.session_id });
          goTo('pick-mode.html');
        })
        .catch(function(err) {
          hideLoading();
          showToastMsg('error', resolveError(err));
        });
    });
  }

  // ══════════════════════════════════════════
  // PLAYERS
  // ══════════════════════════════════════════
  function loadPlayers() {
    playerList.innerHTML = emptySpinner();
    Api.player.getAll()
      .then(function(data) {
        allPlayers = data || [];
        renderPlayerList();
      })
      .catch(function(err) {
        playerList.innerHTML = emptyError(resolveError(err));
      });
  }

  function renderPlayerList() {
    var list = allPlayers;
    if (playerSearchQ) {
      list = allPlayers.filter(function(p) {
        return (p.player_name || '').toLowerCase().indexOf(playerSearchQ) !== -1;
      });
    }
    if (!list.length) {
      playerList.innerHTML = emptyState(getLang('EMPTY_PLAYERS'));
      return;
    }
    playerList.innerHTML = list.map(function(p) {
      return '<div class="ch-card player-card" data-id="' + esc(p.player_id) + '">' +
        '<div class="player-row">' +
          makeAvatar(p.player_name) +
          '<div class="player-info">' +
            '<div class="player-name">' + esc(p.player_name) + '</div>' +
            '<div class="player-meta">' +
              '<span>' + getLang('WIN_RATE') + ': ' + formatWinRate(p.win_rate) + '</span>' +
              '<span>' + getLang('MATCHES') + ': ' + (p.total_matches || 0) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="player-actions">' +
            '<button class="btn-icon btn-edit-player" data-id="' + esc(p.player_id) + '" title="' + getLang('EDIT') + '">' +
              '<i class="fa-solid fa-pen"></i>' +
            '</button>' +
            '<button class="btn-icon btn-del-player" data-id="' + esc(p.player_id) + '" title="' + getLang('DELETE') + '">' +
              '<i class="fa-solid fa-trash"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    playerList.querySelectorAll('.btn-edit-player').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var p  = allPlayers.find(function(x) { return x.player_id === id; });
        if (p) openEditPlayerModal(p);
      });
    });
    playerList.querySelectorAll('.btn-del-player').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var p  = allPlayers.find(function(x) { return x.player_id === id; });
        if (!p) return;
        Swal.fire({
          title: getLang('DELETE_CONFIRM'),
          text:  esc(p.player_name),
          icon:  'warning',
          showCancelButton: true,
          confirmButtonText: getLang('DELETE'),
          cancelButtonText:  getLang('CANCEL'),
          confirmButtonColor: 'var(--color-danger)'
        }).then(function(r) {
          if (!r.isConfirmed) return;
          showLoading();
          Api.player.delete(id)
            .then(function() { hideLoading(); loadPlayers(); })
            .catch(function(err) { hideLoading(); showToastMsg('error', resolveError(err)); });
        });
      });
    });
  }

  function openAddPlayerModal() {
    Swal.fire({
      title: getLang('PLAYER_ADD_TITLE'),
      html:  '<input id="swal-pname" class="swal2-input" placeholder="' + getLang('PLAYER_NAME_PH') + '">',
      showCancelButton: true,
      confirmButtonText: getLang('ADD'),
      cancelButtonText:  getLang('CANCEL'),
      confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
      preConfirm: function() {
        var name = document.getElementById('swal-pname').value.trim();
        if (!name) { Swal.showValidationMessage(getLang('MISSING_FIELD')); return false; }
        return { player_name: name };
      }
    }).then(function(result) {
      if (!result.isConfirmed) return;
      showLoading();
      Api.player.create(result.value)
        .then(function() { hideLoading(); loadPlayers(); showToastMsg('success', getLang('PLAYER_ADDED')); })
        .catch(function(err) { hideLoading(); showToastMsg('error', resolveError(err)); });
    });
  }

  function openEditPlayerModal(p) {
    Swal.fire({
      title: getLang('PLAYER_EDIT_TITLE'),
      html:  '<input id="swal-pname" class="swal2-input" value="' + esc(p.player_name) + '">',
      showCancelButton: true,
      confirmButtonText: getLang('SAVE'),
      cancelButtonText:  getLang('CANCEL'),
      confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
      preConfirm: function() {
        var name = document.getElementById('swal-pname').value.trim();
        if (!name) { Swal.showValidationMessage(getLang('MISSING_FIELD')); return false; }
        return { player_id: p.player_id, player_name: name };
      }
    }).then(function(result) {
      if (!result.isConfirmed) return;
      showLoading();
      Api.player.update(result.value)
        .then(function() { hideLoading(); loadPlayers(); showToastMsg('success', getLang('SAVED')); })
        .catch(function(err) { hideLoading(); showToastMsg('error', resolveError(err)); });
    });
  }

  // ══════════════════════════════════════════
  // STATS
  // ══════════════════════════════════════════
  var statsEl = document.getElementById('tab-stats');
  function loadStats() {
    if (!statsEl) return;
    statsEl.innerHTML = emptySpinner();
    Api.statistics.getAllPlayers()
      .then(function(data) {
        var rows = (data || []).sort(function(a,b) {
          return (parseFloat(b.win_rate) || 0) - (parseFloat(a.win_rate) || 0);
        });
        if (!rows.length) { statsEl.innerHTML = emptyState(getLang('EMPTY_STATS')); return; }
        statsEl.innerHTML =
          '<div class="stats-table-wrap">' +
          '<table class="stats-table">' +
          '<thead><tr>' +
            '<th>#</th>' +
            '<th>' + getLang('PLAYER') + '</th>' +
            '<th>' + getLang('MATCHES') + '</th>' +
            '<th>' + getLang('WINS') + '</th>' +
            '<th>' + getLang('WIN_RATE') + '</th>' +
          '</tr></thead><tbody>' +
          rows.map(function(r, i) {
            return '<tr>' +
              '<td>' + (i + 1) + '</td>' +
              '<td>' + makeAvatar(r.player_name, 'sm') + ' ' + esc(r.player_name) + '</td>' +
              '<td>' + (r.total_matches || 0) + '</td>' +
              '<td>' + (r.total_wins || 0) + '</td>' +
              '<td><span class="winrate-badge">' + formatWinRate(r.win_rate) + '</span></td>' +
            '</tr>';
          }).join('') +
          '</tbody></table></div>';
      })
      .catch(function(err) { statsEl.innerHTML = emptyError(resolveError(err)); });
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════
  function emptySpinner() {
    return '<div class="empty-state"><div class="spinner-border"></div></div>';
  }
  function emptyState(msg) {
    return '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>' + msg + '</p></div>';
  }
  function emptyError(msg) {
    return '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>' + msg + '</p></div>';
  }

  // ── Load initial tab ──
  loadSessions();
})();
