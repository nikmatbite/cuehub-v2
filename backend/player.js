var PlayerService = {

  create: function (payload) {
    requireFields(payload, ['player_name']);

    var sheet = getSheet('db', SHEET_PLAYER_MASTER);

    // cek duplikat nama (case-insensitive)
    var existing = sheetToObjects(sheet).filter(function (row) {
      return row.player_name.toString().toLowerCase() ===
             payload.player_name.toString().toLowerCase();
    });
    if (existing.length > 0) throw new ApiError('PLAYER_NAME_EXISTS');

    var now    = nowISOString();
    var player = {
      player_id:   generateUUID(),
      player_name: payload.player_name,
      nickname:    payload.nickname    || '',
      phone:       payload.phone       || '',
      notes:       payload.notes       || '',
      created_at:  now,
      last_play:   ''
    };

    withLock(function () { appendRowObject(sheet, player); });
    logAction(payload._user_id, 'PLAYER_CREATE', player.player_id);

    return player;
  },

  getAll: function () {
    var sheet = getSheet('db', SHEET_PLAYER_MASTER);
    var rows  = sheetToObjects(sheet);
    return rows.map(function (r) { return PlayerService._sanitize(r); });
  },

  getById: function (payload) {
    requireFields(payload, ['player_id']);

    var sheet  = getSheet('db', SHEET_PLAYER_MASTER);
    var player = findRowByField(sheet, 'player_id', payload.player_id);
    if (!player) throw new ApiError('PLAYER_NOT_FOUND');

    return PlayerService._sanitize(player);
  },

  update: function (payload) {
    requireFields(payload, ['player_id']);

    var sheet  = getSheet('db', SHEET_PLAYER_MASTER);
    var player = findRowByField(sheet, 'player_id', payload.player_id);
    if (!player) throw new ApiError('PLAYER_NOT_FOUND');

    // cek duplikat nama jika player_name ikut diubah
    if (payload.player_name) {
      var duplicate = sheetToObjects(sheet).filter(function (row) {
        return row.player_name.toString().toLowerCase() ===
               payload.player_name.toString().toLowerCase() &&
               row.player_id !== payload.player_id;
      });
      if (duplicate.length > 0) throw new ApiError('PLAYER_NAME_EXISTS');
    }

    var updates = {};
    ['player_name', 'nickname', 'phone', 'notes'].forEach(function (f) {
      if (payload[f] !== undefined) updates[f] = payload[f];
    });

    withLock(function () { updateRowObject(sheet, player._rowIndex, updates); });
    logAction(payload._user_id, 'PLAYER_UPDATE', payload.player_id);

    return Object.assign({}, PlayerService._sanitize(player), updates);
  },

  delete: function (payload) {
    requireFields(payload, ['player_id']);

    var sheet  = getSheet('db', SHEET_PLAYER_MASTER);
    var player = findRowByField(sheet, 'player_id', payload.player_id);
    if (!player) throw new ApiError('PLAYER_NOT_FOUND');

    // cek apakah player sudah pernah dipakai di session manapun
    var spSheet = getSheet('db', SHEET_SESSION_PLAYERS);
    var linked  = findRowByField(spSheet, 'player_id', payload.player_id);
    if (linked) throw new ApiError('PLAYER_IN_USE');

    withLock(function () {
      sheet.deleteRow(player._rowIndex);
    });
    logAction(payload._user_id, 'PLAYER_DELETE', payload.player_id);

    return { player_id: payload.player_id };
  },

  // update last_play — dipanggil internal saat match selesai
  updateLastPlay: function (playerId) {
    var sheet  = getSheet('db', SHEET_PLAYER_MASTER);
    var player = findRowByField(sheet, 'player_id', playerId);
    if (!player) return;
    updateRowObject(sheet, player._rowIndex, { last_play: nowISOString() });
  },

  // strip _rowIndex sebelum dikirim ke frontend
  _sanitize: function (row) {
    return {
      player_id:   row.player_id,
      player_name: row.player_name,
      nickname:    row.nickname,
      phone:       row.phone,
      notes:       row.notes,
      created_at:  row.created_at,
      last_play:   row.last_play
    };
  }

};