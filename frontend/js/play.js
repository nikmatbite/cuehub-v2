(function () {
  var user = requireAuth();
  if (!user) return;

  var active = getActiveState();
  if (!active || !active.session_game_id) { goTo('pick-mode.html'); return; }

  // ── State ──
  var allMatches      = [];
  var allPlayers      = active.players || [];
  var gameMode        = active.game_mode || '';
  var sessionGameId   = active.session_game_id;
  var isSubmitting    = false;

  // ── DOM ──
  var matchArea   = document.getElementById('match-area');
  var actionsBar  = document.getElementById('actions-bar');
  var btnBack     = document.getElementById('btn-back');
  var pageTitle   = document.getElementById('page-title');
  var summarySheet= document.getElementById('summary-sheet');

  if (pageTitle) pageTitle.textContent = getModeLabel(gameMode);

  // ── Helpers ──
  function findPlayer(pid) {
    return allPlayers.find(function(p){ return p.player_id === pid; });
  }
  function playerName(pid) {
    var p = findPlayer(pid); return p ? p.player_name : '?';
  }
  function getModeLabel(mode) {
    var MAP = {
      duel:          getLang('MODE_DUEL'),
      king_of_table: getLang('MODE_KING'),
      team_battle:   getLang('MODE_TEAM'),
      singapore:     getLang('MODE_SG')
    };
    return MAP[mode] || mode;
  }

  // ── Load current match ──
  function loadCurrentMatch() {
    matchArea.innerHTML = '<div class="empty-state"><div class="spinner-border"></div></div>';
    Api.match.getAll(sessionGameId)
      .then(function(data) {
        allMatches = (data || []).sort(function(a,b){ return (a.match_no||0)-(b.match_no||0); });
        var current = allMatches.find(function(m){ return m.status === 'ongoing'; });
        if (!current) current = allMatches.find(function(m){ return m.status === 'scheduled'; });
        if (current) renderMatch(current);
        else renderAllDone();
      })
      .catch(function(err) {
        matchArea.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>' + resolveError(err) + '</p></div>';
      });
  }

  function renderMatch(match) {
    if      (gameMode === 'duel')          renderDuel(match);
    else if (gameMode === 'king_of_table') renderKing(match);
    else if (gameMode === 'team_battle')   renderTeamBattle(match);
    else if (gameMode === 'singapore')     renderSingapore(match);
    else renderGeneric(match);
  }

  // ══════════════════════════════════════════
  // MODE: DUEL
  // ══════════════════════════════════════════
  function renderDuel(match) {
    var mp   = match.players || [];
    var pA   = mp[0]; var pB = mp[1];
    var nameA = pA ? playerName(pA.player_id) : '?';
    var nameB = pB ? playerName(pB.player_id) : '?';

    matchArea.innerHTML =
      '<div class="section-label">' + getLang('PLAY_MATCH_LABEL') + ' #' + (match.match_no||1) + '</div>' +
      '<div class="duel-arena">' +
        '<div class="duel-player duel-player--a" data-pid="' + esc(pA&&pA.player_id) + '">' +
          makeAvatar(nameA) +
          '<div class="duel-name">' + esc(nameA) + '</div>' +
          '<div class="duel-tap">' + getLang('TAP_TO_WIN') + '</div>' +
        '</div>' +
        '<div class="duel-vs">VS</div>' +
        '<div class="duel-player duel-player--b" data-pid="' + esc(pB&&pB.player_id) + '">' +
          makeAvatar(nameB) +
          '<div class="duel-name">' + esc(nameB) + '</div>' +
          '<div class="duel-tap">' + getLang('TAP_TO_WIN') + '</div>' +
        '</div>' +
      '</div>' +
      renderMatchHistory();

    actionsBar.innerHTML = buildEndGameBtn();

    matchArea.querySelectorAll('.duel-player').forEach(function(el) {
      el.addEventListener('click', function() {
        if (isSubmitting) return;
        var pid = el.getAttribute('data-pid');
        var name = el.querySelector('.duel-name').textContent;
        confirmWinner(match, pid, name);
      });
    });
    attachEndGameListener();
  }

  function confirmWinner(match, winnerPid, winnerName) {
    Swal.fire({
      title: getLang('PLAY_CONFIRM_WIN_TITLE'),
      text:  esc(winnerName) + ' ' + getLang('PLAY_WIN_LABEL') + '?',
      icon:  'question',
      showCancelButton: true,
      confirmButtonText: getLang('YES'),
      cancelButtonText:  getLang('CANCEL'),
      confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
    }).then(function(r) {
      if (!r.isConfirmed) return;
      submitResult(match.match_id, { winner_player_id: winnerPid });
    });
  }

  // ══════════════════════════════════════════
  // MODE: KING OF TABLE
  // ══════════════════════════════════════════
  function renderKing(match) {
    var mp    = match.players || [];
    var pA    = mp[0]; var pB = mp[1];
    var nameA = pA ? playerName(pA.player_id) : '?';
    var nameB = pB ? playerName(pB.player_id) : '?';

    matchArea.innerHTML =
      '<div class="section-label">' + getLang('PLAY_MATCH_LABEL') + ' #' + (match.match_no||1) + ' · ' + getModeLabel('king_of_table') + '</div>' +
      '<div class="king-table">' +
        '<div class="king-slot king-slot--left" data-pid="' + esc(pA&&pA.player_id) + '">' +
          '<div class="king-crown"><i class="fa-solid fa-crown"></i></div>' +
          makeAvatar(nameA) +
          '<div class="king-name">' + esc(nameA) + '</div>' +
        '</div>' +
        '<div class="king-vs">VS</div>' +
        '<div class="king-slot king-slot--right" data-pid="' + esc(pB&&pB.player_id) + '">' +
          makeAvatar(nameB) +
          '<div class="king-name">' + esc(nameB) + '</div>' +
        '</div>' +
      '</div>' +
      '<p class="king-hint">' + getLang('KING_HINT') + '</p>' +
      renderMatchHistory();

    actionsBar.innerHTML = buildEndGameBtn();

    matchArea.querySelectorAll('.king-slot').forEach(function(el) {
      el.addEventListener('click', function() {
        if (isSubmitting) return;
        var pid  = el.getAttribute('data-pid');
        var name = el.querySelector('.king-name').textContent;
        confirmWinner(match, pid, name);
      });
    });
    attachEndGameListener();
  }

  // ══════════════════════════════════════════
  // MODE: TEAM BATTLE
  // ══════════════════════════════════════════
  function renderTeamBattle(match) {
    var mp   = match.players || [];
    var teamA = mp.filter(function(p){ return p.team === 'A'; });
    var teamB = mp.filter(function(p){ return p.team === 'B'; });

    // Hitung win count per team dari match selesai
    var winA = 0, winB = 0;
    allMatches.filter(function(m){ return m.status === 'finished'; }).forEach(function(m) {
      if (m.winner_team === 'A') winA++;
      else if (m.winner_team === 'B') winB++;
    });

    // Match number header
    var html =
      '<div class="section-label">' + getLang('PLAY_NOW_PLAYING') + '</div>' +
      '<div style="font-weight:700;font-size:1.1rem;margin-bottom:.75rem;">MATCH #' + (match.match_no||1) + '</div>' +
      '<div style="font-size:.75rem;color:var(--color-text-muted);margin-bottom:.75rem;text-align:center;" data-lang="PLAY_TB_TAP_HINT">' + getLang('PLAY_TB_TAP_HINT') + '</div>' +

      // Current match arena
      '<div class="team-arena">' +
        '<div class="team-side team-side--a" data-team="A">' +
          '<div class="team-label team-label--a">' + getLang('PLAY_TEAM_A') + ' (' + winA + ')</div>' +
          teamA.map(function(p){ return '<div class="team-player">' + makeAvatar(playerName(p.player_id),'sm') + ' ' + esc(playerName(p.player_id)) + '</div>'; }).join('') +
          '<div class="team-tap">' + getLang('TAP_TO_WIN') + '</div>' +
        '</div>' +
        '<div class="team-vs">VS</div>' +
        '<div class="team-side team-side--b" data-team="B">' +
          '<div class="team-label team-label--b">' + getLang('PLAY_TEAM_B') + ' (' + winB + ')</div>' +
          teamB.map(function(p){ return '<div class="team-player">' + makeAvatar(playerName(p.player_id),'sm') + ' ' + esc(playerName(p.player_id)) + '</div>'; }).join('') +
          '<div class="team-tap">' + getLang('TAP_TO_WIN') + '</div>' +
        '</div>' +
      '</div>';

    // Next match preview (peek rotasi)
    showLoading();
    Api.match.generateRotation(sessionGameId, allPlayers.map(function(p){ return p.player_id; }))
      .then(function(rotation) {
        hideLoading();
        if (rotation && rotation.team_A && rotation.team_B) {
          var nextA = (rotation.team_A || []).map(function(pid){ return playerName(pid); });
          var nextB = (rotation.team_B || []).map(function(pid){ return playerName(pid); });
          var nextRest = rotation.rest ? playerName(rotation.rest) : null;

          html +=
            '<div class="section-label" style="margin-top:1rem;">' + getLang('PLAY_NEXT_MATCH') + '</div>' +
            '<div class="ch-card" style="padding:.75rem;border-left:4px solid var(--color-primary-soft);">' +
              '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;">' +
                '<div style="flex:1;">' +
                  '<div style="font-size:.75rem;color:var(--color-text-muted);margin-bottom:.25rem;">' + getLang('PLAY_TEAM_A') + '</div>' +
                  '<div style="font-size:.85rem;font-weight:500;">' + esc(nextA.join(' & ')) + '</div>' +
                '</div>' +
                '<div style="color:var(--color-text-muted);font-weight:700;">VS</div>' +
                '<div style="flex:1;text-align:right;">' +
                  '<div style="font-size:.75rem;color:var(--color-text-muted);margin-bottom:.25rem;">' + getLang('PLAY_TEAM_B') + '</div>' +
                  '<div style="font-size:.85rem;font-weight:500;">' + esc(nextB.join(' & ')) + '</div>' +
                '</div>' +
              '</div>' +
              (nextRest ?
                '<div style="padding-top:.5rem;border-top:1px solid var(--color-border);font-size:.75rem;color:var(--color-text-muted);">' +
                  '<i class="fa-solid fa-mug-hot"></i> ' + getLang('PLAY_TB_REST') + ': <strong>' + esc(nextRest) + '</strong>' +
                '</div>' : '') +
            '</div>';

          matchArea.innerHTML = html + renderMatchHistory();
          attachTeamBattleListeners(match, teamA, teamB);
        }
      })
      .catch(function() {
        hideLoading();
        matchArea.innerHTML = html + renderMatchHistory();
        attachTeamBattleListeners(match, teamA, teamB);
      });
  }

  function attachTeamBattleListeners(match, teamA, teamB) {
    matchArea.querySelectorAll('.team-side').forEach(function(el) {
      el.addEventListener('click', function() {
        if (isSubmitting) return;
        var team = el.getAttribute('data-team');
        confirmTeamWin(match, team, teamA, teamB);
      });
    });

    actionsBar.innerHTML = buildNextTeamBtn() + buildEndGameBtn();
    var btnNextTeam = actionsBar.querySelector('#btn-next-team');
    if (btnNextTeam) {
      btnNextTeam.addEventListener('click', function() {
        if (isSubmitting) return;
        generateNextTeamBattle();
      });
    }
    attachEndGameListener();
  }

  function confirmTeamWin(match, team, teamA, teamB) {
    if (isSubmitting) return;
    var winners = (team === 'A' ? teamA : teamB);
    var names   = winners.map(function(p){ return playerName(p.player_id); }).join(' & ');

    Swal.fire({
      title: getLang('PLAY_CONFIRM_WIN_TITLE'),
      text:  esc(names) + ' ' + getLang('PLAY_WIN_LABEL') + '?',
      icon:  'question',
      showCancelButton: true,
      confirmButtonText: getLang('YES'),
      cancelButtonText:  getLang('CANCEL'),
      confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
    }).then(function(r) {
      if (!r.isConfirmed) return;
      var winnerIds = winners.map(function(p){ return p.player_id; });
      submitResult(match.match_id, { winner_team: team, winner_player_ids: winnerIds });
    });
  }

  function generateNextTeamBattle() {
    showLoading();
    var pids = allPlayers.map(function(p){ return p.player_id; });
    Api.match.generateRotation(sessionGameId, pids)
      .then(function(rotation) {
        hideLoading();
        return Api.match.create({
          session_game_id: sessionGameId,
          teams: { A: rotation.team_A, B: rotation.team_B }
        });
      })
      .then(function() { loadCurrentMatch(); })
      .catch(function(err) { hideLoading(); showToastMsg('error', resolveError(err)); });
  }

  function buildNextTeamBtn() {
    return '<button class="btn-ch-secondary" id="btn-next-team">' +
      '<i class="fa-solid fa-rotate"></i> ' + getLang('BTN_NEXT_TEAM') +
    '</button>';
  }

  // ══════════════════════════════════════════
  // MODE: SINGAPORE
  // ══════════════════════════════════════════
  function renderSingapore(match) {
    var mp = match.players || [];

    matchArea.innerHTML =
      '<div class="section-label">' + getLang('PLAY_MATCH_LABEL') + ' #' + (match.match_no||1) + ' · ' + getModeLabel('singapore') + '</div>' +
      '<div class="sg-hint">' + getLang('SG_RANK_HINT') + '</div>' +
      '<div class="sg-player-list" id="sg-player-list">' +
      mp.map(function(p, i) {
        return '<div class="sg-player-row" data-pid="' + esc(p.player_id) + '">' +
          '<div class="sg-rank">' + (i+1) + '</div>' +
          makeAvatar(playerName(p.player_id), 'sm') +
          '<div class="sg-name">' + esc(playerName(p.player_id)) + '</div>' +
          '<div class="sg-arrows">' +
            '<button class="btn-icon sg-up" data-pid="' + esc(p.player_id) + '"><i class="fa-solid fa-chevron-up"></i></button>' +
            '<button class="btn-icon sg-down" data-pid="' + esc(p.player_id) + '"><i class="fa-solid fa-chevron-down"></i></button>' +
          '</div>' +
        '</div>';
      }).join('') +
      '</div>' +
      '<button class="btn-ch-primary" id="btn-sg-confirm" style="margin-top:.75rem;width:100%;">' + getLang('PLAY_CONFIRM_RANKING') + '</button>' +
      renderMatchHistory();

    actionsBar.innerHTML = buildEndGameBtn();

    // Drag-to-reorder via up/down buttons
    var listEl  = document.getElementById('sg-player-list');
    var players = mp.slice();

    function rerender() {
      var rows = listEl.querySelectorAll('.sg-player-row');
      rows.forEach(function(row, i) {
        row.querySelector('.sg-rank').textContent = i + 1;
      });
    }

    listEl.addEventListener('click', function(e) {
      var upBtn   = e.target.closest('.sg-up');
      var downBtn = e.target.closest('.sg-down');
      if (!upBtn && !downBtn) return;
      var pid = (upBtn || downBtn).getAttribute('data-pid');
      var idx = players.findIndex(function(p){ return p.player_id === pid; });
      if (upBtn   && idx > 0)               { var tmp = players[idx]; players[idx]=players[idx-1]; players[idx-1]=tmp; }
      if (downBtn && idx < players.length-1){ var tmp = players[idx]; players[idx]=players[idx+1]; players[idx+1]=tmp; }

      // Re-render rows in new order
      var rows = listEl.querySelectorAll('.sg-player-row');
      var rowArr = Array.prototype.slice.call(rows);
      rowArr.sort(function(a,b){
        var ai = players.findIndex(function(p){ return p.player_id === a.getAttribute('data-pid'); });
        var bi = players.findIndex(function(p){ return p.player_id === b.getAttribute('data-pid'); });
        return ai - bi;
      });
      rowArr.forEach(function(r){ listEl.appendChild(r); });
      rerender();
    });

    document.getElementById('btn-sg-confirm').addEventListener('click', function() {
      if (isSubmitting) return;
      var rankings = players.map(function(p, i){ return { player_id: p.player_id, ranking: i+1 }; });
      submitResult(match.match_id, { rankings: rankings });
    });

    attachEndGameListener();
  }

  // ══════════════════════════════════════════
  // GENERIC fallback
  // ══════════════════════════════════════════
  function renderGeneric(match) {
    matchArea.innerHTML = '<div class="ch-card"><p>' + getLang('PLAY_MATCH_LABEL') + ' #' + (match.match_no||1) + '</p></div>';
    actionsBar.innerHTML = buildEndGameBtn();
    attachEndGameListener();
  }

  // ══════════════════════════════════════════
  // ALL DONE
  // ══════════════════════════════════════════
  function renderAllDone() {
    matchArea.innerHTML =
      '<div class="empty-state done-state">' +
        '<i class="fa-solid fa-trophy"></i>' +
        '<p>' + getLang('PLAY_ALL_DONE') + '</p>' +
      '</div>';
    actionsBar.innerHTML =
      '<button class="btn-ch-primary" id="btn-show-summary">' + getLang('BTN_SHOW_SUMMARY') + '</button>' +
      '<button class="btn-ch-secondary" id="btn-end-session">' + getLang('BTN_END_SESSION') + '</button>';

    document.getElementById('btn-show-summary').addEventListener('click', openSummary);
    document.getElementById('btn-end-session').addEventListener('click', endSession);
  }

  // ══════════════════════════════════════════
  // SUBMIT RESULT
  // ══════════════════════════════════════════
  function submitResult(matchId, resultData) {
    if (isSubmitting) return;
    isSubmitting = true;
    showLoading();

    Api.match.finish(Object.assign({ match_id: matchId }, resultData))
      .then(function() {
        hideLoading();
        isSubmitting = false;
        showToastMsg('success', getLang('PLAY_RESULT_SAVED'));
        setTimeout(function(){ loadCurrentMatch(); }, 600);
      })
      .catch(function(err) {
        hideLoading();
        isSubmitting = false;
        showToastMsg('error', resolveError(err));
      });
  }

  // ══════════════════════════════════════════
  // MATCH HISTORY
  // ══════════════════════════════════════════
  function renderMatchHistory() {
    var done = allMatches.filter(function(m){ return m.status === 'finished'; });
    if (!done.length) return '';
    return '<div class="match-history">' +
      '<div class="section-label" style="margin-bottom:.5rem;">' + getLang('PLAY_HISTORY') + '</div>' +
      done.map(function(m) {
        var winner = '';
        if (m.winner_player) winner = playerName(m.winner_player);
        else if (m.winner_team) winner = getLang('PLAY_TEAM_' + m.winner_team.toUpperCase()) + ' ' + getLang('PLAY_WIN_LABEL');
        return '<div class="history-row">' +
          '<span class="history-no">#' + (m.match_no||'?') + '</span>' +
          '<span class="history-winner"><i class="fa-solid fa-trophy"></i> ' + esc(winner||'-') + '</span>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  // ══════════════════════════════════════════
  // END GAME BUTTON
  // ══════════════════════════════════════════
  function buildEndGameBtn() {
    return '<button class="btn-ch-secondary btn-end-game" id="btn-end-game">' +
      '<i class="fa-solid fa-flag-checkered"></i> ' + getLang('BTN_END_GAME') +
    '</button>';
  }

  function attachEndGameListener() {
    var btn = document.getElementById('btn-end-game');
    if (btn) btn.addEventListener('click', endSession);
  }

  function endSession() {
    Swal.fire({
      title: getLang('END_SESSION_CONFIRM'),
      icon:  'warning',
      showCancelButton: true,
      confirmButtonText: getLang('YES'),
      cancelButtonText:  getLang('CANCEL'),
      confirmButtonColor: 'var(--color-danger)'
    }).then(function(r) {
      if (!r.isConfirmed) return;
      showLoading();
      Api.sessionGame.updateStatus(sessionGameId, 'finished')
        .then(function() { return Api.statistics.compute(active.session_id); })
        .then(function() { hideLoading(); clearActiveState(); goTo('dashboard.html'); })
        .catch(function(err) { hideLoading(); showToastMsg('error', resolveError(err)); });
    });
  }

  // ══════════════════════════════════════════
  // SUMMARY SHEET
  // ══════════════════════════════════════════
  function openSummary() {
    if (!summarySheet) return;
    showLoading();
    Api.statistics.getSession(active.session_id)
      .then(function(stats) {
        hideLoading();
        var rows = (stats || []).sort(function(a,b){ return (parseFloat(b.win_rate)||0)-(parseFloat(a.win_rate)||0); });
        var bodyEl = summarySheet.querySelector('#summary-body');
        if (bodyEl) {
          bodyEl.innerHTML = rows.map(function(r, i) {
            return '<div class="summary-row">' +
              '<span class="summary-rank">' + (i+1) + '</span>' +
              makeAvatar(r.player_name, 'sm') +
              '<span class="summary-name">' + esc(r.player_name) + '</span>' +
              '<span class="summary-stats">' + (r.total_wins||0) + 'W / ' + (r.total_matches||0) + 'M · ' + formatWinRate(r.win_rate) + '</span>' +
            '</div>';
          }).join('');
        }
        summarySheet.classList.remove('d-none');
      })
      .catch(function(err) { hideLoading(); showToastMsg('error', resolveError(err)); });
  }

  if (summarySheet) {
    summarySheet.addEventListener('click', function(e) {
      if (e.target === summarySheet) summarySheet.classList.add('d-none');
    });
    var btnCloseSummary = summarySheet.querySelector('#btn-close-summary');
    if (btnCloseSummary) btnCloseSummary.addEventListener('click', function(){ summarySheet.classList.add('d-none'); });
  }

  // ── Back ──
  if (btnBack) {
    btnBack.addEventListener('click', function() {
      Swal.fire({
        title: getLang('BACK_CONFIRM'),
        text:  getLang('BACK_CONFIRM_MSG'),
        icon:  'warning',
        showCancelButton: true,
        confirmButtonText: getLang('YES'),
        cancelButtonText:  getLang('CANCEL'),
        confirmButtonColor: 'var(--color-danger)'
      }).then(function(r) { if (r.isConfirmed) { clearActiveState(); goTo('dashboard.html'); } });
    });
  }

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ── Init ──
  loadCurrentMatch();
})();
