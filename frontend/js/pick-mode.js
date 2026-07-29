(function () {

  // ============================================================
  // AUTH GUARD
  // ============================================================
  var user = requireAuth();
  if (!user) return;

  // ============================================================
  // STATE
  // ============================================================
  var active = getActiveState();
  if (!active || !active.session_id || !active.players || active.players.length < 2) {
    goTo('pick-players.html');
    return;
  }

  var players       = active.players;
  var playerCount   = players.length;
  var pendingMode   = null; // mode yang sedang dicoba di-start (sebelum confirm)

  // ============================================================
  // DEFINISI SEMUA MODE
  // ============================================================
  var MODES = [
    {
      id:       'duel',
      icon:     'fa-solid fa-person-falling',
      nameKey:  'MODE_SELECT',         // fallback, nama hardcode di bawah
      name:     'Duel',
      descKey:  'MODE_DUEL_DESC',
      minPlayers: 2
    },
    {
      id:       'king_of_table',
      icon:     'fa-solid fa-crown',
      name:     'King of Table',
      descKey:  'MODE_KING_DESC',
      minPlayers: 2
    },
    {
      id:       'team_battle',
      icon:     'fa-solid fa-users',
      name:     'Team Battle',
      descKey:  'MODE_TEAM_DESC',
      minPlayers: 4,
      hasConfig: true
    },
    {
      id:       'singapore',
      icon:     'fa-solid fa-medal',
      name:     'Singapore',
      descKey:  'MODE_SG_DESC',
      minPlayers: 3
    },
    {
      id:       'tournament',
      icon:     'fa-solid fa-trophy',
      name:     'Tournament',
      descKey:  'MODE_TOURN_DESC',
      minPlayers: 4
    },
    {
      id:       'round_robin',
      icon:     'fa-solid fa-repeat',
      name:     'Round Robin',
      descKey:  'MODE_RR_DESC',
      minPlayers: 3
    },
    {
      id:       'custom',
      icon:     'fa-solid fa-sliders',
      name:     'Custom',
      descKey:  'MODE_CUSTOM_DESC',
      minPlayers: 2
    }
  ];

  // ============================================================
  // ELEMEN
  // ============================================================
  var btnBack          = document.getElementById('btn-back');
  var modeListEl       = document.getElementById('mode-list');
  var playerChipsEl    = document.getElementById('player-chips');
  var playersReadyLbl  = document.getElementById('players-ready-label');
  var infoOverlay      = document.getElementById('info-overlay');
  var teamConfigOverlay = document.getElementById('team-config-overlay');

  // ============================================================
  // RENDER PEMAIN SIAP
  // ============================================================
  playersReadyLbl.textContent = playerCount + ' ' + getLang('PLAYER_READY').toUpperCase();

  var chipsHtml = '';
  players.forEach(function (p) {
    chipsHtml += '<span class="player-chip">' + esc(p.player_name) + '</span>';
  });
  playerChipsEl.innerHTML = chipsHtml;

  // ============================================================
  // RENDER MODE LIST
  // ============================================================
  var modeHtml = '';
  MODES.forEach(function (m) {
    var enough  = playerCount >= m.minPlayers;
    var rowStyle = enough ? '' : 'opacity:.45;';
    modeHtml += '<div class="mode-row" style="' + rowStyle + '">' +
      '<div class="mode-icon"><i class="ti ' + m.icon + '"></i></div>' +
      '<div class="mode-info">' +
        '<div class="mode-name">' + esc(m.name) + '</div>' +
        '<div class="mode-desc">' + getLang(m.descKey) + '</div>' +
      '</div>' +
      '<button class="topbar-btn" style="margin-right:.25rem;" data-info-mode="' + m.id + '" aria-label="Info">' +
        '<i class="fa-solid fa-circle-info"></i>' +
      '</button>' +
      '<button class="mode-start" data-start-mode="' + m.id + '"' +
        (enough ? '' : ' disabled') + '>' +
        getLang('BTN_START') +
      '</button>' +
    '</div>';
  });
  modeListEl.innerHTML = modeHtml;

  // ============================================================
  // INFO SHEET
  // ============================================================
  modeListEl.addEventListener('click', function (e) {
    var infoBtn  = e.target.closest('[data-info-mode]');
    var startBtn = e.target.closest('[data-start-mode]');

    if (infoBtn) {
      var modeId = infoBtn.getAttribute('data-info-mode');
      openInfoSheet(modeId);
    }

    if (startBtn && !startBtn.disabled) {
      var modeId = startBtn.getAttribute('data-start-mode');
      startMode(modeId);
    }
  });

  function getModeById(id) {
    for (var i = 0; i < MODES.length; i++) {
      if (MODES[i].id === id) return MODES[i];
    }
    return null;
  }

  function openInfoSheet(modeId) {
    var m = getModeById(modeId);
    if (!m) return;

    document.getElementById('info-icon').innerHTML = '<i class="ti ' + m.icon + '"></i>';
    document.getElementById('info-title').textContent = m.name;
    document.getElementById('info-desc').textContent  = getLang(m.descKey);

    var startBtn = document.getElementById('btn-start-from-info');
    var enough   = playerCount >= m.minPlayers;
    startBtn.disabled = !enough;
    pendingMode = modeId;

    infoOverlay.classList.remove('d-none');
  }

  function closeInfoSheet() { infoOverlay.classList.add('d-none'); }

  infoOverlay.addEventListener('click', function (e) {
    if (e.target === infoOverlay) closeInfoSheet();
  });

  document.getElementById('btn-start-from-info').addEventListener('click', function () {
    if (pendingMode) {
      closeInfoSheet();
      startMode(pendingMode);
    }
  });

  // ============================================================
  // START MODE
  // ============================================================
  function startMode(modeId) {
    var m = getModeById(modeId);
    if (!m) return;

    // Team Battle — butuh config dulu
    if (modeId === 'team_battle') {
      openTeamConfig();
      pendingMode = 'team_battle';
      return;
    }

    createSessionGame(modeId, {});
  }

  // ============================================================
  // TEAM BATTLE CONFIG SHEET
  // ============================================================
  function openTeamConfig() {
    // Reset radio ke fair
    var radios = document.querySelectorAll('input[name="rotation"]');
    radios.forEach(function (r) { r.checked = r.value === 'fair'; });
    teamConfigOverlay.classList.remove('d-none');
  }

  function closeTeamConfig() { teamConfigOverlay.classList.add('d-none'); }

  document.getElementById('btn-cancel-team-config').addEventListener('click', closeTeamConfig);

  teamConfigOverlay.addEventListener('click', function (e) {
    if (e.target === teamConfigOverlay) closeTeamConfig();
  });

  document.getElementById('btn-confirm-team-config').addEventListener('click', function () {
    var selected = document.querySelector('input[name="rotation"]:checked');
    var rotation = selected ? selected.value : 'fair';

    var label   = document.querySelector('#btn-confirm-team-config .btn-label');
    var spinner = document.querySelector('#btn-confirm-team-config .btn-spinner');
    document.getElementById('btn-confirm-team-config').disabled = true;
    label.classList.add('d-none');
    spinner.classList.remove('d-none');

    closeTeamConfig();
    createSessionGame('team_battle', { rotation_mode: rotation });
  });

  // ============================================================
  // CREATE SESSION GAME → navigate ke play.html
  // ============================================================
  function createSessionGame(modeId, config) {
    showLoading();

    // Ambil game_id dari GAME_MASTER berdasarkan game_name / mode
    // Backend sessionGame.create menerima: session_id, game_id, config
    // Tapi kita perlu game_id dari GAME_MASTER dulu
    Api.game.getAll()
      .then(function (games) {
        var matched = null;
        for (var i = 0; i < games.length; i++) {
          // game_name di GAME_MASTER sesuai dengan GAME_MODE constant
          if ((games[i].game_name || '').toLowerCase().replace(/ /g, '_') === modeId) {
            matched = games[i];
            break;
          }
        }
        if (!matched) throw new Error('GAME_NOT_FOUND');
        return matched;
      })
      .then(function (game) {
        var payload = {
          session_id: active.session_id,
          game_id:    game.game_id,
          config:     JSON.stringify(config || {})
        };
        return Api.sessionGame.create(payload);
      })
      .then(function (data) {
        hideLoading();

        // Simpan session_game_id ke active state
        active.session_game_id = data.session_game_id;
        active.game_mode       = modeId;
        active.game_config     = config;
        saveActiveState(active);

        goTo('play.html');
      })
      .catch(function (err) {
        hideLoading();
        showToastMsg('error', resolveError(err));

        // Reset tombol team battle jika ada
        var confirmBtn = document.getElementById('btn-confirm-team-config');
        if (confirmBtn) {
          confirmBtn.disabled = false;
          var label   = confirmBtn.querySelector('.btn-label');
          var spinner = confirmBtn.querySelector('.btn-spinner');
          if (label)   label.classList.remove('d-none');
          if (spinner) spinner.classList.add('d-none');
        }
      });
  }

  // ============================================================
  // BACK
  // ============================================================
  btnBack.addEventListener('click', function () {
    goTo('pick-players.html');
  });

  // ============================================================
  // ESCAPE HELPER
  // ============================================================
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

}());