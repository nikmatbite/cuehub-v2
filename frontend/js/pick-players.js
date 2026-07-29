(function () {

  // ============================================================
  // AUTH GUARD
  // ============================================================
  var user = requireAuth();
  if (!user) return;

  // ============================================================
  // STATE
  // ============================================================
  var allPlayers   = [];   // semua pemain dari API
  var selectedIds  = {};   // { player_id: true }
  var searchQuery  = '';

  // Ambil state aktif (session sudah dibuat di dashboard)
  var active = getActiveState();
  if (!active || !active.session_id) {
    goTo('dashboard.html');
    return;
  }

  // Pre-populate pemain yang sudah ada di active state (kalau balik dari pick-mode)
  if (active.players && active.players.length) {
    active.players.forEach(function (p) { selectedIds[p.player_id] = true; });
  }

  // ============================================================
  // ELEMEN
  // ============================================================
  var searchInput         = document.getElementById('search-input');
  var playerListEl        = document.getElementById('player-list');
  var selectedSection     = document.getElementById('selected-section');
  var selectedChipsEl     = document.getElementById('selected-chips');
  var selectedCountEl     = document.getElementById('selected-count');
  var btnNext             = document.getElementById('btn-next');
  var btnBack             = document.getElementById('btn-back');
  var btnAddPlayer        = document.getElementById('btn-add-player');
  var addPlayerOverlay    = document.getElementById('add-player-overlay');
  var btnCancelAddPlayer  = document.getElementById('btn-cancel-add-player');
  var btnConfirmAddPlayer = document.getElementById('btn-confirm-add-player');
  var addPlayerError      = document.getElementById('add-player-error');

  // ============================================================
  // TOPBAR TITLE
  // ============================================================
  // Set manual karena data-lang di topbar dipakai sebagai placeholder
  document.getElementById('topbar-title').textContent = getLang('PLAYER_ALL');

  // ============================================================
  // LOAD PLAYERS
  // ============================================================
  function loadPlayers() {
    playerListEl.innerHTML = '<div class="empty-state">' +
      '<div class="spinner-border" style="width:1.25rem;height:1.25rem;color:var(--color-primary);"></div>' +
      '</div>';

    Api.player.getAll()
      .then(function (data) {
        allPlayers = data || [];
        renderList();
      })
      .catch(function (err) {
        playerListEl.innerHTML = '<div class="empty-state">' +
          '<i class="fa-solid fa-circle-exclamation"></i>' +
          '<p>' + resolveError(err) + '</p>' +
          '</div>';
      });
  }

  // ============================================================
  // RENDER LIST
  // ============================================================
  function renderList() {
    var query    = searchQuery.toLowerCase();
    var filtered = allPlayers.filter(function (p) {
      if (!query) return true;
      return (p.player_name || '').toLowerCase().indexOf(query) !== -1 ||
             (p.nickname    || '').toLowerCase().indexOf(query) !== -1;
    });

    if (!filtered.length) {
      playerListEl.innerHTML = '<div class="empty-state">' +
        '<i class="fa-solid fa-users"></i>' +
        '<p>' + getLang('PLAYER_NOT_FOUND') + '</p>' +
        '</div>';
      return;
    }

    var html = '';
    filtered.forEach(function (p) {
      var isSelected = !!selectedIds[p.player_id];
      var initials   = (p.player_name || '?').split(' ').slice(0, 2)
        .map(function (w) { return w[0]; }).join('').toUpperCase();

      html += '<div class="ch-card" style="display:flex;align-items:center;gap:.625rem;cursor:pointer;' +
        (isSelected ? 'border-color:var(--color-primary);background:var(--color-primary-soft);' : '') + '"' +
        ' data-player-id="' + esc(p.player_id) + '" role="button">' +
        '<div class="avatar">' + esc(initials) + '</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:.875rem;font-weight:500;">' + esc(p.player_name) + '</div>' +
          (p.nickname ? '<div style="font-size:.75rem;color:var(--color-text-secondary);">' + esc(p.nickname) + '</div>' : '') +
        '</div>' +
        '<i class="ti ' + (isSelected ? 'ti-check' : 'ti-circle') + '" ' +
          'style="font-size:1.1rem;color:' + (isSelected ? 'var(--color-primary)' : 'var(--color-border-strong)') + ';"></i>' +
      '</div>';
    });
    playerListEl.innerHTML = html;

    // Event klik tiap row
    playerListEl.querySelectorAll('[data-player-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        togglePlayer(row.getAttribute('data-player-id'));
      });
    });
  }

  // ============================================================
  // TOGGLE SELECT
  // ============================================================
  function togglePlayer(playerId) {
    if (selectedIds[playerId]) {
      delete selectedIds[playerId];
    } else {
      selectedIds[playerId] = true;
    }
    renderChips();
    renderList();
    updateNextBtn();
  }

  // ============================================================
  // RENDER CHIPS
  // ============================================================
  function renderChips() {
    var ids = Object.keys(selectedIds);
    selectedCountEl.textContent = ids.length;

    if (!ids.length) {
      selectedSection.classList.add('d-none');
      selectedChipsEl.innerHTML = '';
      return;
    }

    selectedSection.classList.remove('d-none');
    var html = '';
    ids.forEach(function (id) {
      var p = findPlayerById(id);
      if (!p) return;
      html += '<span class="player-chip">' +
        esc(p.player_name) +
        ' <button class="chip-remove" data-remove-id="' + esc(id) + '" aria-label="Hapus">'+
          '<i class="fa-solid fa-xmark"></i>' +
        '</button>' +
      '</span>';
    });
    selectedChipsEl.innerHTML = html;

    selectedChipsEl.querySelectorAll('[data-remove-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        togglePlayer(btn.getAttribute('data-remove-id'));
      });
    });
  }

  function findPlayerById(id) {
    for (var i = 0; i < allPlayers.length; i++) {
      if (allPlayers[i].player_id === id) return allPlayers[i];
    }
    return null;
  }

  // ============================================================
  // NEXT BUTTON STATE
  // ============================================================
  function updateNextBtn() {
    var count = Object.keys(selectedIds).length;
    btnNext.disabled = count < 2;
  }

  // ============================================================
  // SEARCH
  // ============================================================
  searchInput.addEventListener('input', function () {
    searchQuery = this.value.trim();
    renderList();
  });

  // ============================================================
  // BACK
  // ============================================================
  btnBack.addEventListener('click', function () {
    goTo('dashboard.html');
  });

  // ============================================================
  // NEXT → pick-mode
  // ============================================================
  btnNext.addEventListener('click', function () {
    var ids = Object.keys(selectedIds);
    if (ids.length < 2) return;

    // Simpan pemain terpilih ke active state
    var selectedPlayers = ids.map(function (id) { return findPlayerById(id); })
                             .filter(Boolean);

    active.players = selectedPlayers;
    saveActiveState(active);

    // Sinkronisasi ke backend (session_players)
    syncSessionPlayers(active.session_id, ids, function () {
      goTo('pick-mode.html');
    });
  });

  function syncSessionPlayers(sessionId, playerIds, callback) {
    // Tambahkan semua player ke session (backend akan ignore duplikat)
    var promises = playerIds.map(function (pid) {
      return Api.session.addPlayer(sessionId, pid).catch(function () {});
    });
    Promise.all(promises).then(function () {
      if (callback) callback();
    }).catch(function () {
      if (callback) callback(); // tetap lanjut meski ada error
    });
  }

  // ============================================================
  // ADD NEW PLAYER SHEET
  // ============================================================
  function openAddPlayer() {
    document.getElementById('new-player-name').value     = '';
    document.getElementById('new-player-nickname').value = '';
    document.getElementById('new-player-phone').value    = '';
    addPlayerError.classList.add('d-none');
    addPlayerOverlay.classList.remove('d-none');
    setTimeout(function () {
      document.getElementById('new-player-name').focus();
    }, 100);
  }

  function closeAddPlayer() {
    addPlayerOverlay.classList.add('d-none');
  }

  btnAddPlayer.addEventListener('click', openAddPlayer);
  btnCancelAddPlayer.addEventListener('click', closeAddPlayer);

  addPlayerOverlay.addEventListener('click', function (e) {
    if (e.target === addPlayerOverlay) closeAddPlayer();
  });

  btnConfirmAddPlayer.addEventListener('click', function () {
    var name     = document.getElementById('new-player-name').value.trim();
    var nickname = document.getElementById('new-player-nickname').value.trim();
    var phone    = document.getElementById('new-player-phone').value.trim();

    addPlayerError.classList.add('d-none');

    if (!name) {
      addPlayerError.textContent = getLang('MISSING_FIELD');
      addPlayerError.classList.remove('d-none');
      return;
    }

    var label   = btnConfirmAddPlayer.querySelector('.btn-label');
    var spinner = btnConfirmAddPlayer.querySelector('.btn-spinner');
    btnConfirmAddPlayer.disabled = true;
    label.classList.add('d-none');
    spinner.classList.remove('d-none');

    Api.player.create({ player_name: name, nickname: nickname, phone: phone })
      .then(function (data) {
        btnConfirmAddPlayer.disabled = false;
        label.classList.remove('d-none');
        spinner.classList.add('d-none');

        // Tambah ke list lokal
        var newPlayer = {
          player_id:   data.player_id,
          player_name: name,
          nickname:    nickname,
          phone:       phone
        };
        allPlayers.push(newPlayer);

        // Auto-select pemain baru
        selectedIds[data.player_id] = true;

        closeAddPlayer();
        renderChips();
        renderList();
        updateNextBtn();

        showToastMsg('success', getLang('SAVED'));
      })
      .catch(function (err) {
        btnConfirmAddPlayer.disabled = false;
        label.classList.remove('d-none');
        spinner.classList.add('d-none');
        addPlayerError.textContent = resolveError(err);
        addPlayerError.classList.remove('d-none');
      });
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

  // ============================================================
  // INIT
  // ============================================================
  loadPlayers();
  renderChips();
  updateNextBtn();

}());