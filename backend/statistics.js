// =============================================================
// CueHub v3 — statistics.gs
// Endpoint statistik player dan session
// =============================================================

// Ambil statistik 1 player + ELO history dari matches
// params: { player_id }
function statsGetPlayer(params, user) {
  if (!requireFields(params, ['player_id'])) return fail(ERR.MISSING_PARAMS);

  var masterSheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
  var player = findRowByField(masterSheet, 'player_id', params.player_id);
  if (!player || player.status === 'deleted') return fail(ERR.PLAYER_NOT_FOUND);

  var statsSheet = getDbSheet(DB_SHEET.PLAYER_STATS);
  var stats = findRowByField(statsSheet, 'player_id', params.player_id);

  // Ambil 20 match terakhir player ini untuk ELO chart
  var matchSheet = getDbSheet(DB_SHEET.MATCH_MASTER);
  var allMatches = sheetToObjects(matchSheet);
  var playerMatches = allMatches.filter(function(m) {
    var pIds = parseJson(m.player_ids) || [];
    return pIds.indexOf(params.player_id) !== -1;
  });

  // Sort by played_at ascending
  playerMatches.sort(function(a, b) {
    return new Date(a.played_at) - new Date(b.played_at);
  });

  // Ambil 20 terakhir untuk chart
  var recentMatches = playerMatches.slice(-20);
  var eloHistory = recentMatches.map(function(m) {
    var eloAfter = parseJson(m.elo_after) || {};
    return {
      match_order: m.match_order,
      played_at  : m.played_at,
      elo        : eloAfter[params.player_id] || null,
      won        : (parseJson(m.winner_ids) || []).indexOf(params.player_id) !== -1
    };
  });

  // ELO label
  var currentElo = parseFloat(player.elo) || ELO.DEFAULT;
  var eloLabel = _getEloLabel(currentElo);

  return ok({
    player     : player,
    stats      : stats,
    elo_label  : eloLabel,
    elo_history: eloHistory
  });
}

// Ambil statistik semua player (untuk leaderboard)
function statsGetAllPlayers(params, user) {
  var masterSheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
  var statsSheet = getDbSheet(DB_SHEET.PLAYER_STATS);

  var players = sheetToObjects(masterSheet).filter(function(p) { return p.status !== 'deleted'; });
  var statsAll = sheetToObjects(statsSheet);

  // Index stats by player_id
  var statsMap = {};
  statsAll.forEach(function(s) { statsMap[s.player_id] = s; });

  var result = players.map(function(p) {
    var s = statsMap[p.player_id] || {};
    return {
      player_id   : p.player_id,
      player_name : p.player_name,
      nickname    : p.nickname,
      elo         : parseFloat(p.elo) || ELO.DEFAULT,
      elo_label   : _getEloLabel(parseFloat(p.elo) || ELO.DEFAULT),
      total_games : parseInt(p.total_games) || 0,
      total_wins  : parseInt(p.total_wins) || 0,
      total_losses: parseInt(p.total_losses) || 0,
      win_rate    : parseInt(s.win_rate) || 0,
      session_count: parseInt(s.session_count) || 0,
      peak_elo    : parseFloat(s.peak_elo) || ELO.DEFAULT,
      last_played_at: p.last_played_at
    };
  });

  // Sort by ELO descending
  result.sort(function(a, b) { return b.elo - a.elo; });

  return ok(result);
}

// Ambil ringkasan satu session (untuk halaman history detail)
// params: { session_id }
function statsGetSession(params, user) {
  if (!requireFields(params, ['session_id'])) return fail(ERR.MISSING_PARAMS);

  var sessionSheet = getDbSheet(DB_SHEET.SESSION_MASTER);
  var session = findRowByField(sessionSheet, 'session_id', params.session_id);
  if (!session) return fail(ERR.SESSION_NOT_FOUND);

  var segSheet = getDbSheet(DB_SHEET.SESSION_SEGMENTS);
  var segments = sheetToObjects(segSheet).filter(function(s) {
    return s.session_id === params.session_id;
  });
  segments.sort(function(a, b) { return a.segment_order - b.segment_order; });

  var matchSheet = getDbSheet(DB_SHEET.MATCH_MASTER);
  var allMatches = sheetToObjects(matchSheet);

  // Ambil match per segment + hitung stats
  var segIds = segments.map(function(s) { return s.segment_id; });
  var sessionMatches = allMatches.filter(function(m) {
    return segIds.indexOf(m.segment_id) !== -1;
  });

  // Kumpulkan semua player yang terlibat
  var playerSet = {};
  var winCounts = {};
  sessionMatches.forEach(function(m) {
    var pIds = parseJson(m.player_ids) || [];
    var wIds = parseJson(m.winner_ids) || [];
    pIds.forEach(function(pid) { playerSet[pid] = true; });
    wIds.forEach(function(pid) {
      winCounts[pid] = (winCounts[pid] || 0) + 1;
    });
  });

  // Cari champion (paling banyak menang dalam session)
  var champion = null;
  var maxWins = 0;
  for (var pid in winCounts) {
    if (winCounts[pid] > maxWins) {
      maxWins = winCounts[pid];
      champion = pid;
    }
  }

  // Ambil nama player
  var masterSheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
  var playerNames = {};
  Object.keys(playerSet).forEach(function(pid) {
    var p = findRowByField(masterSheet, 'player_id', pid);
    if (p) playerNames[pid] = p.player_name;
  });

  return ok({
    session       : session,
    segments      : segments,
    total_matches : sessionMatches.length,
    total_players : Object.keys(playerSet).length,
    champion_id   : champion,
    champion_wins : maxWins,
    player_names  : playerNames,
    win_counts    : winCounts
  });
}

// --- ELO Label ---
function _getEloLabel(elo) {
  if (elo >= 1800) return { label: 'World Class', icon: '👑', rank: 7 };
  if (elo >= 1600) return { label: 'Professional', icon: '💎', rank: 6 };
  if (elo >= 1400) return { label: 'Expert', icon: '🥇', rank: 5 };
  if (elo >= 1200) return { label: 'Advanced', icon: '🥈', rank: 4 };
  if (elo >= 1000) return { label: 'Intermediate', icon: '🥉', rank: 3 };
  if (elo >= 800)  return { label: 'Novice', icon: '🔰', rank: 2 };
  return { label: 'Beginner', icon: '🌱', rank: 1 };
}
