// =============================================================
// CueHub v3 — player.gs
// CRUD Player Master — player list persist across sessions
// =============================================================

// Ambil semua player aktif
function playerGetAll(params, user) {
  var sheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
  var rows = sheetToObjects(sheet);
  var active = rows.filter(function(r) { return r.status !== 'deleted'; });
  // Sort by player_name
  active.sort(function(a, b) {
    return a.player_name.toLowerCase().localeCompare(b.player_name.toLowerCase());
  });
  return ok(active);
}

// Ambil 1 player by ID
function playerGetById(params, user) {
  if (!requireFields(params, ['player_id'])) return fail(ERR.MISSING_PARAMS);
  var sheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
  var player = findRowByField(sheet, 'player_id', params.player_id);
  if (!player || player.status === 'deleted') return fail(ERR.PLAYER_NOT_FOUND);
  return ok(player);
}

// Buat player baru
// params: { player_name, nickname? }
function playerCreate(params, user) {
  if (!requireFields(params, ['player_name'])) return fail(ERR.MISSING_PARAMS);
  var name = params.player_name.trim();
  if (!name) return fail(ERR.NAME_REQUIRED);

  return withLock(function() {
    var sheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
    var rows = sheetToObjects(sheet);

    // Cek duplikat nama (case-insensitive)
    var nameLower = name.toLowerCase();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].status !== 'deleted' &&
          rows[i].player_name.toLowerCase() === nameLower) {
        return fail(ERR.NAME_DUPLICATE);
      }
    }

    var playerId = generateUUID();
    appendRow(sheet, {
      player_id    : playerId,
      player_name  : name,
      nickname     : params.nickname ? params.nickname.trim() : '',
      elo          : ELO.DEFAULT,
      total_games  : 0,
      total_wins   : 0,
      total_losses : 0,
      created_at   : now(),
      last_played_at: '',
      status       : 'active'
    });

    // Init player_stats juga
    var statsSheet = getDbSheet(DB_SHEET.PLAYER_STATS);
    appendRow(statsSheet, {
      player_id    : playerId,
      session_count: 0,
      match_count  : 0,
      win_count    : 0,
      loss_count   : 0,
      win_rate     : 0,
      current_elo  : ELO.DEFAULT,
      peak_elo     : ELO.DEFAULT,
      last_updated : now()
    });

    logAction(user.user_id, 'player.create', name);
    return ok({ player_id: playerId, player_name: name });
  });
}

// Update nama / nickname player
// params: { player_id, player_name?, nickname? }
function playerUpdate(params, user) {
  if (!requireFields(params, ['player_id'])) return fail(ERR.MISSING_PARAMS);

  return withLock(function() {
    var sheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
    var player = findRowByField(sheet, 'player_id', params.player_id);
    if (!player || player.status === 'deleted') return fail(ERR.PLAYER_NOT_FOUND);

    var updates = {};
    if (params.player_name !== undefined) {
      var name = params.player_name.trim();
      if (!name) return fail(ERR.NAME_REQUIRED);
      // Cek duplikat
      var rows = sheetToObjects(sheet);
      var nameLower = name.toLowerCase();
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].player_id !== params.player_id &&
            rows[i].status !== 'deleted' &&
            rows[i].player_name.toLowerCase() === nameLower) {
          return fail(ERR.NAME_DUPLICATE);
        }
      }
      updates.player_name = name;
    }
    if (params.nickname !== undefined) {
      updates.nickname = params.nickname.trim();
    }

    if (Object.keys(updates).length > 0) {
      updateRowById(sheet, 'player_id', params.player_id, updates);
    }

    logAction(user.user_id, 'player.update', params.player_id);
    return ok({ player_id: params.player_id });
  });
}

// Soft delete player
// params: { player_id }
function playerDelete(params, user) {
  if (!requireFields(params, ['player_id'])) return fail(ERR.MISSING_PARAMS);

  return withLock(function() {
    var sheet = getDbSheet(DB_SHEET.PLAYER_MASTER);
    var player = findRowByField(sheet, 'player_id', params.player_id);
    if (!player || player.status === 'deleted') return fail(ERR.PLAYER_NOT_FOUND);

    updateRowById(sheet, 'player_id', params.player_id, { status: 'deleted' });
    logAction(user.user_id, 'player.delete', params.player_id);
    return ok({ player_id: params.player_id });
  });
}
