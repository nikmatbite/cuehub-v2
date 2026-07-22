// Catatan: game.create / game.update / game.delete tidak diekspos
// ke frontend — Game Master diisi manual oleh developer di sheet
// sesuai game mode yang didukung sistem (Duel, King of Table, dst.)
// User hanya bisa membaca Game Master dan menggunakannya di Session.
// developer cukup run fungsi installDatabase yg ada di installer.gs apps script

var GameService = {

  // ---- Game Master ----

  getAll: function () {
    var sheet = getSheet('db', SHEET_GAME_MASTER);
    var rows  = sheetToObjects(sheet);
    return rows
      .filter(function (r) { return r.active == true || r.active === 'TRUE'; })
      .map(function (r) { return GameService._sanitizeGame(r); });
  },

  getById: function (payload) {
    requireFields(payload, ['game_id']);

    var sheet = getSheet('db', SHEET_GAME_MASTER);
    var game  = findRowByField(sheet, 'game_id', payload.game_id);
    if (!game) throw new ApiError('GAME_NOT_FOUND');

    return GameService._sanitizeGame(game);
  },

  // ---- Session Games ----

  // Tambahkan game ke dalam sebuah session.
  // Field config berisi JSON string konfigurasi spesifik per game mode.
  // Contoh Team Battle: { rotation_mode: 'fair', team_size: 2 }
  // Contoh Custom     : { team_size: 3, rotation: 'manual', score_system: 'point', match_type: 'race' }
  // Contoh King/Duel  : {} (kosong, tidak butuh config khusus)
  sessionCreate: function (payload) {
    requireFields(payload, ['session_id', 'game_id']);

    // validasi session ada dan belum selesai
    var sSheet  = getSheet('db', SHEET_SESSION_MASTER);
    var session = findRowByField(sSheet, 'session_id', payload.session_id);
    if (!session) throw new ApiError('SESSION_NOT_FOUND');
    if (session.status === SESSION_STATUS.FINISHED) throw new ApiError('SESSION_ALREADY_FINISHED');

    // validasi game ada dan aktif
    var gSheet = getSheet('db', SHEET_GAME_MASTER);
    var game   = findRowByField(gSheet, 'game_id', payload.game_id);
    if (!game) throw new ApiError('GAME_NOT_FOUND');
    if (!(game.active == true || game.active === 'TRUE')) throw new ApiError('GAME_INACTIVE');

    // validasi config jika game mode butuh config wajib
    var config = payload.config || {};
    GameService._validateConfig(game.game_name, config);

    // auto game_order: ambil jumlah session_games yang sudah ada di session ini
    var sgSheet    = getSheet('db', SHEET_SESSION_GAMES);
    var existing   = findAllByField(sgSheet, 'session_id', payload.session_id);
    var game_order = existing.length + 1;

    var sessionGame = {
      session_game_id: generateUUID(),
      session_id:      payload.session_id,
      game_id:         payload.game_id,
      game_order:      game_order,
      start_time:      payload.start_time || '',
      end_time:        '',
      status:          SESSION_GAME_STATUS.SCHEDULED,
      notes:           payload.notes      || '',
      config:          JSON.stringify(config)
    };

    withLock(function () { appendRowObject(sgSheet, sessionGame); });
    logAction(payload._user_id, 'SESSION_GAME_CREATE', sessionGame.session_game_id);

    return GameService._sanitizeSessionGame(sessionGame, game);
  },

  sessionGetAll: function (payload) {
    requireFields(payload, ['session_id']);

    var sgSheet = getSheet('db', SHEET_SESSION_GAMES);
    var gSheet  = getSheet('db', SHEET_GAME_MASTER);
    var sgRows  = findAllByField(sgSheet, 'session_id', payload.session_id);
    var allGames = sheetToObjects(gSheet);

    sgRows.sort(function (a, b) {
      return parseInt(a.game_order, 10) - parseInt(b.game_order, 10);
    });

    return sgRows.map(function (sg) {
      var game = allGames.filter(function (g) {
        return g.game_id === sg.game_id;
      })[0] || {};
      return GameService._sanitizeSessionGame(sg, game);
    });
  },

  sessionGetById: function (payload) {
    requireFields(payload, ['session_game_id']);

    var sgSheet     = getSheet('db', SHEET_SESSION_GAMES);
    var sessionGame = findRowByField(sgSheet, 'session_game_id', payload.session_game_id);
    if (!sessionGame) throw new ApiError('SESSION_GAME_NOT_FOUND');

    var gSheet = getSheet('db', SHEET_GAME_MASTER);
    var game   = findRowByField(gSheet, 'game_id', sessionGame.game_id) || {};

    return GameService._sanitizeSessionGame(sessionGame, game);
  },

  sessionUpdate: function (payload) {
    requireFields(payload, ['session_game_id']);

    var sgSheet     = getSheet('db', SHEET_SESSION_GAMES);
    var sessionGame = findRowByField(sgSheet, 'session_game_id', payload.session_game_id);
    if (!sessionGame) throw new ApiError('SESSION_GAME_NOT_FOUND');
    if (sessionGame.status === SESSION_GAME_STATUS.FINISHED) {
      throw new ApiError('SESSION_GAME_ALREADY_FINISHED');
    }

    var updates = {};
    ['start_time', 'notes'].forEach(function (f) {
      if (payload[f] !== undefined) updates[f] = payload[f];
    });

    // update config jika dikirim
    if (payload.config !== undefined) {
      var gSheet = getSheet('db', SHEET_GAME_MASTER);
      var game   = findRowByField(gSheet, 'game_id', sessionGame.game_id) || {};
      GameService._validateConfig(game.game_name, payload.config);
      updates.config = JSON.stringify(payload.config);
    }

    withLock(function () { updateRowObject(sgSheet, sessionGame._rowIndex, updates); });
    logAction(payload._user_id, 'SESSION_GAME_UPDATE', payload.session_game_id);

    return Object.assign(
      {},
      GameService._sanitizeSessionGame(sessionGame, {}),
      updates,
      { config: updates.config ? JSON.parse(updates.config) : JSON.parse(sessionGame.config || '{}') }
    );
  },

  sessionUpdateStatus: function (payload) {
    requireFields(payload, ['session_game_id', 'status']);

    if (!Object.values(SESSION_GAME_STATUS).includes(payload.status)) {
      throw new ApiError('INVALID_STATUS');
    }

    var sgSheet     = getSheet('db', SHEET_SESSION_GAMES);
    var sessionGame = findRowByField(sgSheet, 'session_game_id', payload.session_game_id);
    if (!sessionGame) throw new ApiError('SESSION_GAME_NOT_FOUND');

    var updates = { status: payload.status };

    if (payload.status === SESSION_GAME_STATUS.ONGOING && !sessionGame.start_time) {
      updates.start_time = nowISOString();
    }
    if (payload.status === SESSION_GAME_STATUS.FINISHED && !sessionGame.end_time) {
      updates.end_time = nowISOString();
    }

    withLock(function () { updateRowObject(sgSheet, sessionGame._rowIndex, updates); });
    logAction(payload._user_id, 'SESSION_GAME_STATUS_UPDATE',
      payload.session_game_id + ':' + payload.status);

    return Object.assign({}, GameService._sanitizeSessionGame(sessionGame, {}), updates);
  },

  // ---- Config Validator ----
  // Validasi field wajib di config berdasarkan game mode.
  _validateConfig: function (gameName, config) {
    var mode = (gameName || '').toLowerCase().replace(/ /g, '_');

    if (mode === GAME_MODE.TEAM_BATTLE) {
      if (!config.rotation_mode) throw new ApiError('CONFIG_MISSING:rotation_mode');
      if (!Object.values(ROTATION_MODE).includes(config.rotation_mode)) {
        throw new ApiError('CONFIG_INVALID:rotation_mode');
      }
      if (!config.team_size || parseInt(config.team_size, 10) < 2) {
        throw new ApiError('CONFIG_MISSING:team_size');
      }
    }

    if (mode === GAME_MODE.CUSTOM) {
      ['team_size', 'rotation', 'score_system', 'match_type'].forEach(function (f) {
        if (!config[f]) throw new ApiError('CONFIG_MISSING:' + f);
      });
    }
  },

  // ---- Sanitizers ----
  _sanitizeGame: function (row) {
    return {
      game_id:     row.game_id,
      game_name:   row.game_name,
      description: row.description,
      active:      row.active == true || row.active === 'TRUE'
    };
  },

  _sanitizeSessionGame: function (sg, game) {
    var config = {};
    try { config = JSON.parse(sg.config || '{}'); } catch (e) { config = {}; }
    return {
      session_game_id: sg.session_game_id,
      session_id:      sg.session_id,
      game_id:         sg.game_id,
      game_name:       game.game_name   || '',
      description:     game.description || '',
      game_order:      sg.game_order,
      start_time:      sg.start_time,
      end_time:        sg.end_time,
      status:          sg.status,
      notes:           sg.notes,
      config:          config
    };
  }

};