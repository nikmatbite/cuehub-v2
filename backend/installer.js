// ================================================================
// installer.gs
// Jalankan installDatabase() SEKALI dari Apps Script editor
// setiap kali ada client baru, setelah DB_SPREADSHEET_ID diisi
// di constants.gs.
// ================================================================

var DB_SCHEMA = [
  {
    name: SHEET_SESSION_MASTER,
    headers: [
      'session_id', 'session_number', 'title', 'date',
      'start_time', 'end_time', 'location', 'notes',
      'status', 'created_by', 'created_at', 'updated_by', 'updated_at'
    ]
  },
  {
    name: SHEET_PLAYER_MASTER,
    headers: [
      'player_id', 'player_name', 'nickname',
      'phone', 'notes', 'created_at', 'last_play'
    ]
  },
  {
    name: SHEET_SESSION_PLAYERS,
    headers: [
      'session_player_id', 'session_id', 'player_id',
      'join_time', 'leave_time'
    ]
  },
  {
    name: SHEET_GAME_MASTER,
    headers: ['game_id', 'game_name', 'description', 'active']
  },
  {
    name: SHEET_SESSION_GAMES,
    headers: [
      'session_game_id', 'session_id', 'game_id', 'game_order',
      'start_time', 'end_time', 'status', 'notes', 'config'
    ]
  },
  {
    name: SHEET_MATCH_MASTER,
    headers: [
      'match_id', 'session_game_id', 'next_match_id', 'match_no',
      'round', 'winner_player', 'winner_team', 'status',
      'start_time', 'end_time', 'updated_by', 'updated_at'
    ]
  },
  {
    name: SHEET_MATCH_PLAYERS,
    headers: ['match_player_id', 'match_id', 'player_id', 'team', 'ranking']
  },
  {
    name: SHEET_SCORE_LOG,
    headers: [
      'score_id', 'match_id', 'player_id', 'score',
      'input_time', 'updated_by', 'updated_at'
    ]
  },
  {
    name: SHEET_ROTATION_HISTORY,
    headers: [
      'rotation_id', 'session_game_id', 'match_id',
      'player_1', 'player_2', 'type'
    ]
  },
  {
    name: SHEET_SESSION_GAME_QUEUE,
    headers: ['queue_id', 'session_game_id', 'player_id', 'queue_order', 'status']
  },
  {
    name: SHEET_SESSION_STATISTICS,
    headers: [
      'session_id', 'total_match', 'total_game', 'total_player',
      'total_duration', 'mvp', 'champion', 'updated_at'
    ]
  },
  {
    name: SHEET_PLAYER_STATISTICS,
    headers: [
      'player_id', 'session', 'match', 'win', 'lose', 'win_rate',
      'king_title', 'tournament_title', 'singapore_win',
      'team_win', 'longest_streak', 'last_update'
    ]
  }
];

var GAME_MASTER_SEED = [
  { game_name: GAME_MODE.DUEL,         description: '', active: true },
  { game_name: GAME_MODE.KING_OF_TABLE,description: '', active: true },
  { game_name: GAME_MODE.TEAM_BATTLE,  description: '', active: true },
  { game_name: GAME_MODE.SINGAPORE,    description: '', active: true },
  { game_name: GAME_MODE.TOURNAMENT,   description: '', active: true },
  { game_name: GAME_MODE.ROUND_ROBIN,  description: '', active: true },
  { game_name: GAME_MODE.CUSTOM,       description: '', active: true }
];

function installDatabase() {
  var ss = getDbSpreadsheet();

  // ---- 1. Buat sheet + set header ----
  DB_SCHEMA.forEach(function (schema) {
    var sheet = ss.getSheetByName(schema.name);

    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
      console.log('[INSTALL] Sheet dibuat: ' + schema.name);
    } else {
      console.log('[INSTALL] Sheet sudah ada, skip buat: ' + schema.name);
    }

    // set header hanya jika baris pertama masih kosong
    var firstCell = sheet.getRange(1, 1).getValue();
    if (!firstCell || firstCell === '') {
      sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      console.log('[INSTALL] Header diset: ' + schema.name);
    } else {
      console.log('[INSTALL] Header sudah ada, skip: ' + schema.name);
    }
  });

  // ---- 2. Seed GAME_MASTER jika masih kosong ----
  var gameSheet = ss.getSheetByName(SHEET_GAME_MASTER);
  var existing  = gameSheet.getLastRow();

  if (existing <= 1) {
    GAME_MASTER_SEED.forEach(function (game) {
      appendRowObject(gameSheet, {
        game_id:     generateUUID(),
        game_name:   game.game_name,
        description: game.description,
        active:      game.active
      });
    });
    console.log('[INSTALL] GAME_MASTER seed selesai: ' + GAME_MASTER_SEED.length + ' game ditambahkan');
  } else {
    console.log('[INSTALL] GAME_MASTER sudah ada data, skip seed');
  }

  // ---- 3. Hapus sheet default "Sheet1" jika masih ada ----
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
    console.log('[INSTALL] Sheet1 default dihapus');
  }

  console.log('[INSTALL] Instalasi database selesai');
}

// ---- Cek kondisi database (opsional, untuk verifikasi) ----
function checkDatabase() {
  var ss      = getDbSpreadsheet();
  var results = [];

  DB_SCHEMA.forEach(function (schema) {
    var sheet      = ss.getSheetByName(schema.name);
    var exists     = !!sheet;
    var rowCount   = exists ? Math.max(sheet.getLastRow() - 1, 0) : 0;
    results.push({
      sheet:     schema.name,
      exists:    exists,
      row_count: rowCount
    });
  });

  results.forEach(function (r) {
    console.log(
      '[CHECK] ' + r.sheet +
      ' | exists: ' + r.exists +
      ' | rows: '  + r.row_count
    );
  });

  return results;
}