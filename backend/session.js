var SessionService = {

  create: function (payload) {
    requireFields(payload, ['title', 'date']);

    var sheet      = getSheet('db', SHEET_SESSION_MASTER);
    var allSessions = sheetToObjects(sheet);

    // auto-increment session_number dari baris yang ada
    var maxNumber = 0;
    allSessions.forEach(function (r) {
      var n = parseInt(r.session_number, 10);
      if (!isNaN(n) && n > maxNumber) maxNumber = n;
    });

    var now     = nowISOString();
    var session = {
      session_id:     generateUUID(),
      session_number: maxNumber + 1,
      title:          payload.title,
      date:           payload.date,
      start_time:     payload.start_time  || '',
      end_time:       payload.end_time    || '',
      location:       payload.location    || '',
      notes:          payload.notes       || '',
      status:         SESSION_STATUS.SCHEDULED,
      created_by:     payload._user_id    || '',
      created_at:     now,
      updated_by:     '',
      updated_at:     ''
    };

    withLock(function () { appendRowObject(sheet, session); });
    logAction(payload._user_id, 'SESSION_CREATE', session.session_id);

    return session;
  },

  getAll: function (payload) {
    var sheet = getSheet('db', SHEET_SESSION_MASTER);
    var rows  = sheetToObjects(sheet);

    // filter opsional by status
    if (payload && payload.status) {
      rows = rows.filter(function (r) { return r.status === payload.status; });
    }

    // sort descending by session_number
    rows.sort(function (a, b) {
      return parseInt(b.session_number, 10) - parseInt(a.session_number, 10);
    });

    return rows.map(function (r) { return SessionService._sanitize(r); });
  },

  getById: function (payload) {
    requireFields(payload, ['session_id']);

    var sheet   = getSheet('db', SHEET_SESSION_MASTER);
    var session = findRowByField(sheet, 'session_id', payload.session_id);
    if (!session) throw new ApiError('SESSION_NOT_FOUND');

    var result  = SessionService._sanitize(session);
    result.players = SessionService._getPlayers(payload.session_id);

    return result;
  },

  update: function (payload) {
    requireFields(payload, ['session_id']);

    var sheet   = getSheet('db', SHEET_SESSION_MASTER);
    var session = findRowByField(sheet, 'session_id', payload.session_id);
    if (!session) throw new ApiError('SESSION_NOT_FOUND');

    if (session.status === SESSION_STATUS.FINISHED) throw new ApiError('SESSION_ALREADY_FINISHED');

    var updates = { updated_by: payload._user_id || '', updated_at: nowISOString() };
    ['title', 'date', 'start_time', 'end_time', 'location', 'notes'].forEach(function (f) {
      if (payload[f] !== undefined) updates[f] = payload[f];
    });

    withLock(function () { updateRowObject(sheet, session._rowIndex, updates); });
    logAction(payload._user_id, 'SESSION_UPDATE', payload.session_id);

    return Object.assign({}, SessionService._sanitize(session), updates);
  },

  updateStatus: function (payload) {
    requireFields(payload, ['session_id', 'status']);

    if (!Object.values(SESSION_STATUS).includes(payload.status)) {
      throw new ApiError('INVALID_STATUS');
    }

    var sheet   = getSheet('db', SHEET_SESSION_MASTER);
    var session = findRowByField(sheet, 'session_id', payload.session_id);
    if (!session) throw new ApiError('SESSION_NOT_FOUND');

    var updates = {
      status:     payload.status,
      updated_by: payload._user_id || '',
      updated_at: nowISOString()
    };

    // otomatis isi end_time saat session di-finish
    if (payload.status === SESSION_STATUS.FINISHED && !session.end_time) {
      updates.end_time = nowISOString();
    }

    withLock(function () { updateRowObject(sheet, session._rowIndex, updates); });
    logAction(payload._user_id, 'SESSION_STATUS_UPDATE', payload.session_id + ':' + payload.status);

    return Object.assign({}, SessionService._sanitize(session), updates);
  },

  addPlayer: function (payload) {
    requireFields(payload, ['session_id', 'player_id']);

    // validasi session ada
    var sSheet  = getSheet('db', SHEET_SESSION_MASTER);
    var session = findRowByField(sSheet, 'session_id', payload.session_id);
    if (!session) throw new ApiError('SESSION_NOT_FOUND');
    if (session.status === SESSION_STATUS.FINISHED) throw new ApiError('SESSION_ALREADY_FINISHED');

    // validasi player ada
    var pSheet = getSheet('db', SHEET_PLAYER_MASTER);
    var player = findRowByField(pSheet, 'player_id', payload.player_id);
    if (!player) throw new ApiError('PLAYER_NOT_FOUND');

    // cek sudah terdaftar di session ini
    var spSheet  = getSheet('db', SHEET_SESSION_PLAYERS);
    var existing = sheetToObjects(spSheet).filter(function (r) {
      return r.session_id === payload.session_id &&
             r.player_id  === payload.player_id  &&
             r.leave_time === '';
    });
    if (existing.length > 0) throw new ApiError('PLAYER_ALREADY_IN_SESSION');

    var entry = {
      session_player_id: generateUUID(),
      session_id:        payload.session_id,
      player_id:         payload.player_id,
      join_time:         nowISOString(),
      leave_time:        ''
    };

    withLock(function () { appendRowObject(spSheet, entry); });
    logAction(payload._user_id, 'SESSION_ADD_PLAYER', payload.session_id + ':' + payload.player_id);

    return entry;
  },

  removePlayer: function (payload) {
    requireFields(payload, ['session_id', 'player_id']);

    var spSheet = getSheet('db', SHEET_SESSION_PLAYERS);
    var rows    = sheetToObjects(spSheet).filter(function (r) {
      return r.session_id === payload.session_id &&
             r.player_id  === payload.player_id  &&
             r.leave_time === '';
    });
    if (rows.length === 0) throw new ApiError('PLAYER_NOT_IN_SESSION');

    var now = nowISOString();
    withLock(function () {
      rows.forEach(function (r) {
        updateRowObject(spSheet, r._rowIndex, { leave_time: now });
      });
    });
    logAction(payload._user_id, 'SESSION_REMOVE_PLAYER', payload.session_id + ':' + payload.player_id);

    return { session_id: payload.session_id, player_id: payload.player_id, leave_time: now };
  },

  getPlayers: function (payload) {
    requireFields(payload, ['session_id']);
    return SessionService._getPlayers(payload.session_id);
  },

  // internal helper — dipakai getById dan getPlayers
  _getPlayers: function (sessionId) {
    var spSheet  = getSheet('db', SHEET_SESSION_PLAYERS);
    var pSheet   = getSheet('db', SHEET_PLAYER_MASTER);
    var spRows   = findAllByField(spSheet, 'session_id', sessionId);
    var allPlayers = sheetToObjects(pSheet);

    return spRows.map(function (sp) {
      var player = allPlayers.filter(function (p) {
        return p.player_id === sp.player_id;
      })[0] || {};
      return {
        session_player_id: sp.session_player_id,
        player_id:         sp.player_id,
        player_name:       player.player_name || '',
        nickname:          player.nickname    || '',
        join_time:         sp.join_time,
        leave_time:        sp.leave_time
      };
    });
  },

  _sanitize: function (row) {
    return {
      session_id:     row.session_id,
      session_number: row.session_number,
      title:          row.title,
      date:           row.date,
      start_time:     row.start_time,
      end_time:       row.end_time,
      location:       row.location,
      notes:          row.notes,
      status:         row.status,
      created_by:     row.created_by,
      created_at:     row.created_at,
      updated_by:     row.updated_by,
      updated_at:     row.updated_at
    };
  }

};