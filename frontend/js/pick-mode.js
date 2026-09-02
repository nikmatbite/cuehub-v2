(function () {
  var user = requireAuth();
  if (!user) return;

  var active = getActiveState();
  if (!active || !active.session_id || !active.players || active.players.length < 2) {
    goTo('pick-players.html'); return;
  }

  var players     = active.players;
  var playerCount = players.length;
  var pendingMode = null;

  // ── Mode definitions (tanpa Custom) ──
  var MODES = [
    { id: 'duel',          icon: 'fa-solid fa-person-falling', name: 'Duel',          descKey: 'MODE_DUEL_DESC',  minPlayers: 2 },
    { id: 'king_of_table', icon: 'fa-solid fa-crown',          name: 'King of Table', descKey: 'MODE_KING_DESC',  minPlayers: 2 },
    { id: 'team_battle',   icon: 'fa-solid fa-users',          name: 'Team Battle',   descKey: 'MODE_TEAM_DESC',  minPlayers: 4, needsConfig: true },
    { id: 'singapore',     icon: 'fa-solid fa-medal',          name: 'Singapore',     descKey: 'MODE_SG_DESC',    minPlayers: 3 }
  ];

  var modeListEl       = document.getElementById('mode-list');
  var infoOverlay      = document.getElementById('info-overlay');
  var teamConfigOverlay= document.getElementById('team-config-overlay');
  var playerChipsEl    = document.getElementById('player-chips');
  var playersReadyLbl  = document.getElementById('players-ready-label');
  var btnBack          = document.getElementById('btn-back');

  // ── Player chips ──
  if (playersReadyLbl) playersReadyLbl.textContent = playerCount + ' ' + getLang('PLAYER_READY').toUpperCase();
  if (playerChipsEl)   playerChipsEl.innerHTML = players.map(function(p){ return '<span class="player-chip">' + esc(p.player_name) + '</span>'; }).join('');

  // ── Render modes ──
  modeListEl.innerHTML = MODES.map(function(m) {
    var ok = playerCount >= m.minPlayers;
    return '<div class="mode-row' + (ok ? '' : ' mode-row--disabled') + '">' +
      '<div class="mode-icon"><i class="' + m.icon + '"></i></div>' +
      '<div class="mode-info">' +
        '<div class="mode-name">' + esc(m.name) + '</div>' +
        '<div class="mode-desc">' + getLang(m.descKey) + '</div>' +
      '</div>' +
      '<button class="btn-icon btn-mode-info" data-info="' + m.id + '" aria-label="Info"><i class="fa-solid fa-circle-info"></i></button>' +
      '<button class="btn-mode-start" data-start="' + m.id + '"' + (ok ? '' : ' disabled') + '>' + getLang('BTN_START') + '</button>' +
    '</div>';
  }).join('');

  modeListEl.addEventListener('click', function(e) {
    var infoBtn  = e.target.closest('[data-info]');
    var startBtn = e.target.closest('[data-start]');
    if (infoBtn)  openInfo(infoBtn.getAttribute('data-info'));
    if (startBtn && !startBtn.disabled) startMode(startBtn.getAttribute('data-start'));
  });

  // ── Info sheet ──
  function getModeById(id) { return MODES.find(function(m){ return m.id === id; }); }

  function openInfo(modeId) {
    var m = getModeById(modeId); if (!m) return;
    document.getElementById('info-icon').innerHTML  = '<i class="' + m.icon + '"></i>';
    document.getElementById('info-title').textContent = m.name;
    document.getElementById('info-desc').textContent  = getLang(m.descKey);
    var startFromInfo = document.getElementById('btn-start-from-info');
    startFromInfo.disabled = playerCount < m.minPlayers;
    pendingMode = modeId;
    infoOverlay.classList.remove('d-none');
  }

  infoOverlay.addEventListener('click', function(e) { if (e.target === infoOverlay) infoOverlay.classList.add('d-none'); });
  document.getElementById('btn-start-from-info').addEventListener('click', function() {
    if (!pendingMode) return;
    infoOverlay.classList.add('d-none');
    startMode(pendingMode);
  });

  // ── Start mode ──
  function startMode(modeId) {
    var m = getModeById(modeId); if (!m) return;
    if (modeId === 'team_battle') { pendingMode = 'team_battle'; openTeamConfig(); return; }
    createSessionGame(modeId, {});
  }

  // ── Team battle config ──
  function openTeamConfig() {
    document.querySelectorAll('input[name="rotation"]').forEach(function(r){ r.checked = r.value === 'fair'; });
    teamConfigOverlay.classList.remove('d-none');
  }
  document.getElementById('btn-cancel-team-config').addEventListener('click', function(){ teamConfigOverlay.classList.add('d-none'); });
  teamConfigOverlay.addEventListener('click', function(e){ if (e.target === teamConfigOverlay) teamConfigOverlay.classList.add('d-none'); });

  document.getElementById('btn-confirm-team-config').addEventListener('click', function() {
    var sel      = document.querySelector('input[name="rotation"]:checked');
    var rotation = sel ? sel.value : 'fair';
    teamConfigOverlay.classList.add('d-none');
    createSessionGame('team_battle', { rotation_mode: rotation, team_size: 2 });
  });

  // ── Create session game ──
  function createSessionGame(modeId, config) {
    showLoading();
    Api.game.getAll()
      .then(function(games) {
        var matched = games.find(function(g) {
          return (g.game_name || '').toLowerCase().replace(/ /g,'_') === modeId;
        });
        if (!matched) throw new Error('GAME_NOT_FOUND');
        return Api.sessionGame.create({
          session_id: active.session_id,
          game_id:    matched.game_id,
          config:     config || {}
        });
      })
      .then(function(data) {
        hideLoading();
        active.session_game_id = data.session_game_id;
        active.game_mode       = modeId;
        active.game_config     = config;
        saveActiveState(active);
        goTo('play.html');
      })
      .catch(function(err) {
        hideLoading();
        showToastMsg('error', resolveError(err));
      });
  }

  // ── Back ──
  if (btnBack) btnBack.addEventListener('click', function(){ goTo('pick-players.html'); });

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
})();
