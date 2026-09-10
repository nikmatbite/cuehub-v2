// =============================================================
// CueHub v3 — segment.gs
// Segment = satu blok permainan (1 mode + 1 player set + 1 siklus)
// Termasuk match submission dan state advancement
// =============================================================

// --- Mulai Segment Baru (atau Shuffle Ulang) ---
// params: { session_id, game_mode, player_ids: [id,...] }
// Dipanggil juga saat: End Game lalu pilih mode+player baru
function segmentStart(params, user) {
  if (!requireFields(params, ['session_id', 'game_mode', 'player_ids'])) {
    return fail(ERR.MISSING_PARAMS);
  }

  var mode = params.game_mode;
  if (!GAME_MODE[mode.toUpperCase()] && Object.values(GAME_MODE).indexOf(mode) === -1) {
    return fail(ERR.INVALID_MODE);
  }

  var playerIds = params.player_ids;
  if (!Array.isArray(playerIds) || playerIds.length < (MIN_PLAYERS[mode] || 2)) {
    return fail(ERR.MIN_PLAYERS);
  }

  return withLock(function() {
    var sessionSheet = getDbSheet(DB_SHEET.SESSION_MASTER);
    var session = findRowByField(sessionSheet, 'session_id', params.session_id);
    if (!session) return fail(ERR.SESSION_NOT_FOUND);
    if (session.status === SESSION_STATUS.FINISHED) return fail(ERR.SESSION_FINISHED);

    var segSheet = getDbSheet(DB_SHEET.SESSION_SEGMENTS);
    var allSegments = sheetToObjects(segSheet);

    // Hitung segment_order
    var sessionSegments = allSegments.filter(function(s) {
      return s.session_id === params.session_id;
    });
    var segOrder = sessionSegments.length + 1;

    // Generate siklus
    var cycleResult = generateCycle(mode, playerIds);
    if (!cycleResult) return fail(ERR.INVALID_MODE);

    var segmentId = generateUUID();
    appendRow(segSheet, {
      segment_id   : segmentId,
      session_id   : params.session_id,
      segment_order: segOrder,
      game_mode    : mode,
      player_ids   : JSON.stringify(playerIds),
      cycle_json   : JSON.stringify(cycleResult),   // { type, data }
      cycle_index  : 0,
      status       : SEGMENT_STATUS.ONGOING,
      started_at   : now(),
      ended_at     : ''
    });

    logAction(user.user_id, 'segment.start', mode + ' | ' + playerIds.length + ' players');

    // Return state awal
    var state = _buildSegmentState(segmentId, cycleResult, 0, playerIds, mode);
    return ok({ segment_id: segmentId, state: state });
  });
}

// --- Ambil State Segment Aktif ---
// params: { session_id }
function segmentGetActive(params, user) {
  if (!requireFields(params, ['session_id'])) return fail(ERR.MISSING_PARAMS);

  var segSheet = getDbSheet(DB_SHEET.SESSION_SEGMENTS);
  var allSegments = sheetToObjects(segSheet);
  var active = null;

  for (var i = 0; i < allSegments.length; i++) {
    if (allSegments[i].session_id === params.session_id &&
        allSegments[i].status === SEGMENT_STATUS.ONGOING) {
      active = allSegments[i];
      break;
    }
  }

  if (!active) return ok({ segment: null });

  var cycleResult = parseJson(active.cycle_json);
  var playerIds = parseJson(active.player_ids);
  var cycleIndex = parseInt(active.cycle_index) || 0;
  var state = _buildSegmentState(active.segment_id, cycleResult, cycleIndex, playerIds, active.game_mode);

  return ok({ segment: active, state: state });
}

// --- Finish Segment (End Game) ---
// params: { segment_id }
function segmentFinish(params, user) {
  if (!requireFields(params, ['segment_id'])) return fail(ERR.MISSING_PARAMS);

  return withLock(function() {
    var segSheet = getDbSheet(DB_SHEET.SESSION_SEGMENTS);
    var segment = findRowByField(segSheet, 'segment_id', params.segment_id);
    if (!segment) return fail(ERR.SEGMENT_NOT_FOUND);
    if (segment.status === SEGMENT_STATUS.FINISHED) return fail(ERR.SEGMENT_FINISHED);

    updateRowById(segSheet, 'segment_id', params.segment_id, {
      status  : SEGMENT_STATUS.FINISHED,
      ended_at: now()
    });

    logAction(user.user_id, 'segment.finish', params.segment_id);
    return ok({ segment_id: params.segment_id });
  });
}

// --- Shuffle Ulang Siklus (mode + player sama, siklus baru) ---
// params: { segment_id }
// History match sebelumnya tetap tersimpan; segment baru dimulai dengan siklus baru
function segmentShuffle(params, user) {
  if (!requireFields(params, ['segment_id'])) return fail(ERR.MISSING_PARAMS);

  return withLock(function() {
    var segSheet = getDbSheet(DB_SHEET.SESSION_SEGMENTS);
    var segment = findRowByField(segSheet, 'segment_id', params.segment_id);
    if (!segment) return fail(ERR.SEGMENT_NOT_FOUND);
    if (segment.status === SEGMENT_STATUS.FINISHED) return fail(ERR.SEGMENT_FINISHED);

    var playerIds = parseJson(segment.player_ids);
    var mode = segment.game_mode;

    // Generate siklus baru
    var newCycleResult = generateCycle(mode, playerIds);
    if (!newCycleResult) return fail(ERR.INVALID_MODE);

    // Reset cycle_index, update cycle_json
    updateRowById(segSheet, 'segment_id', params.segment_id, {
      cycle_json : JSON.stringify(newCycleResult),
      cycle_index: 0
    });

    logAction(user.user_id, 'segment.shuffle', params.segment_id);

    var state = _buildSegmentState(params.segment_id, newCycleResult, 0, playerIds, mode);
    return ok({ segment_id: params.segment_id, state: state });
  });
}

// --- Submit Winner dan Advance ke Match Berikutnya ---
// params: { segment_id, winner_ids: [id,...], player_ids: [id,...] }
// player_ids = semua pemain dalam match ini (bukan seluruh segment)
// winner_ids = pemenang match ini
function matchSubmitWinner(params, user) {
  if (!requireFields(params, ['segment_id', 'winner_ids', 'player_ids'])) {
    return fail(ERR.MISSING_PARAMS);
  }

  return withLock(function() {
    var segSheet = getDbSheet(DB_SHEET.SESSION_SEGMENTS);
    var segment = findRowByField(segSheet, 'segment_id', params.segment_id);
    if (!segment) return fail(ERR.SEGMENT_NOT_FOUND);
    if (segment.status === SEGMENT_STATUS.FINISHED) return fail(ERR.SEGMENT_FINISHED);

    var playerIds = parseJson(segment.player_ids);   // semua player di segment
    var cycleResult = parseJson(segment.cycle_json);
    var cycleIndex = parseInt(segment.cycle_index) || 0;
    var mode = segment.game_mode;
    var matchPlayerIds = params.player_ids;
    var winnerIds = params.winner_ids;

    // Validasi winner ada di match player list
    for (var i = 0; i < winnerIds.length; i++) {
      if (matchPlayerIds.indexOf(winnerIds[i]) === -1) {
        return fail(ERR.INVALID_WINNER);
      }
    }

    // Ambil ELO sebelum match
    var masterSheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
    var elosBefore = {};
    var gamesBefore = {};
    for (var i = 0; i < matchPlayerIds.length; i++) {
      var pm = findRowByField(masterSheet, 'player_id', matchPlayerIds[i]);
      elosBefore[matchPlayerIds[i]] = pm ? (parseFloat(pm.elo) || ELO.DEFAULT) : ELO.DEFAULT;
      gamesBefore[matchPlayerIds[i]] = pm ? (parseInt(pm.total_games) || 0) : 0;
    }

    // Hitung ELO sesudah match
    var elosAfter = _computeElo(mode, matchPlayerIds, winnerIds, elosBefore, gamesBefore, params);

    // Simpan match ke MATCH_MASTER
    var matchSheet = getDbSheet(DB_SHEET.MATCH_MASTER);
    var allMatchesInSegment = sheetToObjects(matchSheet).filter(function(m) {
      return m.segment_id === params.segment_id;
    });
    var matchOrder = allMatchesInSegment.length + 1;

    var matchId = generateUUID();
    appendRow(matchSheet, {
      match_id   : matchId,
      segment_id : params.segment_id,
      match_order: matchOrder,
      player_ids : JSON.stringify(matchPlayerIds),
      winner_ids : JSON.stringify(winnerIds),
      team_a     : params.team_a ? JSON.stringify(params.team_a) : '',
      team_b     : params.team_b ? JSON.stringify(params.team_b) : '',
      elo_before : JSON.stringify(elosBefore),
      elo_after  : JSON.stringify(elosAfter),
      played_at  : now()
    });

    // Update ELO di PLAYER_MASTER
    for (var pid in elosAfter) {
      updateRowById(masterSheet, 'player_id', pid, {
        elo        : elosAfter[pid],
        total_games: (gamesBefore[pid] || 0) + 1
      });
    }

    // Advance state berdasarkan mode
    var newCycleResult = cycleResult;
    var newCycleIndex = cycleIndex;

    if (mode === GAME_MODE.KING) {
      // Update state array langsung
      var currentState = cycleResult.data;
      var newState = advanceKingState(currentState, winnerIds[0]);
      newCycleResult = { type: 'state', data: newState };
      newCycleIndex = 0;
    } else {
      // Cycle-based modes: advance index, wrap around
      newCycleIndex = (cycleIndex + 1) % cycleResult.data.length;
    }

    updateRowById(segSheet, 'segment_id', params.segment_id, {
      cycle_json : JSON.stringify(newCycleResult),
      cycle_index: newCycleIndex
    });

    logAction(user.user_id, 'match.submitWinner', 'Match #' + matchOrder + ' | Winner: ' + winnerIds.join(','));

    // Return next state
    var nextState = _buildSegmentState(params.segment_id, newCycleResult, newCycleIndex, playerIds, mode);
    return ok({
      match_id   : matchId,
      elo_before : elosBefore,
      elo_after  : elosAfter,
      next_state : nextState
    });
  });
}

// --- Ambil semua match dalam satu segment (untuk history segment) ---
// params: { segment_id }
function matchGetBySegment(params, user) {
  if (!requireFields(params, ['segment_id'])) return fail(ERR.MISSING_PARAMS);
  var matchSheet = getDbSheet(DB_SHEET.MATCH_MASTER);
  var all = sheetToObjects(matchSheet);
  var filtered = all.filter(function(m) { return m.segment_id === params.segment_id; });
  filtered.sort(function(a, b) { return a.match_order - b.match_order; });
  return ok(filtered);
}

function matchEditWinner(params, user) {
  if (!requireFields(params, ['match_id', 'winner_ids', 'player_ids', 'segment_id'])) {
    return fail(ERR.MISSING_PARAMS);
  }

  return withLock(function() {
    var matchSheet = getDbSheet(DB_SHEET.MATCH_MASTER);
    var match = findRowByField(matchSheet, 'match_id', params.match_id);
    if (!match) return fail(ERR.MATCH_NOT_FOUND);

    var segSheet = getDbSheet(DB_SHEET.SESSION_SEGMENTS);
    var segment = findRowByField(segSheet, 'segment_id', params.segment_id);
    if (!segment) return fail(ERR.SEGMENT_NOT_FOUND);

    var mode = segment.game_mode;
    var newWinnerIds = params.winner_ids;
    var matchPlayerIds = params.player_ids;

    // Validasi winner baru ada di match player list
    for (var i = 0; i < newWinnerIds.length; i++) {
      if (matchPlayerIds.indexOf(newWinnerIds[i]) === -1) {
        return fail(ERR.INVALID_WINNER);
      }
    }

    var masterSheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
    var elosBefore   = parseJson(match.elo_before);
    var elosOldAfter = parseJson(match.elo_after);

    // Balikkan ELO lama: kembalikan ke kondisi sebelum match
    var gamesBefore = {};
    for (var pid in elosOldAfter) {
      var pm = findRowByField(masterSheet, 'player_id', pid);
      if (!pm) continue;
      var currentGames = parseInt(pm.total_games) || 0;
      var restoredElo  = elosBefore[pid] !== undefined ? elosBefore[pid] : (parseFloat(pm.elo) || ELO.DEFAULT);
      gamesBefore[pid] = Math.max(0, currentGames - 1);
      updateRowById(masterSheet, 'player_id', pid, {
        elo        : restoredElo,
        total_games: gamesBefore[pid]
      });
    }

    // Hitung ELO baru dengan pemenang yang benar
    var elosNewAfter = _computeElo(mode, matchPlayerIds, newWinnerIds, elosBefore, gamesBefore, params);

    // Terapkan ELO baru
    for (var pid in elosNewAfter) {
      var pm2 = findRowByField(masterSheet, 'player_id', pid);
      if (!pm2) continue;
      var g = parseInt(pm2.total_games) || 0;
      updateRowById(masterSheet, 'player_id', pid, {
        elo        : elosNewAfter[pid],
        total_games: g + 1
      });
    }

    // Update match record
    var updateData = {
      winner_ids: JSON.stringify(newWinnerIds),
      elo_after : JSON.stringify(elosNewAfter)
    };
    if (params.team_a) updateData.team_a = JSON.stringify(params.team_a);
    if (params.team_b) updateData.team_b = JSON.stringify(params.team_b);
    updateRowById(matchSheet, 'match_id', params.match_id, updateData);

    logAction(user.user_id, 'match.editWinner', 'Match ' + params.match_id + ' | New winner: ' + newWinnerIds.join(','));

    return ok({
      match_id  : params.match_id,
      elo_before: elosBefore,
      elo_after : elosNewAfter
    });
  });
}

// =============================================================
// Helper: Build state yang dikirim ke frontend
// State mendeskripsikan: now playing, next, queue
// =============================================================
function _buildSegmentState(segmentId, cycleResult, cycleIndex, allPlayerIds, mode) {
  if (!cycleResult) return null;

  if (mode === GAME_MODE.KING) {
    // state = array pemain, indeks 0-1 = main, 2 = next, 3+ = queue
    var state = cycleResult.data;
    return {
      mode    : mode,
      playing : state.slice(0, 2),
      next    : state.length > 2 ? [state[2]] : [],
      queue   : state.length > 3 ? state.slice(3) : [],
      resting : []
    };
  }

  // Cycle-based: Duel, Team Battle, Singapore
  var cycle = cycleResult.data;
  if (!cycle || cycle.length === 0) return null;

  var current = cycle[cycleIndex];
  var nextIdx = (cycleIndex + 1) % cycle.length;
  var next = cycle[nextIdx];

  if (mode === GAME_MODE.DUEL) {
    // current = [p1, p2]
    var playing = current;
    var nextPlaying = next;
    var inAction = playing.concat(nextPlaying);
    var queue = [];
    for (var i = 2; i < cycle.length; i++) {
      var futureIdx = (cycleIndex + i) % cycle.length;
      var futurePair = cycle[futureIdx];
      // Tambah ke queue jika belum ada
      for (var j = 0; j < futurePair.length; j++) {
        if (inAction.indexOf(futurePair[j]) === -1) {
          queue.push(futurePair[j]);
          inAction.push(futurePair[j]);
        }
      }
    }
    return {
      mode    : mode,
      playing : playing,
      next    : nextPlaying,
      queue   : queue,
      resting : []
    };
  }

  if (mode === GAME_MODE.TEAM_BATTLE) {
    // current = { teamA: [p1,p2], teamB: [p3,p4], rest: [p5?] }
    return {
      mode    : mode,
      playing : { teamA: current.teamA, teamB: current.teamB },
      next    : { teamA: next.teamA, teamB: next.teamB },
      queue   : [],
      resting : current.rest || []
    };
  }

  if (mode === GAME_MODE.SINGAPORE) {
    // current = { players: [p1,p2,p3], rest: [p4,p5?] }
    return {
      mode    : mode,
      playing : current.players,
      next    : next.players,
      queue   : [],
      resting : current.rest || []
    };
  }

  return null;
}

// =============================================================
// Helper: Dispatch ELO kalkulasi berdasarkan mode
// =============================================================
function _computeElo(mode, matchPlayerIds, winnerIds, elosBefore, gamesBefore, params) {
  if (mode === GAME_MODE.DUEL || mode === GAME_MODE.KING) {
    var loserId = matchPlayerIds[0] === winnerIds[0] ? matchPlayerIds[1] : matchPlayerIds[0];
    return calculateElo1v1(winnerIds[0], loserId, elosBefore, gamesBefore);
  }

  if (mode === GAME_MODE.TEAM_BATTLE) {
    // params harus punya team_a dan team_b
    var teamA = params.team_a || [];
    var teamB = params.team_b || [];
    var winnerTeam = teamA.indexOf(winnerIds[0]) !== -1 ? 'A' : 'B';
    return calculateEloTeam(teamA, teamB, winnerTeam, elosBefore, gamesBefore);
  }

  if (mode === GAME_MODE.SINGAPORE) {
    return calculateEloSingapore(matchPlayerIds, winnerIds[0], elosBefore, gamesBefore);
  }

  return elosBefore; // fallback: tidak ada perubahan
}
