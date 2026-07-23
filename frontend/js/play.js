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
  var isSubmittingResult = false;
  if (!active || !active.session_id || !active.session_game_id) {
    goTo('pick-mode.html');
    return;
  }

  var gameMode       = active.game_mode;       // 'duel' | 'king_of_table' | 'team_battle' | 'singapore' | 'tournament' | 'round_robin' | 'custom'
  var gameConfig     = active.game_config || {};
  var sessionGameId  = active.session_game_id;
  var sessionId      = active.session_id;
  var players        = active.players || [];    // [{player_id, player_name, nickname, ...}]

  // State live
  var currentMatch   = null;   // match object yang sedang berlangsung
  var allMatches     = [];     // semua match dalam session game ini
  var queueState     = [];     // antrian pemain (khusus king_of_table)
  var pendingRanking = {};     // { player_id: rank } untuk mode singapore/custom
  var hasAnyInput    = false;  // flag: sudah ada input (skor/pemenang) belum

  // ============================================================
  // ELEMEN
  // ============================================================
  var btnBack        = document.getElementById('btn-back');
  var topbarTitle    = document.getElementById('play-topbar-title');
  var topbarBadge    = document.getElementById('play-topbar-badge');
  var playLoading    = document.getElementById('play-loading');
  var matchArea      = document.getElementById('play-match-area');
  var actionsBar     = document.getElementById('play-actions');

  // Sheet: winner
  var winnerOverlay  = document.getElementById('winner-overlay');
  var winnerOptions  = document.getElementById('winner-options');

  // Sheet: ranking
  var rankingOverlay = document.getElementById('ranking-overlay');
  var rankingList    = document.getElementById('ranking-list');
  var rankingError   = document.getElementById('ranking-error');
  var btnConfirmRank = document.getElementById('btn-confirm-ranking');

  // Sheet: summary
  var summaryOverlay = document.getElementById('summary-overlay');
  var summaryContent = document.getElementById('summary-content');

  // Sheet: queue
  var queueOverlay   = document.getElementById('queue-overlay');
  var queueListEl    = document.getElementById('queue-list');

  // Sheet: bracket
  var bracketOverlay  = document.getElementById('bracket-overlay');
  var bracketContent  = document.getElementById('bracket-content');

  // ============================================================
  // MODE LABELS
  // ============================================================
  var MODE_LABELS = {
    duel:          'Duel',
    king_of_table: 'King of Table ♛',
    team_battle:   'Team Battle',
    singapore:     'Singapore',
    tournament:    'Tournament',
    round_robin:   'Round Robin',
    custom:        'Custom'
  };

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    topbarTitle.textContent = MODE_LABELS[gameMode] || gameMode;
    topbarBadge.classList.remove('d-none');
    applyTheme(getCurrentTheme());

    loadSessionGame();
  }

  // ============================================================
  // LOAD SESSION GAME & MATCHES
  // ============================================================
  function loadSessionGame() {
    showPlayLoading();

    Api.match.getAll(sessionGameId)
      .then(function (matches) {
        allMatches = (matches || []).map(function (m) {
          if (!m.match_players && m.players) m.match_players = m.players;
          return m;
        });

        // Cari match yang ongoing
        var ongoing = findOngoingMatch(allMatches);
        if (ongoing) {
          currentMatch = ongoing;
          hasAnyInput  = true;
          renderMatch(currentMatch);
        } else {
          // Belum ada match ongoing — buat match pertama / selanjutnya
          createNextMatch();
        }
      })
      .catch(function (err) {
        hidePlayLoading();
        showMatchError(resolveError(err));
      });
  }

  function findOngoingMatch(matches) {
    for (var i = 0; i < matches.length; i++) {
      if (matches[i].status === 'ongoing') return matches[i];
    }
    return null;
  }

  // ============================================================
  // CREATE NEXT MATCH
  // ============================================================
  function createNextMatch() {
    var payload = {
      session_game_id: sessionGameId,
      player_ids:      players.map(function (p) { return p.player_id; })
    };

    Api.match.create(payload)
      .then(function (data) {
        currentMatch = data;
        allMatches.push(data);
        return Api.match.start(data.match_id);
      })
      .then(function (data) {
        if (!data.match_players && data.players) {
          data.match_players = data.players;
        }
        currentMatch = data;
        isSubmittingResult = false;
        renderMatch(currentMatch);
      })
      .catch(function (err) {
        hidePlayLoading();
        showMatchError(resolveError(err));
      });
  }

  // ============================================================
  // RENDER MATCH — router berdasarkan mode
  // ============================================================
  function renderMatch(match) {
    if (!match.match_players && match.players) {
      match.match_players = match.players;
    }

    hidePlayLoading();
    matchArea.classList.remove('d-none');
    actionsBar.classList.remove('d-none');

    updateBackBtn();

    switch (gameMode) {
      case 'duel':        renderDuel(match);       break;
      case 'king_of_table': renderKing(match);     break;
      case 'team_battle': renderTeamBattle(match); break;
      case 'singapore':   renderSingapore(match);  break;
      case 'tournament':  renderTournament(match); break;
      case 'round_robin': renderRoundRobin(match); break;
      case 'custom':      renderCustom(match);     break;
      default:            renderDuel(match);
    }
  }

  // ============================================================
  // MODE: DUEL (1 vs 1)
  // ============================================================
  function renderDuel(match) {
    var mp = match.match_players || [];
    var p1 = mp[0] ? findPlayer(mp[0].player_id) : null;
    var p2 = mp[1] ? findPlayer(mp[1].player_id) : null;

    var matchNo = match.match_no || (allMatches.length);

    matchArea.innerHTML =
      '<div class="section-label">MATCH #' + matchNo + '</div>' +
      '<div class="ch-card" style="margin-bottom:.5rem;">' +
        renderScoreRow(p1, match, true) +
        '<div style="text-align:center;font-size:.75rem;color:var(--color-text-muted);padding:.35rem 0;font-weight:500;">VS</div>' +
        renderScoreRow(p2, match, true) +
      '</div>' +
      renderMatchHistory();

    actionsBar.innerHTML =
      '<button class="btn-ch-danger" style="flex:1;" id="btn-end-game">' +
        '<i class="ti ti-player-stop"></i>' +
        '<span data-lang="PLAY_END_GAME">' + getLang('PLAY_END_GAME') + '</span>' +
      '</button>';

    // Tombol tap nama = menang (ditempel di score rows)
    matchArea.querySelectorAll('.play-winner-btn').forEach(function (btn, index) {
      var winner = index === 0 ? p1 : p2;
      btn.addEventListener('click', function () {
        confirmWinner(winner);
      });
    });

    document.getElementById('btn-end-game').addEventListener('click', function () {
      showConfirm('PLAY_CONFIRM_END_GAME', doEndGame);
    });

    applyLang();
  }

  // ============================================================
  // MODE: KING OF TABLE
  // ============================================================
  function renderKing(match) {
    var mp = match.match_players || [];
    var p1 = mp[0] ? findPlayer(mp[0].player_id) : null;
    var p2 = mp[1] ? findPlayer(mp[1].player_id) : null;
    var matchNo = match.match_no || allMatches.length;

    // Hitung king (pemain dengan win terbanyak)
    var winCounts = {};
    allMatches.forEach(function (m) {
      if (m.status === 'finished' && m.winner_player) {
        winCounts[m.winner_player] = (winCounts[m.winner_player] || 0) + 1;
      }
    });
    var kingId = null;
    var maxWin = 0;
    Object.keys(winCounts).forEach(function (pid) {
      if (winCounts[pid] > maxWin) { maxWin = winCounts[pid]; kingId = pid; }
    });

    matchArea.innerHTML =
      '<div class="section-label">MATCH #' + matchNo + '</div>' +
      '<div class="ch-card" style="margin-bottom:.5rem;">' +
        renderKingRow(p1, match, kingId) +
        '<div style="text-align:center;font-size:.75rem;color:var(--color-text-muted);padding:.35rem 0;font-weight:500;">VS</div>' +
        renderKingRow(p2, match, kingId) +
      '</div>' +
      renderQueuePreview() +
      renderMatchHistory();

    actionsBar.innerHTML =
      '<button class="btn-ch-outline" style="flex:0 0 auto;padding:.6rem .875rem;" id="btn-queue">' +
        '<i class="ti ti-list-numbers"></i>' +
        '<span data-lang="PLAY_QUEUE">' + getLang('PLAY_QUEUE') + '</span>' +
      '</button>' +
      '<button class="btn-ch-danger" style="flex:1;" id="btn-end-game">' +
        '<i class="ti ti-player-stop"></i>' +
        '<span data-lang="PLAY_END_GAME">' + getLang('PLAY_END_GAME') + '</span>' +
      '</button>';

    document.getElementById('btn-queue').addEventListener('click', openQueueSheet);
    document.getElementById('btn-end-game').addEventListener('click', function () {
      showConfirm('PLAY_CONFIRM_END_GAME', doEndGame);
    });

    // Tap nama pemain = menang
    matchArea.querySelectorAll('.play-winner-btn').forEach(function (btn, index) {
      var winner = (index === 0) ? p1 : p2;
      btn.addEventListener('click', function () {
        confirmWinner(winner);
      });
    });

    loadQueue();
    applyLang();
  }

  function renderKingRow(player, match, kingId) {
    if (!player) return '';
    var isKing = player.player_id === kingId;
    var name   = esc(player.player_name) + (isKing ? ' <span style="color:#EF9F27;">♛</span>' : '');
    return '<div class="play-winner-btn" style="display:flex;align-items:center;gap:.625rem;padding:.5rem;cursor:pointer;border-radius:var(--radius-sm);' +
      (isKing ? 'background:var(--color-primary-soft);' : '') + '">' +
      makeAvatar(player.player_name, '') +
      '<div style="flex:1;font-size:.875rem;font-weight:500;">' + name + '</div>' +
      '<i class="ti ti-chevron-right" style="color:var(--color-text-muted);font-size:.875rem;"></i>' +
      '</div>';
  }

  // ============================================================
  // MODE: TEAM BATTLE (2v2)
  // ============================================================
  function renderTeamBattle(match) {
    var mp = match.match_players || [];
    var teamA = mp.filter(function (p) { return p.team === 'A'; });
    var teamB = mp.filter(function (p) { return p.team === 'B'; });
    var matchNo = match.match_no || allMatches.length;

    matchArea.innerHTML =
      '<div class="section-label">MATCH #' + matchNo + ' · TEAM BATTLE</div>' +
      '<div class="ch-card" style="margin-bottom:.5rem;">' +
        '<div class="section-label" style="margin-bottom:.35rem;color:var(--color-primary);">TIM A</div>' +
        renderTeamPlayers(teamA) +
        '<div style="text-align:center;font-size:.75rem;color:var(--color-text-muted);padding:.35rem 0;font-weight:500;">VS</div>' +
        '<div class="section-label" style="margin-bottom:.35rem;color:var(--color-danger);">TIM B</div>' +
        renderTeamPlayers(teamB) +
      '</div>' +
      '<div style="display:flex;gap:.5rem;margin-bottom:.75rem;">' +
        '<button class="btn-ch-primary play-team-win-btn" style="flex:1;background:var(--color-primary);" data-team="A">' +
          getLang('PLAY_TEAM_WIN') + ' A' +
        '</button>' +
        '<button class="btn-ch-primary play-team-win-btn" style="flex:1;background:var(--color-danger);" data-team="B">' +
          getLang('PLAY_TEAM_WIN') + ' B' +
        '</button>' +
      '</div>' +
      renderMatchHistory();

    actionsBar.innerHTML =
      '<button class="btn-ch-danger" style="flex:1;" id="btn-end-game">' +
        '<i class="ti ti-player-stop"></i>' +
        '<span data-lang="PLAY_END_GAME">' + getLang('PLAY_END_GAME') + '</span>' +
      '</button>';

    matchArea.querySelectorAll('.play-team-win-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var team = btn.getAttribute('data-team');
        confirmTeamWin(team, match, teamA, teamB);
      });
    });

    document.getElementById('btn-end-game').addEventListener('click', function () {
      showConfirm('PLAY_CONFIRM_END_GAME', doEndGame);
    });

    applyLang();
  }

  function renderTeamPlayers(teamPlayers) {
    var html = '';
    teamPlayers.forEach(function (mp) {
      var p = findPlayer(mp.player_id);
      if (!p) return;
      html += '<div style="display:flex;align-items:center;gap:.5rem;padding:.35rem 0;">' +
        makeAvatar(p.player_name, 'sm') +
        '<span style="font-size:.875rem;">' + esc(p.player_name) + '</span>' +
        '</div>';
    });
    return html;
  }

  function confirmTeamWin(team, match, teamA, teamB) {
    var winners = (team === 'A' ? teamA : teamB).map(function (mp) {
      return findPlayer(mp.player_id);
    }).filter(Boolean);

    var names = winners.map(function (p) { return p.player_name; }).join(' & ');

    Swal.fire({
      title:            getLang('PLAY_CONFIRM_WIN_TITLE'),
      text:             names + ' ' + getLang('PLAY_WIN_LABEL') + '?',
      icon:             'question',
      showCancelButton:  true,
      confirmButtonText: getLang('YES'),
      cancelButtonText:  getLang('CANCEL'),
      confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
    }).then(function (result) {
      if (!result.isConfirmed) return;
      var winnerIds = (team === 'A' ? teamA : teamB).map(function (mp) { return mp.player_id; });
      finishMatch(match.match_id, null, team, winnerIds);
    });
  }

  // ============================================================
  // MODE: SINGAPORE (ranking 1st–Nth)
  // ============================================================
  function renderSingapore(match) {
    var mp = match.match_players || [];
    var matchPlayers = mp.map(function (mp) { return findPlayer(mp.player_id); }).filter(Boolean);
    var matchNo = match.match_no || allMatches.length;

    matchArea.innerHTML =
      '<div class="section-label">MATCH #' + matchNo + ' · SINGAPORE</div>' +
      '<div class="ch-card" style="margin-bottom:.5rem;">' +
        '<p style="font-size:.8rem;color:var(--color-text-secondary);margin-bottom:.75rem;" data-lang="PLAY_SINGAPORE_HINT">' + getLang('PLAY_SINGAPORE_HINT') + '</p>' +
        renderSingaporeRows(matchPlayers) +
      '</div>' +
      renderMatchHistory();

    actionsBar.innerHTML =
      '<button class="btn-ch-danger" style="flex:1;" id="btn-end-game">' +
        '<i class="ti ti-player-stop"></i>' +
        '<span data-lang="PLAY_END_GAME">' + getLang('PLAY_END_GAME') + '</span>' +
      '</button>' +
      '<button class="btn-ch-primary" style="flex:1;" id="btn-input-rank">' +
        '<i class="ti ti-list-numbers"></i>' +
        '<span data-lang="PLAY_INPUT_RANKING">' + getLang('PLAY_INPUT_RANKING') + '</span>' +
      '</button>';

    document.getElementById('btn-input-rank').addEventListener('click', function () {
      openRankingSheet(matchPlayers, match);
    });
    document.getElementById('btn-end-game').addEventListener('click', function () {
      showConfirm('PLAY_CONFIRM_END_GAME', doEndGame);
    });

    applyLang();
  }

  function renderSingaporeRows(matchPlayers) {
    var html = '';
    matchPlayers.forEach(function (p, i) {
      html += '<div style="display:flex;align-items:center;gap:.625rem;padding:.4rem 0;' +
        (i < matchPlayers.length - 1 ? 'border-bottom:1px solid var(--color-border);' : '') + '">' +
        '<span style="width:1.25rem;font-size:.75rem;color:var(--color-text-muted);text-align:center;">' + (i + 1) + '</span>' +
        makeAvatar(p.player_name, 'sm') +
        '<span style="font-size:.875rem;flex:1;">' + esc(p.player_name) + '</span>' +
        '</div>';
    });
    return html;
  }

  // ============================================================
  // MODE: TOURNAMENT (bracket eliminasi)
  // ============================================================
  function renderTournament(match) {
    var mp = match.match_players || [];
    var p1 = mp[0] ? findPlayer(mp[0].player_id) : null;
    var p2 = mp[1] ? findPlayer(mp[1].player_id) : null;
    var matchNo = match.match_no || allMatches.length;
    var round   = match.round   || 1;

    matchArea.innerHTML =
      '<div class="section-label">MATCH #' + matchNo + ' · RONDE ' + round + '</div>' +
      '<div class="ch-card" style="margin-bottom:.5rem;">' +
        renderScoreRow(p1, match, true) +
        '<div style="text-align:center;font-size:.75rem;color:var(--color-text-muted);padding:.35rem 0;font-weight:500;">VS</div>' +
        renderScoreRow(p2, match, true) +
      '</div>' +
      renderTournamentProgress() +
      renderMatchHistory();

    actionsBar.innerHTML =
      '<button class="btn-ch-outline" style="flex:0 0 auto;padding:.6rem .875rem;" id="btn-bracket">' +
        '<i class="ti ti-tournament"></i>' +
        '<span data-lang="PLAY_BRACKET">' + getLang('PLAY_BRACKET') + '</span>' +
      '</button>' +
      '<button class="btn-ch-danger" style="flex:1;" id="btn-end-game">' +
        '<i class="ti ti-player-stop"></i>' +
        '<span data-lang="PLAY_END_GAME">' + getLang('PLAY_END_GAME') + '</span>' +
      '</button>';

    matchArea.querySelectorAll('.play-winner-btn').forEach(function (btn, index) {
      var winner = (index === 0) ? p1 : p2;
      btn.addEventListener('click', function () {
        confirmWinner(winner);
      });
    });

    document.getElementById('btn-bracket').addEventListener('click', openBracketSheet);
    document.getElementById('btn-end-game').addEventListener('click', function () {
      showConfirm('PLAY_CONFIRM_END_GAME', doEndGame);
    });

    applyLang();
  }

  function renderTournamentProgress() {
    var finished = allMatches.filter(function (m) { return m.status === 'finished'; });
    if (!finished.length) return '';
    var html = '<div class="section-label" style="margin-top:.5rem;">PROGRESS TURNAMEN</div>' +
      '<div class="ch-card" style="margin-bottom:.5rem;">';
    finished.forEach(function (m) {
      var winner = m.winner_player ? findPlayer(m.winner_player) : null;
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:.3rem 0;font-size:.8rem;">' +
        '<span style="color:var(--color-text-secondary);">Match #' + (m.match_no || '') + '</span>' +
        '<span style="font-weight:500;">' + (winner ? esc(winner.player_name) : '—') + ' ✓</span>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  // ============================================================
  // MODE: ROUND ROBIN (semua lawan semua)
  // ============================================================
  function renderRoundRobin(match) {
    var mp = match.match_players || [];
    var p1 = mp[0] ? findPlayer(mp[0].player_id) : null;
    var p2 = mp[1] ? findPlayer(mp[1].player_id) : null;
    var matchNo = match.match_no || allMatches.length;

    // Hitung total match yang akan terjadi (n*(n-1)/2)
    var n = players.length;
    var totalExpected = (n * (n - 1)) / 2;
    var totalFinished = allMatches.filter(function (m) { return m.status === 'finished'; }).length;

    matchArea.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem;">' +
        '<div class="section-label" style="margin:0;">MATCH #' + matchNo + '</div>' +
        '<div style="font-size:.75rem;color:var(--color-text-secondary);">' + totalFinished + '/' + totalExpected + ' selesai</div>' +
      '</div>' +
      '<div class="ch-card" style="margin-bottom:.5rem;">' +
        renderScoreRow(p1, match, true) +
        '<div style="text-align:center;font-size:.75rem;color:var(--color-text-muted);padding:.35rem 0;font-weight:500;">VS</div>' +
        renderScoreRow(p2, match, true) +
      '</div>' +
      renderStandings() +
      renderMatchHistory();

    actionsBar.innerHTML =
      '<button class="btn-ch-danger" style="flex:1;" id="btn-end-game">' +
        '<i class="ti ti-player-stop"></i>' +
        '<span data-lang="PLAY_END_GAME">' + getLang('PLAY_END_GAME') + '</span>' +
      '</button>';

    matchArea.querySelectorAll('.play-winner-btn').forEach(function (btn, index) {
      var winner = (index === 0) ? p1 : p2;
      btn.addEventListener('click', function () {
        confirmWinner(winner);
      });
    });

    document.getElementById('btn-end-game').addEventListener('click', function () {
      showConfirm('PLAY_CONFIRM_END_GAME', doEndGame);
    });

    applyLang();
  }

  function renderStandings() {
    // Hitung win per player dari match selesai
    var wins = {};
    players.forEach(function (p) { wins[p.player_id] = 0; });
    allMatches.forEach(function (m) {
      if (m.status === 'finished' && m.winner_player) {
        wins[m.winner_player] = (wins[m.winner_player] || 0) + 1;
      }
    });

    var sorted = players.slice().sort(function (a, b) {
      return (wins[b.player_id] || 0) - (wins[a.player_id] || 0);
    });

    var html = '<div class="section-label" style="margin-top:.5rem;">KLASEMEN</div><div class="ch-card" style="margin-bottom:.5rem;">';
    sorted.forEach(function (p, i) {
      html += '<div style="display:flex;align-items:center;gap:.625rem;padding:.3rem 0;' +
        (i < sorted.length - 1 ? 'border-bottom:1px solid var(--color-border);' : '') + '">' +
        '<span style="width:1rem;font-size:.75rem;color:var(--color-text-muted);">' + (i + 1) + '</span>' +
        makeAvatar(p.player_name, 'sm') +
        '<span style="flex:1;font-size:.875rem;">' + esc(p.player_name) + '</span>' +
        '<span style="font-size:.85rem;font-weight:500;color:var(--color-primary);">' + (wins[p.player_id] || 0) + 'W</span>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  // ============================================================
  // MODE: CUSTOM
  // ============================================================
  function renderCustom(match) {
    var mp = match.match_players || [];
    var matchPlayers = mp.map(function (mp) { return findPlayer(mp.player_id); }).filter(Boolean);
    var matchNo = match.match_no || allMatches.length;

    // Custom: bisa 1v1 atau multi-player → auto-detect dari match_players
    if (matchPlayers.length === 2) {
      renderDuel(match); // fallback ke duel rendering
      return;
    }

    // Multi-player: tampilkan seperti Singapore
    matchArea.innerHTML =
      '<div class="section-label">MATCH #' + matchNo + ' · CUSTOM</div>' +
      '<div class="ch-card" style="margin-bottom:.5rem;">' +
        renderSingaporeRows(matchPlayers) +
      '</div>' +
      renderMatchHistory();

    actionsBar.innerHTML =
      '<button class="btn-ch-danger" style="flex:1;" id="btn-end-game">' +
        '<i class="ti ti-player-stop"></i>' +
        '<span data-lang="PLAY_END_GAME">' + getLang('PLAY_END_GAME') + '</span>' +
      '</button>' +
      '<button class="btn-ch-primary" style="flex:1;" id="btn-input-rank">' +
        '<i class="ti ti-list-numbers"></i>' +
        '<span data-lang="PLAY_INPUT_RANKING">' + getLang('PLAY_INPUT_RANKING') + '</span>' +
      '</button>';

    document.getElementById('btn-input-rank').addEventListener('click', function () {
      openRankingSheet(matchPlayers, match);
    });
    document.getElementById('btn-end-game').addEventListener('click', function () {
      showConfirm('PLAY_CONFIRM_END_GAME', doEndGame);
    });

    applyLang();
  }

  // ============================================================
  // HELPER: renderScoreRow — nama pemain bisa diklik = menang
  // ============================================================
  function renderScoreRow(player, match, clickable) {
    if (!player) return '';
    var style = clickable
      ? 'cursor:pointer;padding:.5rem;border-radius:var(--radius-sm);'
      : 'padding:.5rem;';
    return '<div class="play-winner-btn" style="display:flex;align-items:center;gap:.625rem;' + style + '">' +
      makeAvatar(player.player_name, '') +
      '<div style="flex:1;font-size:.875rem;font-weight:500;">' + esc(player.player_name) + '</div>' +
      (clickable ? '<i class="ti ti-chevron-right" style="color:var(--color-text-muted);font-size:.875rem;"></i>' : '') +
      '</div>';
  }

  // ============================================================
  // HELPER: renderMatchHistory — riwayat match dalam session game ini
  // ============================================================
  function renderMatchHistory() {
    var finished = allMatches.filter(function (m) { return m.status === 'finished'; });
    if (!finished.length) return '';

    var html = '<div class="section-label" style="margin-top:.25rem;">RIWAYAT</div><div class="ch-card" style="margin-bottom:.5rem;">';
    finished.slice().reverse().forEach(function (m) {
      var winner = null;
      if (m.winner_player) winner = findPlayer(m.winner_player);
      if (m.winner_team)   winner = { player_name: 'Tim ' + m.winner_team };

      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:.3rem 0;font-size:.8rem;">' +
        '<span style="color:var(--color-text-secondary);">Match #' + (m.match_no || '') + '</span>' +
        '<span style="font-weight:500;color:var(--color-success);">' + (winner ? esc(winner.player_name) : '—') + '</span>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  // ============================================================
  // HELPER: renderQueuePreview (King of Table)
  // ============================================================
  function renderQueuePreview() {
    if (!queueState.length) return '';
    var html = '<div class="section-label" style="margin-top:.25rem;">ANTRIAN</div>' +
      '<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-bottom:.5rem;">';
    queueState.forEach(function (q, i) {
      var p = findPlayer(q.player_id);
      if (!p) return;
      html += '<span style="display:inline-flex;align-items:center;gap:.25rem;background:var(--color-surface-2);' +
        'border:1px solid var(--color-border);border-radius:20px;padding:.2rem .6rem;font-size:.75rem;color:var(--color-text-secondary);">' +
        '<span style="color:var(--color-text-muted);font-size:.65rem;">' + (i + 1) + '</span> ' + esc(p.player_name) +
        '</span>';
    });
    html += '</div>';
    return html;
  }

  // ============================================================
  // WINNER SHEET (Duel, King, Tournament, Round Robin)
  // ============================================================
  function closeWinnerSheet() { winnerOverlay.classList.add('d-none'); }

  document.getElementById('btn-cancel-winner').addEventListener('click', closeWinnerSheet);
  winnerOverlay.addEventListener('click', function (e) {
    if (e.target === winnerOverlay) closeWinnerSheet();
  });

  function confirmWinner(winner) {
    if (isSubmittingResult) return;
    Swal.fire({
      title: esc(winner.player_name) + ' ' + getLang('PLAY_WIN_LABEL') + '?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: getLang('YES'),
      cancelButtonText: getLang('CANCEL'),
      confirmButtonColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-success')
        .trim()

    }).then(function (result) {
      if (!result.isConfirmed) return;
      if (isSubmittingResult) return;
      isSubmittingResult = true;
      hasAnyInput = true;
      finishMatch(currentMatch.match_id, winner.player_id, null, null);
    });
  }

  // ============================================================
  // RANKING SHEET (Singapore, Custom multi-player)
  // ============================================================
  function openRankingSheet(matchPlayers, match) {
    pendingRanking = {};
    var rankOrder  = matchPlayers.slice(); // urutan saat ini = ranking

    function renderRankItems() {
      rankingList.innerHTML = '';
      rankOrder.forEach(function (p, i) {
        var item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;gap:.5rem;padding:.5rem;' +
          'background:var(--color-surface-2);border:1px solid var(--color-border);' +
          'border-radius:var(--radius-sm);cursor:pointer;';
        item.innerHTML =
          '<span style="width:1.5rem;font-size:.75rem;color:var(--color-primary);font-weight:600;text-align:center;">' + (i + 1) + '</span>' +
          makeAvatar(p.player_name, 'sm') +
          '<span style="flex:1;font-size:.875rem;">' + esc(p.player_name) + '</span>';

        if (i > 0) {
          var upBtn = document.createElement('button');
          upBtn.className = 'topbar-btn';
          upBtn.innerHTML = '<i class="ti ti-arrow-up"></i>';
          upBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var tmp      = rankOrder[i - 1];
            rankOrder[i - 1] = rankOrder[i];
            rankOrder[i]     = tmp;
            renderRankItems();
          });
          item.appendChild(upBtn);
        }
        if (i < rankOrder.length - 1) {
          var downBtn = document.createElement('button');
          downBtn.className = 'topbar-btn';
          downBtn.innerHTML = '<i class="ti ti-arrow-down"></i>';
          downBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var tmp      = rankOrder[i + 1];
            rankOrder[i + 1] = rankOrder[i];
            rankOrder[i]     = tmp;
            renderRankItems();
          });
          item.appendChild(downBtn);
        }

        rankingList.appendChild(item);
      });
    }

    renderRankItems();
    rankingError.classList.add('d-none');
    rankingOverlay.classList.remove('d-none');

    // Simpan pendingRanking saat confirm
    btnConfirmRank.onclick = function () {
      rankOrder.forEach(function (p, i) {
        pendingRanking[p.player_id] = i + 1;
      });
      closeRankingSheet();
      hasAnyInput = true;
      finishMatchRanking(match.match_id, rankOrder);
    };
  }

  function closeRankingSheet() { rankingOverlay.classList.add('d-none'); }

  document.getElementById('btn-cancel-ranking').addEventListener('click', closeRankingSheet);
  rankingOverlay.addEventListener('click', function (e) {
    if (e.target === rankingOverlay) closeRankingSheet();
  });

  // ============================================================
  // QUEUE SHEET (King of Table)
  // ============================================================
  function loadQueue() {
    Api.queue.get(sessionGameId)
      .then(function (data) {
        queueState = (data || []).filter(function (q) { return q.status === 'waiting'; });
        queueState.sort(function (a, b) { return (a.queue_order || 0) - (b.queue_order || 0); });
        if (currentMatch) {
          renderMatch(currentMatch);
        }
      })
      .catch(function () {});
  }

  function openQueueSheet() {
    renderQueueList();
    queueOverlay.classList.remove('d-none');
  }

  function closeQueueSheet() { queueOverlay.classList.add('d-none'); }

  document.getElementById('btn-close-queue').addEventListener('click', closeQueueSheet);
  queueOverlay.addEventListener('click', function (e) {
    if (e.target === queueOverlay) closeQueueSheet();
  });

  function renderQueueList() {
    var waiting = queueState;
    if (!waiting.length) {
      queueListEl.innerHTML = '<div class="empty-state" style="padding:.75rem 0;">' +
        '<i class="ti ti-list-numbers"></i>' +
        '<p>' + getLang('PLAY_QUEUE_EMPTY') + '</p>' +
        '</div>';

      // Tampilkan semua pemain untuk ditambah ke antrian
      renderAddToQueue();
      return;
    }

    var html = '<div style="display:flex;flex-direction:column;gap:.35rem;margin-bottom:.75rem;">';
    waiting.forEach(function (q, i) {
      var p = findPlayer(q.player_id);
      if (!p) return;
      html += '<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .5rem;' +
        'background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);">' +
        '<span style="width:1.25rem;font-size:.75rem;color:var(--color-text-muted);">' + (i + 1) + '</span>' +
        makeAvatar(p.player_name, 'sm') +
        '<span style="flex:1;font-size:.875rem;">' + esc(p.player_name) + '</span>' +
        '<button class="topbar-btn queue-remove-btn" data-pid="' + esc(q.player_id) + '" aria-label="Hapus">' +
          '<i class="ti ti-x"></i>' +
        '</button>' +
        '</div>';
    });
    html += '</div>';
    queueListEl.innerHTML = html;

    queueListEl.querySelectorAll('.queue-remove-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pid = btn.getAttribute('data-pid');
        Api.queue.remove(sessionGameId, pid)
          .then(function () {
            queueState = queueState.filter(function (q) { return q.player_id !== pid; });
            renderQueueList();
          })
          .catch(function () { showToastMsg('error', resolveError(null)); });
      });
    });

    renderAddToQueue();
  }

  function renderAddToQueue() {
    var waitingIds = queueState.map(function (q) { return q.player_id; });
    var available  = players.filter(function (p) { return waitingIds.indexOf(p.player_id) === -1; });

    if (!available.length) return;

    var addDiv = document.createElement('div');
    addDiv.innerHTML = '<div class="section-label">TAMBAH KE ANTRIAN</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:.35rem;">' +
      available.map(function (p) {
        return '<button class="btn-ch-outline queue-add-btn" style="padding:.3rem .75rem;font-size:.8rem;" data-pid="' + esc(p.player_id) + '">' +
          esc(p.player_name) + ' +' +
          '</button>';
      }).join('') +
      '</div>';
    queueListEl.appendChild(addDiv);

    addDiv.querySelectorAll('.queue-add-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pid = btn.getAttribute('data-pid');
        Api.queue.add(sessionGameId, pid)
          .then(function () {
            return Api.queue.get(sessionGameId);
          })
          .then(function (data) {
            queueState = (data || []).filter(function (q) { return q.status === 'waiting'; });
            queueState.sort(function (a, b) { return (a.queue_order || 0) - (b.queue_order || 0); });
            renderQueueList();
          })
          .catch(function () { showToastMsg('error', resolveError(null)); });
      });
    });
  }

  // ============================================================
  // BRACKET SHEET (Tournament)
  // ============================================================
  function openBracketSheet() {
    renderBracket();
    bracketOverlay.classList.remove('d-none');
  }

  document.getElementById('btn-close-bracket').addEventListener('click', function () {
    bracketOverlay.classList.add('d-none');
  });
  bracketOverlay.addEventListener('click', function (e) {
    if (e.target === bracketOverlay) bracketOverlay.classList.add('d-none');
  });

  function renderBracket() {
    var finished  = allMatches.filter(function (m) { return m.status === 'finished'; });
    var ongoing   = allMatches.filter(function (m) { return m.status === 'ongoing'; });
    var scheduled = allMatches.filter(function (m) { return m.status === 'scheduled'; });

    var allByRound = {};
    allMatches.forEach(function (m) {
      var r = m.round || 1;
      if (!allByRound[r]) allByRound[r] = [];
      allByRound[r].push(m);
    });

    var rounds = Object.keys(allByRound).sort(function (a, b) { return a - b; });
    var html   = '';
    rounds.forEach(function (r) {
      html += '<div class="section-label">RONDE ' + r + '</div>';
      allByRound[r].forEach(function (m) {
        var mp   = m.match_players || [];
        var pa   = mp[0] ? findPlayer(mp[0].player_id) : null;
        var pb   = mp[1] ? findPlayer(mp[1].player_id) : null;
        var done = m.status === 'finished';
        var w    = m.winner_player;

        html += '<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .5rem;' +
          'background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);margin-bottom:.35rem;">' +
          '<span style="font-size:.7rem;color:var(--color-text-muted);width:3rem;">Match #' + (m.match_no || '') + '</span>' +
          '<span style="flex:1;font-size:.8rem;' + (done && w === (pa && pa.player_id) ? 'font-weight:600;color:var(--color-success);' : '') + '">' +
            (pa ? esc(pa.player_name) : '?') + '</span>' +
          '<span style="font-size:.7rem;color:var(--color-text-muted);">vs</span>' +
          '<span style="flex:1;text-align:right;font-size:.8rem;' + (done && w === (pb && pb.player_id) ? 'font-weight:600;color:var(--color-success);' : '') + '">' +
            (pb ? esc(pb.player_name) : '?') + '</span>' +
          (done ? '<i class="ti ti-check" style="color:var(--color-success);font-size:.9rem;"></i>' :
                  '<span class="badge-status ' + (m.status === 'ongoing' ? 'badge-primary' : 'badge-warning') + '">' +
                    getLang('SESSION_' + m.status.toUpperCase()) + '</span>') +
          '</div>';
      });
    });

    bracketContent.innerHTML = html || '<p style="font-size:.875rem;color:var(--color-text-secondary);">Belum ada data bracket.</p>';
  }

  // ============================================================
  // FINISH MATCH — pemenang 1 pemain
  // ============================================================
  function finishMatch(matchId, winnerId, winnerTeam, winnerIds) {
    showLoading();

    var payload = { match_id: matchId };
    if (winnerId)   payload.winner_player = winnerId;
    if (winnerTeam) payload.winner_team   = winnerTeam;

    Api.match.finish(payload)
      .then(function () {
        return Api.match.getAll(sessionGameId);
      })
      .then(function (matches) {
        allMatches = (matches || []).map(function (m) {
          if (!m.match_players && m.players) m.match_players = m.players;
          return m;
        });
        hideLoading();
        isSubmittingResult = false;

        // Setelah finish, cek apakah ada match ongoing berikutnya atau perlu buat baru
        var nextOngoing = findOngoingMatch(allMatches);
        if (nextOngoing) {
          currentMatch = nextOngoing;
          renderMatch(currentMatch);
        } else {
          // Cek apakah ada match scheduled (Tournament: next_match_id)
          var scheduled = allMatches.filter(function (m) { return m.status === 'scheduled'; });
          if (scheduled.length && gameMode === 'tournament') {
            // Auto-start match berikutnya
            Api.match.start(scheduled[0].match_id)
              .then(function (data) {
                currentMatch = data;
                allMatches = allMatches.map(function (m) {
                  return m.match_id === data.match_id ? data : m;
                });
                isSubmittingResult = false;
                renderMatch(currentMatch);
              })
              .catch(function () { doEndGame(); });
          } else if (gameMode === 'round_robin' || gameMode === 'duel' || gameMode === 'king_of_table' || gameMode === 'team_battle') {
            // Mode yang bisa lanjut terus — buat match baru
            createNextMatch();
          } else {
            // Mode yang ada endpoint jelas (Tournament, Singapore satu ronde) — end game
            doEndGame();
          }
        }
      })
      .catch(function (err) {
        isSubmittingResult = false;
        hideLoading();
        showToastMsg('error', resolveError(err));
      });
  }

  // ============================================================
  // FINISH MATCH — ranking (Singapore / Custom)
  // ============================================================
  function finishMatchRanking(matchId, rankOrder) {
    showLoading();

    var rankings = rankOrder.map(function (p, i) {
      return { player_id: p.player_id, ranking: i + 1 };
    });

    var payload = {
      match_id: matchId,
      rankings: rankings
    };

    Api.match.finish(payload)
      .then(function () {
        return Api.match.getAll(sessionGameId);
      })
      .then(function (matches) {
        allMatches = matches || [];
        hideLoading();
        createNextMatch();
      })
      .catch(function (err) {
        hideLoading();
        showToastMsg('error', resolveError(err));
      });
  }

  // ============================================================
  // END GAME — tampilkan ringkasan, lalu end session atau lanjut
  // ============================================================
  function doEndGame() {
    showLoading();

    Api.sessionGame.updateStatus(sessionGameId, 'finished')
      .then(function () {
        return Api.match.getAll(sessionGameId);
      })
      .then(function (matches) {
        allMatches = matches || [];
        hideLoading();
        openSummarySheet();
      })
      .catch(function (err) {
        hideLoading();
        showToastMsg('error', resolveError(err));
      });
  }

  // ============================================================
  // SUMMARY SHEET
  // ============================================================
  function openSummarySheet() {
    var finished = allMatches.filter(function (m) { return m.status === 'finished'; });
    var total    = finished.length;

    // Hitung pemenang terbanyak
    var wins = {};
    finished.forEach(function (m) {
      if (m.winner_player) {
        wins[m.winner_player] = (wins[m.winner_player] || 0) + 1;
      }
    });

    var mvpId   = null;
    var mvpWins = 0;
    Object.keys(wins).forEach(function (pid) {
      if (wins[pid] > mvpWins) { mvpWins = wins[pid]; mvpId = pid; }
    });

    var mvp = mvpId ? findPlayer(mvpId) : null;

    // Hitung streak terpanjang
    var longestStreak = 0;
    var longestStreakName = '';
    var streakPid = null;
    var curStreak = 0;
    finished.forEach(function (m) {
      if (m.winner_player) {
        if (m.winner_player === streakPid) {
          curStreak++;
        } else {
          streakPid = m.winner_player;
          curStreak = 1;
        }
        if (curStreak > longestStreak) {
          longestStreak     = curStreak;
          var sp = findPlayer(streakPid);
          longestStreakName = sp ? sp.player_name : '';
        }
      }
    });

    var html =
      '<div class="stat-row" style="display:flex;justify-content:space-between;font-size:.875rem;color:var(--color-text-secondary);padding:.3rem 0;">' +
        '<span data-lang="PLAY_SUMMARY_MODE">' + getLang('PLAY_SUMMARY_MODE') + '</span>' +
        '<span style="color:var(--color-text);font-weight:500;">' + (MODE_LABELS[gameMode] || gameMode) + '</span>' +
      '</div>' +
      '<div class="stat-row" style="display:flex;justify-content:space-between;font-size:.875rem;color:var(--color-text-secondary);padding:.3rem 0;">' +
        '<span data-lang="PLAY_SUMMARY_TOTAL">' + getLang('PLAY_SUMMARY_TOTAL') + '</span>' +
        '<span style="color:var(--color-text);font-weight:500;">' + total + ' match</span>' +
      '</div>';

    if (mvp) {
      html += '<div class="ch-divider"></div>' +
        '<div class="stat-row" style="display:flex;justify-content:space-between;font-size:.875rem;color:var(--color-text-secondary);padding:.3rem 0;">' +
          '<span>👑 ' + getLang('PLAY_SUMMARY_TOP') + '</span>' +
          '<span style="color:var(--color-text);font-weight:500;">' + esc(mvp.player_name) + ' (' + mvpWins + ' win)</span>' +
        '</div>';
    }

    if (longestStreak > 1) {
      html += '<div class="stat-row" style="display:flex;justify-content:space-between;font-size:.875rem;color:var(--color-text-secondary);padding:.3rem 0;">' +
        '<span data-lang="PLAY_SUMMARY_STREAK">' + getLang('PLAY_SUMMARY_STREAK') + '</span>' +
        '<span style="color:var(--color-text);font-weight:500;">' + esc(longestStreakName) + ' · ' + longestStreak + 'x</span>' +
        '</div>';
    }

    summaryContent.innerHTML = html;
    summaryOverlay.classList.remove('d-none');

    // Nonaktifkan area main
    matchArea.style.opacity = '0.4';
    matchArea.style.pointerEvents = 'none';
    actionsBar.style.opacity = '0.4';
    actionsBar.style.pointerEvents = 'none';
  }

  function closeSummarySheet() {
    summaryOverlay.classList.add('d-none');
    matchArea.style.opacity    = '';
    matchArea.style.pointerEvents = '';
    actionsBar.style.opacity   = '';
    actionsBar.style.pointerEvents = '';
  }

  document.getElementById('btn-close-summary').addEventListener('click', function () {
    closeSummarySheet();
    // Kembali ke pick-players supaya bisa pilih pemain / mode lagi
    // Simpan session_id tapi hapus session_game_id
    active.session_game_id = null;
    active.game_mode       = null;
    active.game_config     = null;
    saveActiveState(active);
    goTo('pick-players.html');
  });

  document.getElementById('btn-end-session').addEventListener('click', function () {
    closeSummarySheet();
    showConfirm('CONFIRM_END_SESSION', function () {
      showLoading();
      Api.statistics.compute(sessionId)
        .then(function () {
          return Api.session.updateStatus(sessionId, 'finished');
        })
        .then(function () {
          hideLoading();
          clearActiveState();
          // Tampilkan toast sukses lalu ke dashboard
          showToast('success', 'SESSION_FINISHED');
          setTimeout(function () { goTo('dashboard.html'); }, 1500);
        })
        .catch(function (err) {
          hideLoading();
          showToastMsg('error', resolveError(err));
        });
    });
  });

  // ============================================================
  // BACK BUTTON — hanya tampil sebelum ada input
  // ============================================================
  function updateBackBtn() {
    if (hasAnyInput) {
      btnBack.classList.add('d-none');
    } else {
      btnBack.classList.remove('d-none');
    }
  }

  btnBack.addEventListener('click', function () {
    showConfirm('PLAY_CONFIRM_BACK', function () {
      goTo('pick-mode.html');
    });
  });

  // ============================================================
  // HELPERS
  // ============================================================
  function showPlayLoading() {
    playLoading.classList.remove('d-none');
    matchArea.classList.add('d-none');
    actionsBar.classList.add('d-none');
  }

  function hidePlayLoading() {
    playLoading.classList.add('d-none');
  }

  function showMatchError(msg) {
    matchArea.classList.remove('d-none');
    matchArea.innerHTML = '<div class="empty-state">' +
      '<i class="ti ti-alert-circle"></i>' +
      '<p>' + esc(msg) + '</p>' +
      '<button class="btn-ch-outline" id="btn-retry" style="margin-top:.75rem;">' +
        getLang('PLAY_RETRY') +
      '</button>' +
      '</div>';
    var retryBtn = document.getElementById('btn-retry');
    if (retryBtn) retryBtn.addEventListener('click', loadSessionGame);
  }

  function findPlayer(playerId) {
    for (var i = 0; i < players.length; i++) {
      if (players[i].player_id === playerId) return players[i];
    }
    return null;
  }

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
  init();

}());