// =============================================================
// CueHub v3 — session.gs
// Session management — satu malam = satu session
// =============================================================

// Buat session baru
// params: { notes? }
function sessionCreate(params, user) {
  return withLock(function() {
    // Cek apakah ada session ongoing
    var sheet = getDbSheet(DB_SHEET.SESSION_MASTER);
    var rows = sheetToObjects(sheet);
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].status === SESSION_STATUS.ONGOING) {
        // Return session yang masih ongoing (resume)
        return ok({ session_id: rows[i].session_id, resumed: true });
      }
    }

    // Hitung session_number (sequential display number)
    var sessionNumber = rows.length + 1;

    var sessionId = generateUUID();
    appendRow(sheet, {
      session_id    : sessionId,
      session_number: sessionNumber,
      started_at    : now(),
      ended_at      : '',
      status        : SESSION_STATUS.ONGOING,
      notes         : params.notes || ''
    });

    logAction(user.user_id, 'session.create', 'Session #' + sessionNumber);
    return ok({ session_id: sessionId, session_number: sessionNumber, resumed: false });
  });
}

// Ambil semua session (untuk halaman History)
// params: { limit? } — default 20 sesi terakhir
function sessionGetAll(params, user) {
  var sheet = getDbSheet(DB_SHEET.SESSION_MASTER);
  var rows = sheetToObjects(sheet);

  // Sort by started_at descending
  rows.sort(function(a, b) {
    return new Date(b.started_at) - new Date(a.started_at);
  });

  var limit = params.limit ? parseInt(params.limit) : 20;
  var result = rows.slice(0, limit);
  return ok(result);
}

// Ambil 1 session + semua segment-nya
// params: { session_id }
function sessionGetById(params, user) {
  if (!requireFields(params, ['session_id'])) return fail(ERR.MISSING_PARAMS);

  var sessionSheet = getDbSheet(DB_SHEET.SESSION_MASTER);
  var session = findRowByField(sessionSheet, 'session_id', params.session_id);
  if (!session) return fail(ERR.SESSION_NOT_FOUND);

  // Ambil semua segment dalam session ini
  var segSheet = getDbSheet(DB_SHEET.SESSION_SEGMENTS);
  var allSegments = sheetToObjects(segSheet);
  var segments = allSegments.filter(function(s) {
    return s.session_id === params.session_id;
  });
  segments.sort(function(a, b) { return a.segment_order - b.segment_order; });

  return ok({ session: session, segments: segments });
}

// End session — tutup malam ini
// params: { session_id }
function sessionFinish(params, user) {
  if (!requireFields(params, ['session_id'])) return fail(ERR.MISSING_PARAMS);

  return withLock(function() {
    var sessionSheet = getDbSheet(DB_SHEET.SESSION_MASTER);
    var session = findRowByField(sessionSheet, 'session_id', params.session_id);
    if (!session) return fail(ERR.SESSION_NOT_FOUND);
    if (session.status === SESSION_STATUS.FINISHED) return fail(ERR.SESSION_FINISHED);

    // Finish semua segment yang masih ongoing
    var segSheet = getDbSheet(DB_SHEET.SESSION_SEGMENTS);
    var allSegments = sheetToObjects(segSheet);
    var endTime = now();
    for (var i = 0; i < allSegments.length; i++) {
      if (allSegments[i].session_id === params.session_id &&
          allSegments[i].status === SEGMENT_STATUS.ONGOING) {
        updateRowById(segSheet, 'segment_id', allSegments[i].segment_id, {
          status  : SEGMENT_STATUS.FINISHED,
          ended_at: endTime
        });
      }
    }

    // Tutup session
    updateRowById(sessionSheet, 'session_id', params.session_id, {
      status  : SESSION_STATUS.FINISHED,
      ended_at: endTime
    });

    // Hitung statistik akhir semua player dalam session ini
    _computeSessionStats(params.session_id);

    logAction(user.user_id, 'session.finish', params.session_id);
    return ok({ session_id: params.session_id });
  });
}

// --- Helper: update player stats setelah session selesai ---
function _computeSessionStats(sessionId) {
  try {
    var matchSheet = getDbSheet(DB_SHEET.MATCH_MASTER);
    var matches = sheetToObjects(matchSheet);

    // Ambil match yang ada di segment session ini
    var segSheet = getDbSheet(DB_SHEET.SESSION_SEGMENTS);
    var segments = sheetToObjects(segSheet).filter(function(s) {
      return s.session_id === sessionId;
    });
    var segIds = segments.map(function(s) { return s.segment_id; });

    var sessionMatches = matches.filter(function(m) {
      return segIds.indexOf(m.segment_id) !== -1;
    });

    // Kumpulkan player stats dari session ini
    var playerData = {}; // { player_id: { wins: 0, losses: 0, matches: 0 } }

    for (var i = 0; i < sessionMatches.length; i++) {
      var m = sessionMatches[i];
      var pIds = parseJson(m.player_ids) || [];
      var wIds = parseJson(m.winner_ids) || [];

      for (var j = 0; j < pIds.length; j++) {
        var pid = pIds[j];
        if (!playerData[pid]) playerData[pid] = { wins: 0, losses: 0, matches: 0 };
        playerData[pid].matches++;
        if (wIds.indexOf(pid) !== -1) {
          playerData[pid].wins++;
        } else {
          playerData[pid].losses++;
        }
      }
    }

    // Update PLAYER_STATS dan PLAYER_MASTER
    var statsSheet = getDbSheet(DB_SHEET.PLAYER_STATS);
    var masterSheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
    var timestamp = now();

    for (var pid in playerData) {
      var d = playerData[pid];
      var stats = findRowByField(statsSheet, 'player_id', pid);
      var master = findRowByField(masterSheet, 'player_id', pid);
      if (!stats || !master) continue;

      var newMatchCount   = (parseInt(stats.match_count) || 0) + d.matches;
      var newWinCount     = (parseInt(stats.win_count) || 0) + d.wins;
      var newLossCount    = (parseInt(stats.loss_count) || 0) + d.losses;
      var newWinRate      = newMatchCount > 0 ? Math.round((newWinCount / newMatchCount) * 100) : 0;
      var newSessionCount = (parseInt(stats.session_count) || 0) + 1;
      var currentElo      = parseFloat(master.elo) || ELO.DEFAULT;
      var peakElo         = Math.max(parseFloat(stats.peak_elo) || ELO.DEFAULT, currentElo);

      updateRowById(statsSheet, 'player_id', pid, {
        session_count: newSessionCount,
        match_count  : newMatchCount,
        win_count    : newWinCount,
        loss_count   : newLossCount,
        win_rate     : newWinRate,
        current_elo  : currentElo,
        peak_elo     : peakElo,
        last_updated : timestamp
      });

      updateRowById(masterSheet, 'player_id', pid, {
        total_games  : (parseInt(master.total_games) || 0) + d.matches,
        total_wins   : (parseInt(master.total_wins) || 0) + d.wins,
        total_losses : (parseInt(master.total_losses) || 0) + d.losses,
        last_played_at: timestamp
      });
    }
  } catch(e) {
    logAction('SYSTEM', 'stats_compute_error', e.message);
  }
}
