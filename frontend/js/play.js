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
  window._debugPlay = function() {
    console.log('allMatches:', JSON.stringify(allMatches, null, 2));
    console.log('currentMatch:', JSON.stringify(currentMatch, null, 2));
  };
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

  function calcDuelRotation(excludeOngoing) {
    // Ambil match yang sudah selesai saja
    var finished = allMatches.filter(function (m) {
      return m.status === 'finished';
    });

    // Hitung lastMatchNo per pemain (0 = belum pernah main)
    var lastMatchNo = {};
    players.forEach(function (p) { lastMatchNo[p.player_id] = 0; });

    finished.forEach(function (m) {
      var mp = m.match_players || m.players || [];
      mp.forEach(function (mp_entry) {
        var pid = mp_entry.player_id;
        var no  = parseInt(m.match_no, 10) || 0;
        if (!lastMatchNo[pid] || no > lastMatchNo[pid]) {
          lastMatchNo[pid] = no;
        }
      });
    });

    // Hitung berapa kali tiap pasangan pernah bertemu
    var meetCount = {};
    finished.forEach(function (m) {
      var mp  = m.match_players || m.players || [];
      var ids = mp.map(function (x) { return x.player_id; });
      if (ids.length >= 2) {
        var key = ids.slice().sort().join('|');
        meetCount[key] = (meetCount[key] || 0) + 1;
      }
    });

    // Sort pemain: lastMatchNo ascending (paling lama tidak main = prioritas)
    var sorted = players.slice().sort(function (a, b) {
      return (lastMatchNo[a.player_id] || 0) - (lastMatchNo[b.player_id] || 0);
    });

    // P1 = paling lama tidak main
    var p1 = sorted[0];
    var candidates = sorted.slice(1);

    // Dari kandidat, cari P2:
    // - Prioritas: lastMatchNo paling kecil
    // - Tiebreaker: paling jarang bertemu P1
    candidates.sort(function (a, b) {
      var lastA = lastMatchNo[a.player_id] || 0;
      var lastB = lastMatchNo[b.player_id] || 0;
      if (lastA !== lastB) return lastA - lastB;

      // Tiebreaker: frekuensi bertemu P1
      var keyA = [p1.player_id, a.player_id].sort().join('|');
      var keyB = [p1.player_id, b.player_id].sort().join('|');
      return (meetCount[keyA] || 0) - (meetCount[keyB] || 0);
    });

    var p2    = candidates[0];
    var queue = candidates.slice(1); // sisa = antrian berikutnya

    return { p1: p1, p2: p2, queue: queue };
  }

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
  var bracketOverlay = document.getElementById('bracket-overlay');
  var bracketContent = document.getElementById('bracket-content');

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

  function makeAvatar(name, size) {
    // Coba pakai fungsi global dari app.js jika ada
    if (typeof window.makeAvatar === 'function') {
      return window.makeAvatar(name, size);
    }
    // Fallback inline
    var initial = (name || '?').charAt(0).toUpperCase();
    var cls = 'avatar' + (size === 'sm' ? ' avatar-sm' : '');
    return '<div class="' + cls + '">' + esc(initial) + '</div>';
  }

  var ICON_END_GAME = '<i class="fa-solid fa-square"></i>';

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    topbarTitle.textContent = MODE_LABELS[gameMode] || gameMode;
    topbarBadge.classList.remove('d-none');
    applyTheme(getCurrentTheme());
    if (!players || players.length === 0) {
      hidePlayLoading();
      showMatchError('Data pemain tidak ditemukan. Kembali dan pilih pemain ulang.');
      btnBack.classList.remove('d-none');
      return;
    }

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
    // Untuk mode duel: hitung rotasi dulu di frontend
    var playerIds;
    if (gameMode === 'duel') {
      var rotation = calcDuelRotation();
      if (!rotation.p1 || !rotation.p2) {
        showMatchError(getLang('PLAY_RETRY'));
        return;
      }
      // Kirim p1 duluan agar backend simpan urutan yang benar
      playerIds = [rotation.p1.player_id, rotation.p2.player_id];
    } else if (gameMode === 'king_of_table') {
      var kingRotation = calcKingRotation();

      if (!kingRotation.king) {
        // Match pertama — belum ada king, pakai 2 pemain pertama
        if (players.length < 2) {
            showMatchError(getLang('PLAY_RETRY'));
            return;
        }
        playerIds = [players[0].player_id, players[1].player_id];
      } else if (!kingRotation.challenger) {
        showMatchError(getLang('PLAY_RETRY'));
        return;
      } else {
        playerIds = [kingRotation.king.player_id, kingRotation.challenger.player_id];
      }
    } else {
      playerIds = players.map(function (p) { return p.player_id; });
    }

    var payload = {
      session_game_id: sessionGameId,
      players:         playerIds
    };

    Api.match.create(payload)
      .then(function (data) {
        currentMatch = data;
        allMatches.push(data);
        return Api.match.start(data.match_id);
      })
      .then(function (startData) {
        // start() tidak return players — ambil dari allMatches yang sudah ada
        var matchInList = null;
        for (var i = 0; i < allMatches.length; i++) {
          if (allMatches[i].match_id === startData.match_id) {
            matchInList = allMatches[i];
            break;
          }
        }
        var matchPlayers = matchInList
          ? (matchInList.players || matchInList.match_players || [])
          : [];
        currentMatch = Object.assign({}, startData, {
          match_players: matchPlayers,
          players:       matchPlayers
        });
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
    if (!match.match_players || match.match_players.length === 0) {
      match.match_players = players.map(function (p) {
        return { player_id: p.player_id, team: p.team || null, ranking: null };
      });
    }

    hidePlayLoading();
    matchArea.classList.remove('d-none');
    actionsBar.classList.remove('d-none');

    updateBackBtn();

    switch (gameMode) {
      case 'duel':          renderDuel(match);       break;
      case 'king_of_table': renderKing(match);       break;
      case 'team_battle':   renderTeamBattle(match); break;
      case 'singapore':     renderSingapore(match);  break;
      case 'tournament':    renderTournament(match); break;
      case 'round_robin':   renderRoundRobin(match); break;
      case 'custom':        renderCustom(match);     break;
      default:              renderDuel(match);
    }
  }
  function buildEndGameBtn() {
    return '<button class="btn-ch-danger" style="flex:1;" id="btn-end-game">' +
      ICON_END_GAME +
      '<span data-lang="PLAY_END_GAME">' + getLang('PLAY_END_GAME') + '</span>' +
      '</button>';
  }

  function attachEndGameListener() {
    var btn = document.getElementById('btn-end-game');
    if (btn) {
      btn.addEventListener('click', function () {
        showConfirm('PLAY_CONFIRM_END_GAME', doEndGame);
      });
    }
  }

  // ============================================================
  // MODE: DUEL (1 vs 1)
  // ============================================================
  function renderDuel(match) {
    var mp = match.match_players || [];
    var p1 = mp[0] ? findPlayer(mp[0].player_id) : null;
    var p2 = mp[1] ? findPlayer(mp[1].player_id) : null;
    var matchNo = match.match_no || allMatches.length;

    // Hitung win count per pemain dari riwayat
    var wins = {};
    players.forEach(function (p) { wins[p.player_id] = 0; });
    allMatches.forEach(function (m) {
      if (m.status === 'finished' && m.winner_player) {
        wins[m.winner_player] = (wins[m.winner_player] || 0) + 1;
      }
    });

    // Hitung next match & queue dari rotasi
    // Simulasi seolah match ini sudah selesai untuk kalkulasi next
    var nextRotation = calcDuelNextAfterCurrent(match, p1, p2);

    // ── MATCH HEADER ──
    var html =
      '<div class="duel-match-header">' +
        '<div class="duel-match-label">' + getLang('PLAY_NOW_PLAYING') + '</div>' +
        '<div class="duel-match-title">MATCH ' + matchNo + '</div>' +
        '<div class="duel-match-hint">' + getLang('PLAY_WIN_TAP_HINT') + '</div>' +
      '</div>';

    // ── PLAYER CARDS ──
    html += '<div class="duel-arena">' +
      renderDuelPlayerCard(p1, wins[p1 && p1.player_id] || 0) +
      '<div class="duel-vs-badge">VS</div>' +
      renderDuelPlayerCard(p2, wins[p2 && p2.player_id] || 0) +
    '</div>';

    // ── NEXT MATCH ──
    if (nextRotation && nextRotation.p1 && nextRotation.p2) {
      html +=
        '<div class="duel-section-row">' +
          '<div class="duel-section-line"></div>' +
          '<span class="duel-section-label">' + getLang('PLAY_NEXT_MATCH') + '</span>' +
          '<div class="duel-section-line"></div>' +
        '</div>' +
        '<div class="duel-next-card">' +
          '<span class="duel-next-name">' + esc(nextRotation.p1.player_name) + '</span>' +
          '<span class="duel-next-vs">VS</span>' +
          '<span class="duel-next-name">' + esc(nextRotation.p2.player_name) + '</span>' +
        '</div>';

      // ── QUEUE ──
      if (nextRotation.queue && nextRotation.queue.length) {
        html +=
          '<div class="duel-section-row">' +
            '<div class="duel-section-line"></div>' +
            '<span class="duel-section-label">' + getLang('PLAY_QUEUE_LABEL') + '</span>' +
            '<div class="duel-section-line"></div>' +
          '</div>' +
          '<div class="duel-queue-grid">';
        nextRotation.queue.forEach(function (p, i) {
          html += '<div class="duel-queue-chip">' +
            '<span class="duel-queue-num">#' + (i + 1) + '</span>' +
            '<span>' + esc(p.player_name) + '</span>' +
          '</div>';
        });
        html += '</div>';
      }
    }

    // ── RIWAYAT ──
    var finished = allMatches.filter(function (m) { return m.status === 'finished'; });
    if (finished.length) {
      var historyId = 'duel-history-' + Date.now();
      html +=
        '<div class="duel-section-row" style="margin-top:.875rem;margin-bottom:.375rem;">' +
          '<div class="duel-section-line"></div>' +
          '<span class="duel-section-label">' + getLang('PLAY_HISTORY') + '</span>' +
          '<div class="duel-section-line"></div>' +
        '</div>' +
        '<div class="ch-card" style="padding:.375rem .75rem;">' +
          '<div class="duel-history-toggle" id="' + historyId + '-toggle">' +
            '<span style="font-size:.8rem;color:var(--color-text-secondary);font-weight:500;">' + getLang('PLAY_HISTORY') + ' (' + finished.length + ')</span>' +
            '<i class="fa-solid fa-chevron-down" id="' + historyId + '-chevron" style="font-size:.75rem;color:var(--color-text-muted);transition:transform .2s;"></i>' +
          '</div>' +
          '<div class="duel-history-rows" id="' + historyId + '-rows" style="display:none;">';
      finished.slice().reverse().forEach(function (m) {
        var mp2    = m.match_players || m.players || [];
        var mP1    = mp2[0] ? findPlayer(mp2[0].player_id) : null;
        var mP2    = mp2[1] ? findPlayer(mp2[1].player_id) : null;
        var winner = m.winner_player ? findPlayer(m.winner_player) : null;
        var isP1Win = winner && mP1 && winner.player_id === mP1.player_id;
        var winClass = isP1Win ? 'p1-color' : 'p2-color';
        html += '<div class="duel-history-row">' +
          '<span class="duel-history-match">#' + (m.match_no || '') + '</span>' +
          '<span class="duel-history-names">' +
            (mP1 ? esc(mP1.player_name) : '?') + ' vs ' + (mP2 ? esc(mP2.player_name) : '?') +
          '</span>' +
          '<span class="duel-history-winner ' + (winner ? winClass : '') + '">' +
            '<i class="fa-solid fa-trophy" style="font-size:.65rem;"></i>' +
            (winner ? esc(winner.player_name) : '—') +
          '</span>' +
        '</div>';
      });
      html += '</div></div>';
    }

    matchArea.innerHTML = html;
    actionsBar.innerHTML = buildEndGameBtn();

    // Bind klik player card
    var cards = matchArea.querySelectorAll('.duel-player-card');
    if (cards[0] && p1) {
      cards[0].addEventListener('click', function () { confirmWinner(p1); });
    }
    if (cards[1] && p2) {
      cards[1].addEventListener('click', function () { confirmWinner(p2); });
    }

    attachEndGameListener();

    var histToggle = document.getElementById(historyId + '-toggle');
    if (histToggle) {
      histToggle.addEventListener('click', function () {
        var rows    = document.getElementById(historyId + '-rows');
        var chevron = document.getElementById(historyId + '-chevron');
        if (!rows) return;
        var isOpen = rows.style.display !== 'none';
        rows.style.display    = isOpen ? 'none' : 'block';
        chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
      });
    }

    applyLang();
  }

  function renderDuelPlayerCard(player, winCount, colorClass) {
    if (!player) {
      return '<div class="duel-player-card" style="opacity:.4;">—</div>';
    }
    var initial = (player.player_name || '?').charAt(0).toUpperCase();
    var winsHtml = winCount > 0
      ? '<span class="duel-player-wins"><i class="fa-solid fa-trophy"></i> WIN &times;' + winCount + '</span>'
      : '<span style="min-height:1.1rem;display:block;"></span>';
    return '<div class="duel-player-card">' +
      '<div class="duel-player-avatar">' + esc(initial) + '</div>' +
      '<div class="duel-player-name">' + esc(player.player_name) + '</div>' +
      winsHtml +
    '</div>';
  }

  // Hitung next match seolah match saat ini sudah selesai
  // (tanpa tahu siapa menang, kita simulasi keduanya sudah main)
  function calcDuelNextAfterCurrent(match, p1, p2) {
    if (!p1 || !p2) return null;

    // Buat salinan allMatches + tambahkan match saat ini sebagai "finished"
    var simulatedFinished = allMatches.filter(function (m) {
      return m.status === 'finished';
    }).concat([{
      match_id:      match.match_id,
      match_no:      match.match_no,
      status:        'finished',
      winner_player: '',
      match_players: match.match_players || []
    }]);

    // Hitung lastMatchNo dari simulasi
    var lastMatchNo = {};
    players.forEach(function (p) { lastMatchNo[p.player_id] = 0; });
    simulatedFinished.forEach(function (m) {
      var mp = m.match_players || m.players || [];
      mp.forEach(function (entry) {
        var pid = entry.player_id;
        var no  = parseInt(m.match_no, 10) || 0;
        if (!lastMatchNo[pid] || no > lastMatchNo[pid]) {
          lastMatchNo[pid] = no;
        }
      });
    });

    // Hitung meetCount dari simulasi
    var meetCount = {};
    simulatedFinished.forEach(function (m) {
      var mp  = m.match_players || m.players || [];
      var ids = mp.map(function (x) { return x.player_id; });
      if (ids.length >= 2) {
        var key = ids.slice().sort().join('|');
        meetCount[key] = (meetCount[key] || 0) + 1;
      }
    });

    // Sort
    var sorted = players.slice().sort(function (a, b) {
      return (lastMatchNo[a.player_id] || 0) - (lastMatchNo[b.player_id] || 0);
    });

    var nextP1     = sorted[0];
    var candidates = sorted.slice(1);

    candidates.sort(function (a, b) {
      var lastA = lastMatchNo[a.player_id] || 0;
      var lastB = lastMatchNo[b.player_id] || 0;
      if (lastA !== lastB) return lastA - lastB;
      var keyA = [nextP1.player_id, a.player_id].sort().join('|');
      var keyB = [nextP1.player_id, b.player_id].sort().join('|');
      return (meetCount[keyA] || 0) - (meetCount[keyB] || 0);
    });

    return {
      p1:    nextP1,
      p2:    candidates[0] || null,
      queue: candidates.slice(1)
    };
  }

  // ============================================================
  // MODE: KING OF TABLE
  // ============================================================
  function calcKingRotation() {
    var finished = allMatches.filter(function (m) {
      return m.status === 'finished';
    });

    // Hitung lastMatchNo per pemain — siapa terakhir kali main
    var lastMatchNo = {};
    players.forEach(function (p) { lastMatchNo[p.player_id] = 0; });

    finished.forEach(function (m) {
      var mp = m.match_players || m.players || [];
      mp.forEach(function (entry) {
        var pid = entry.player_id;
        var no  = parseInt(m.match_no, 10) || 0;
        if (no > (lastMatchNo[pid] || 0)) lastMatchNo[pid] = no;
      });
    });

    // King = pemenang match terakhir yang selesai
    var king = null;
    if (finished.length) {
      var lastFinished = finished.slice().sort(function (a, b) {
        return (parseInt(b.match_no, 10) || 0) - (parseInt(a.match_no, 10) || 0);
      })[0];
      king = findPlayer(lastFinished.winner_player);
    }
    // Fallback: belum ada match selesai, king = p1 di currentMatch
    if (!king && currentMatch) {
      var mp0 = (currentMatch.match_players || [])[0];
      if (mp0) king = findPlayer(mp0.player_id);
    }

    // Antrian = semua pemain kecuali king
    // Urut ascending lastMatchNo — yang paling lama tidak main = duluan
    var queue = players.filter(function (p) {
      return !king || p.player_id !== king.player_id;
    }).sort(function (a, b) {
      return (lastMatchNo[a.player_id] || 0) - (lastMatchNo[b.player_id] || 0);
    });

    var challenger  = queue[0] || null;
    var waiting     = queue.slice(1);

    // Hitung streak king
    var streak = 0;
    if (king && finished.length) {
      var sorted = finished.slice().sort(function (a, b) {
        return (parseInt(a.match_no, 10) || 0) - (parseInt(b.match_no, 10) || 0);
      });
      for (var i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].winner_player === king.player_id) {
          streak++;
        } else {
          break;
        }
      }
    }

    return { king: king, challenger: challenger, waiting: waiting, streak: streak };
  }

  function renderKing(match) {
    var matchNo  = match.match_no || allMatches.length;
    var rotation = calcKingRotation();
    var king        = rotation.king;
    var challenger  = rotation.challenger;
    var waiting     = rotation.waiting;
    var streak      = rotation.streak;

    // Next challenger = waiting[0]
    var nextChallenger = waiting[0] || null;
    // Sisa antrian setelah next challenger
    var queueRest = waiting.slice(1);

    // ── MATCH HEADER ──
    var html =
      '<div class="king-match-header">' +
        '<div class="king-match-label">' + getLang('PLAY_NOW_PLAYING') + '</div>' +
        '<div class="king-match-title">MATCH ' + matchNo + '</div>' +
        '<div class="king-match-hint">' + getLang('PLAY_WIN_TAP_HINT') + '</div>' +
      '</div>';

    // ── ARENA ──
    html += '<div class="king-arena">' +
      renderKingPlayerCard(king, streak, true) +
      '<div class="king-vs-badge">VS</div>' +
      renderKingPlayerCard(challenger, 0, false) +
    '</div>';

    // ── NEXT MATCH ──
    if (nextChallenger) {
      html +=
        '<div class="king-section-row">' +
          '<div class="king-section-line"></div>' +
          '<span class="king-section-label">' + getLang('PLAY_NEXT_MATCH') + '</span>' +
          '<div class="king-section-line"></div>' +
        '</div>' +
        '<div class="king-next-card">' +
          '<span class="king-next-winner">' + getLang('PLAY_WINNER') + '</span>' +
          '<span class="king-next-vs">VS</span>' +
          '<span class="king-next-name">' + esc(nextChallenger.player_name) + '</span>' +
        '</div>';
    }

    // ── QUEUE (sisa setelah next challenger) ──
    if (queueRest.length) {
      html +=
        '<div class="king-section-row">' +
          '<div class="king-section-line"></div>' +
          '<span class="king-section-label">' + getLang('PLAY_QUEUE_LABEL') + '</span>' +
          '<div class="king-section-line"></div>' +
        '</div>' +
        '<div class="king-queue-grid">';
      queueRest.forEach(function (p, i) {
        html += '<div class="king-queue-chip">' +
          '<span class="king-queue-num">#' + (i + 2) + '</span>' +
          '<span>' + esc(p.player_name) + '</span>' +
        '</div>';
      });
      html += '</div>';
    }

    // ── RIWAYAT ──
    var finished = allMatches.filter(function (m) { return m.status === 'finished'; });
    if (finished.length) {
      var historyId = 'king-history-' + Date.now();
      html +=
        '<div class="king-section-row" style="margin-top:.875rem;margin-bottom:.375rem;">' +
          '<div class="king-section-line"></div>' +
          '<span class="king-section-label">' + getLang('PLAY_HISTORY') + '</span>' +
          '<div class="king-section-line"></div>' +
        '</div>' +
        '<div class="ch-card" style="padding:.375rem .75rem;">' +
          '<div class="king-history-toggle">' +
            '<span style="font-size:.8rem;color:var(--color-text-secondary);font-weight:500;">' +
              getLang('PLAY_HISTORY') + ' (' + finished.length + ')' +
            '</span>' +
            '<i class="fa-solid fa-chevron-down king-history-chevron" style="font-size:.75rem;color:var(--color-text-muted);transition:transform .2s;"></i>' +
          '</div>' +
          '<div class="king-history-rows" style="display:none;">';

      finished.slice().reverse().forEach(function (m) {
        var mp2    = m.match_players || m.players || [];
        var mP1    = mp2[0] ? findPlayer(mp2[0].player_id) : null;
        var mP2    = mp2[1] ? findPlayer(mp2[1].player_id) : null;
        var winner = m.winner_player ? findPlayer(m.winner_player) : null;

        // Warna pemenang: warning = king menang (tetap), primary = challenger menang (upset)
        // Kita cek siapa king di match itu: pakai match sebelumnya winner, atau p1 kalau match #1
        var winnerIsKing = winner && mP1 && winner.player_id === mP1.player_id;
        var winColorStyle = winnerIsKing
          ? 'color:var(--color-warning);'
          : 'color:var(--color-primary);';

        html += '<div class="king-history-row">' +
          '<span class="king-history-match">#' + (m.match_no || '') + '</span>' +
          '<span class="king-history-names">' +
            (mP1 ? esc(mP1.player_name) : '?') + ' vs ' + (mP2 ? esc(mP2.player_name) : '?') +
          '</span>' +
          '<span class="king-history-winner" style="' + winColorStyle + '">' +
            '<i class="fa-solid fa-crown" style="font-size:.65rem;"></i> ' +
            (winner ? esc(winner.player_name) : '—') +
          '</span>' +
        '</div>';
      });

      html += '</div></div>';
    }

    matchArea.innerHTML = html;

    // Action bar — hanya End Game, tanpa tombol Antrian
    actionsBar.innerHTML = buildEndGameBtn();
    attachEndGameListener();

    // Bind klik card
    var cards = matchArea.querySelectorAll('.king-player-card');
    if (cards[0] && king) {
      cards[0].addEventListener('click', function () { confirmWinner(king); });
    }
    if (cards[1] && challenger) {
      cards[1].addEventListener('click', function () { confirmWinner(challenger); });
    }

    // Toggle riwayat
    var toggle  = matchArea.querySelector('.king-history-toggle');
    var rows    = matchArea.querySelector('.king-history-rows');
    var chevron = matchArea.querySelector('.king-history-chevron');
    if (toggle && rows) {
      toggle.addEventListener('click', function () {
        var isOpen = rows.style.display !== 'none';
        rows.style.display      = isOpen ? 'none' : 'block';
        if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
      });
    }

    applyLang();
  }

  function renderKingPlayerCard(player, streak, isKing) {
    if (!player) {
      return '<div class="king-player-card" style="opacity:.4;">—</div>';
    }
    var cardClass  = 'king-player-card' + (isKing ? ' is-king' : '');
    var badgeClass = isKing ? 'badge-king' : 'badge-challenger';
    var badgeText  = isKing ? 'KING' : 'CHALLENGER';
    var avatarContent = isKing
      ? '<i class="fa-solid fa-crown"></i>'
      : '<i class="fa-solid fa-user"></i>';
    var streakHtml = (isKing && streak > 1)
      ? '<span class="king-player-streak"><i class="fa-solid fa-fire"></i> WIN STREAK &times;' + streak + '</span>'
      : '<span style="min-height:1.1rem;display:block;"></span>';

    return '<div class="' + cardClass + '">' +
      '<span class="king-role-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '<div class="king-player-avatar">' + avatarContent + '</div>' +
      '<div class="king-player-name">' + esc(player.player_name) + '</div>' +
      streakHtml +
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

    actionsBar.innerHTML = buildEndGameBtn();

    matchArea.querySelectorAll('.play-team-win-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var team = btn.getAttribute('data-team');
        confirmTeamWin(team, match, teamA, teamB);
      });
    });

    attachEndGameListener();
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
    return html || '<div style="color:var(--color-text-muted);font-size:.8rem;padding:.35rem 0;">Tidak ada pemain di tim ini</div>';
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
    var matchPlayers = mp.map(function (p) { return findPlayer(p.player_id); }).filter(Boolean);
    var matchNo = match.match_no || allMatches.length;

    matchArea.innerHTML =
      '<div class="section-label">MATCH #' + matchNo + ' · SINGAPORE</div>' +
      '<div class="ch-card" style="margin-bottom:.5rem;">' +
        '<p style="font-size:.8rem;color:var(--color-text-secondary);margin-bottom:.75rem;" data-lang="PLAY_SINGAPORE_HINT">' + getLang('PLAY_SINGAPORE_HINT') + '</p>' +
        renderSingaporeRows(matchPlayers) +
      '</div>' +
      renderMatchHistory();

    actionsBar.innerHTML =
      buildEndGameBtn() +
      '<button class="btn-ch-primary" style="flex:1;" id="btn-input-rank">' +
        '<i class="fa-solid fa-list-ol"></i>' +
        '<span data-lang="PLAY_INPUT_RANKING">' + getLang('PLAY_INPUT_RANKING') + '</span>' +
      '</button>';

    document.getElementById('btn-input-rank').addEventListener('click', function () {
      openRankingSheet(matchPlayers, match);
    });
    attachEndGameListener();
    applyLang();
  }

  function renderSingaporeRows(matchPlayers) {
    if (!matchPlayers.length) {
      return '<div style="color:var(--color-text-muted);font-size:.8rem;padding:.5rem 0;">Tidak ada data pemain</div>';
    }
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
        renderScoreRow(p1, true) +
        '<div style="text-align:center;font-size:.75rem;color:var(--color-text-muted);padding:.35rem 0;font-weight:500;">VS</div>' +
        renderScoreRow(p2, true) +
      '</div>' +
      renderTournamentProgress() +
      renderMatchHistory();

    actionsBar.innerHTML =
      '<button class="btn-ch-outline" style="flex:0 0 auto;padding:.6rem .875rem;" id="btn-bracket">' +
        '<i class="fa-solid fa-crown"></i>' +
        '<span data-lang="PLAY_BRACKET">' + getLang('PLAY_BRACKET') + '</span>' +
      '</button>' +
      buildEndGameBtn();

    var winnerBtns = matchArea.querySelectorAll('.play-winner-btn');
    if (winnerBtns[0] && p1) {
      winnerBtns[0].addEventListener('click', function () { confirmWinner(p1); });
    }
    if (winnerBtns[1] && p2) {
      winnerBtns[1].addEventListener('click', function () { confirmWinner(p2); });
    }

    document.getElementById('btn-bracket').addEventListener('click', openBracketSheet);
    attachEndGameListener();
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
        renderScoreRow(p1, true) +
        '<div style="text-align:center;font-size:.75rem;color:var(--color-text-muted);padding:.35rem 0;font-weight:500;">VS</div>' +
        renderScoreRow(p2, true) +
      '</div>' +
      renderStandings() +
      renderMatchHistory();

    actionsBar.innerHTML = buildEndGameBtn();

    var winnerBtns = matchArea.querySelectorAll('.play-winner-btn');
    if (winnerBtns[0] && p1) {
      winnerBtns[0].addEventListener('click', function () { confirmWinner(p1); });
    }
    if (winnerBtns[1] && p2) {
      winnerBtns[1].addEventListener('click', function () { confirmWinner(p2); });
    }

    attachEndGameListener();
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
    var matchPlayers = mp.map(function (p) { return findPlayer(p.player_id); }).filter(Boolean);
    var matchNo = match.match_no || allMatches.length;

    // Custom: bisa 1v1 atau multi-player → auto-detect dari match_players
    if (matchPlayers.length === 2) {
      renderDuel(match);
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
      buildEndGameBtn() +
      '<button class="btn-ch-primary" style="flex:1;" id="btn-input-rank">' +
        '<i class="fa-solid fa-list-ol"></i>' +
        '<span data-lang="PLAY_INPUT_RANKING">' + getLang('PLAY_INPUT_RANKING') + '</span>' +
      '</button>';

    document.getElementById('btn-input-rank').addEventListener('click', function () {
      openRankingSheet(matchPlayers, match);
    });
    attachEndGameListener();
    applyLang();
  }

  // ============================================================
  // HELPER: renderScoreRow — nama pemain bisa diklik = menang
  // ============================================================
  function renderScoreRow(player, clickable) {
    if (!player) {
      return '<div style="padding:.5rem;color:var(--color-text-muted);font-size:.8rem;">—</div>';
    }
    var style = clickable
      ? 'cursor:pointer;padding:.5rem;border-radius:var(--radius-sm);'
      : 'padding:.5rem;';
    return '<div class="play-winner-btn" style="display:flex;align-items:center;gap:.625rem;' + style + '">' +
      makeAvatar(player.player_name, '') +
      '<div style="flex:1;font-size:.875rem;font-weight:500;">' + esc(player.player_name) + '</div>' +
      (clickable ? '<i class="fa-solid fa-chevron-right" style="color:var(--color-text-muted);font-size:.875rem;"></i>' : '') +
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
    if (!winner) return;
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
    var rankOrder = matchPlayers.slice();

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
          upBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
          upBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var tmp = rankOrder[i - 1];
            rankOrder[i - 1] = rankOrder[i];
            rankOrder[i] = tmp;
            renderRankItems();
          });
          item.appendChild(upBtn);
        }
        if (i < rankOrder.length - 1) {
          var downBtn = document.createElement('button');
          downBtn.className = 'topbar-btn';
          downBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
          downBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var tmp = rankOrder[i + 1];
            rankOrder[i + 1] = rankOrder[i];
            rankOrder[i] = tmp;
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
        if (currentMatch) renderMatch(currentMatch);
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
        '<i class="fa-solid fa-list-ol"></i>' +
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
          '<i class="fa-solid fa-xmark"></i>' +
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
          .then(function () { return Api.queue.get(sessionGameId); })
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
          (done ? '<i class="fa-solid fa-check" style="color:var(--color-success);font-size:.9rem;"></i>' :
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
      .then(function () { return Api.match.getAll(sessionGameId); })
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

    var payload = { match_id: matchId, rankings: rankings };

    Api.match.finish(payload)
      .then(function () { return Api.match.getAll(sessionGameId); })
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
      .then(function () { return Api.match.getAll(sessionGameId); })
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
          longestStreak = curStreak;
          var sp = findPlayer(streakPid);
          longestStreakName = sp ? sp.player_name : '';
        }
      }
    });

    var html =
      '<div style="display:flex;justify-content:space-between;font-size:.875rem;color:var(--color-text-secondary);padding:.3rem 0;">' +
        '<span>' + getLang('PLAY_SUMMARY_MODE') + '</span>' +
        '<span style="color:var(--color-text);font-weight:500;">' + (MODE_LABELS[gameMode] || gameMode) + '</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:.875rem;color:var(--color-text-secondary);padding:.3rem 0;">' +
        '<span>' + getLang('PLAY_SUMMARY_TOTAL') + '</span>' +
        '<span style="color:var(--color-text);font-weight:500;">' + total + ' match</span>' +
      '</div>';

    if (mvp) {
      html += '<div class="ch-divider"></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:.875rem;color:var(--color-text-secondary);padding:.3rem 0;">' +
          '<span>👑 ' + getLang('PLAY_SUMMARY_TOP') + '</span>' +
          '<span style="color:var(--color-text);font-weight:500;">' + esc(mvp.player_name) + ' (' + mvpWins + ' win)</span>' +
        '</div>';
    }

    if (longestStreak > 1) {
      html += '<div style="display:flex;justify-content:space-between;font-size:.875rem;color:var(--color-text-secondary);padding:.3rem 0;">' +
        '<span>' + getLang('PLAY_SUMMARY_STREAK') + '</span>' +
        '<span style="color:var(--color-text);font-weight:500;">' + esc(longestStreakName) + ' · ' + longestStreak + 'x</span>' +
        '</div>';
    }

    summaryContent.innerHTML = html;
    summaryOverlay.classList.remove('d-none');

    // Nonaktifkan area main
    matchArea.style.opacity       = '0.4';
    matchArea.style.pointerEvents = 'none';
    actionsBar.style.opacity      = '0.4';
    actionsBar.style.pointerEvents = 'none';
  }

  function closeSummarySheet() {
    summaryOverlay.classList.add('d-none');
    matchArea.style.opacity       = '';
    matchArea.style.pointerEvents = '';
    actionsBar.style.opacity      = '';
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
        .then(function () { return Api.session.updateStatus(sessionId, 'finished'); })
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
      '<i class="fa-solid fa-circle-exclamation"></i>' +
      '<p>' + esc(msg) + '</p>' +
      '<button class="btn-ch-outline" id="btn-retry" style="margin-top:.75rem;">' +
        getLang('PLAY_RETRY') +
      '</button>' +
      '</div>';
    var retryBtn = document.getElementById('btn-retry');
    if (retryBtn) retryBtn.addEventListener('click', loadSessionGame);
  }

  function findPlayer(playerId) {
    if (!playerId) return null;
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (p.player_id === playerId || p.id === playerId) return p;
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