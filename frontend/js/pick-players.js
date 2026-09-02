(function () {
  var user = requireAuth();
  if (!user) return;

  var allPlayers  = [];
  var selectedIds = {};
  var searchQuery = '';

  var active = getActiveState();
  if (!active || !active.session_id) { goTo('dashboard.html'); return; }

  // Pre-populate jika balik dari pick-mode
  if (active.players && active.players.length) {
    active.players.forEach(function(p) { selectedIds[p.player_id] = true; });
  }

  var searchInput    = document.getElementById('search-input');
  var playerListEl   = document.getElementById('player-list');
  var selectedSec    = document.getElementById('selected-section');
  var selectedChips  = document.getElementById('selected-chips');
  var selectedCount  = document.getElementById('selected-count');
  var btnNext        = document.getElementById('btn-next');
  var btnBack        = document.getElementById('btn-back');
  var btnAddPlayer   = document.getElementById('btn-add-player');
  var addOverlay     = document.getElementById('add-player-overlay');
  var btnCancelAdd   = document.getElementById('btn-cancel-add-player');
  var btnConfirmAdd  = document.getElementById('btn-confirm-add-player');
  var addError       = document.getElementById('add-player-error');

  // ── Load players ──
  function loadPlayers() {
    playerListEl.innerHTML = '<div class="empty-state"><div class="spinner-border"></div></div>';
    Api.player.getAll()
      .then(function(data) { allPlayers = data || []; renderList(); renderChips(); updateNext(); })
      .catch(function(err) {
        playerListEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>' + resolveError(err) + '</p></div>';
      });
  }

  // ── Render player list ──
  function renderList() {
    var q = searchQuery.toLowerCase();
    var list = allPlayers.filter(function(p) {
      if (!q) return true;
      return (p.player_name || '').toLowerCase().indexOf(q) !== -1;
    });

    if (!list.length) {
      playerListEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-users"></i><p>' + getLang('PLAYER_NOT_FOUND') + '</p></div>';
      return;
    }

    playerListEl.innerHTML = list.map(function(p) {
      var sel = !!selectedIds[p.player_id];
      var ini = (p.player_name || '?').split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();
      return '<div class="ch-card player-row-sel' + (sel ? ' is-selected' : '') + '" data-pid="' + esc(p.player_id) + '" role="button">' +
        '<div class="avatar">' + ini + '</div>' +
        '<div class="player-sel-info">' +
          '<div class="player-sel-name">' + esc(p.player_name) + '</div>' +
        '</div>' +
        '<i class="fa-solid ' + (sel ? 'fa-circle-check' : 'fa-circle') + ' sel-icon' + (sel ? ' sel-icon--on' : '') + '"></i>' +
      '</div>';
    }).join('');

    playerListEl.querySelectorAll('[data-pid]').forEach(function(row) {
      row.addEventListener('click', function() { togglePlayer(row.getAttribute('data-pid')); });
    });
  }

  function togglePlayer(pid) {
    if (selectedIds[pid]) delete selectedIds[pid];
    else selectedIds[pid] = true;
    renderList(); renderChips(); updateNext();
  }

  // ── Chips ──
  function renderChips() {
    var ids = Object.keys(selectedIds);
    if (selectedCount) selectedCount.textContent = ids.length;
    if (!ids.length) { if (selectedSec) selectedSec.classList.add('d-none'); return; }
    if (selectedSec) selectedSec.classList.remove('d-none');

    selectedChips.innerHTML = ids.map(function(id) {
      var p = allPlayers.find(function(x){ return x.player_id === id; });
      if (!p) return '';
      return '<span class="player-chip">' + esc(p.player_name) +
        ' <button class="chip-remove" data-rid="' + esc(id) + '"><i class="fa-solid fa-xmark"></i></button>' +
      '</span>';
    }).join('');

    selectedChips.querySelectorAll('[data-rid]').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.stopPropagation(); togglePlayer(btn.getAttribute('data-rid')); });
    });
  }

  function updateNext() {
    btnNext.disabled = Object.keys(selectedIds).length < 2;
  }

  // ── Search ──
  if (searchInput) {
    searchInput.addEventListener('input', function() { searchQuery = this.value.trim(); renderList(); });
  }

  // ── Back ──
  if (btnBack) btnBack.addEventListener('click', function() { goTo('dashboard.html'); });

  // ── Next ──
  btnNext.addEventListener('click', function() {
    var ids = Object.keys(selectedIds);
    if (ids.length < 2) return;
    var selPlayers = ids.map(function(id){ return allPlayers.find(function(x){return x.player_id===id;}); }).filter(Boolean);
    active.players = selPlayers;
    saveActiveState(active);

    showLoading();
    var promises = ids.map(function(pid) {
      return Api.session.addPlayer(active.session_id, pid).catch(function(){});
    });
    Promise.all(promises).then(function() { hideLoading(); goTo('pick-mode.html'); });
  });

  // ── Add new player sheet ──
  if (btnAddPlayer) btnAddPlayer.addEventListener('click', function() {
    document.getElementById('new-player-name').value = '';
    if (addError) addError.classList.add('d-none');
    addOverlay.classList.remove('d-none');
    setTimeout(function(){ document.getElementById('new-player-name').focus(); }, 100);
  });
  if (btnCancelAdd) btnCancelAdd.addEventListener('click', function() { addOverlay.classList.add('d-none'); });
  if (addOverlay) addOverlay.addEventListener('click', function(e) { if (e.target === addOverlay) addOverlay.classList.add('d-none'); });

  if (btnConfirmAdd) {
    btnConfirmAdd.addEventListener('click', function() {
      var name = document.getElementById('new-player-name').value.trim();
      if (addError) addError.classList.add('d-none');
      if (!name) { if (addError) { addError.textContent = getLang('MISSING_FIELD'); addError.classList.remove('d-none'); } return; }

      var lbl = btnConfirmAdd.querySelector('.btn-label');
      var spn = btnConfirmAdd.querySelector('.btn-spinner');
      btnConfirmAdd.disabled = true;
      if (lbl) lbl.classList.add('d-none');
      if (spn) spn.classList.remove('d-none');

      Api.player.create({ player_name: name })
        .then(function(data) {
          btnConfirmAdd.disabled = false;
          if (lbl) lbl.classList.remove('d-none');
          if (spn) spn.classList.add('d-none');
          allPlayers.push({ player_id: data.player_id, player_name: name });
          selectedIds[data.player_id] = true;
          addOverlay.classList.add('d-none');
          renderList(); renderChips(); updateNext();
          showToastMsg('success', getLang('PLAYER_ADDED'));
        })
        .catch(function(err) {
          btnConfirmAdd.disabled = false;
          if (lbl) lbl.classList.remove('d-none');
          if (spn) spn.classList.add('d-none');
          if (addError) { addError.textContent = resolveError(err); addError.classList.remove('d-none'); }
        });
    });
  }

  loadPlayers();
})();
