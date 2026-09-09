// =============================================================
// CueHub v3 — installer.gs
// Jalankan installAll() SEKALI dari GAS editor untuk setup awal
// =============================================================

function installAll() {
  installCoreSheets();
  installDatabaseSheets();
  Logger.log('✅ CueHub v3 installation selesai.');
  Logger.log('Langkah berikutnya:');
  Logger.log('1. Isi DB_SPREADSHEET_ID di constants.gs');
  Logger.log('2. Deploy GAS sebagai Web App');
  Logger.log('3. Register akun pertama via frontend');
}

// --- Setup sheet di file Core (bound ke GAS) ---
function installCoreSheets() {
  var ss = getCoreSpreadsheet();

  _ensureSheet(ss, SHEET.CONFIG, [
    'key', 'value'
  ]);
  _seedConfig(ss);

  _ensureSheet(ss, SHEET.USERS, [
    'user_id', 'display_name', 'password_hash', 'token',
    'status', 'last_login', 'created_at'
  ]);

  _ensureSheet(ss, SHEET.LOGS, [
    'log_id', 'timestamp', 'user_id', 'action', 'detail'
  ]);

  Logger.log('✅ Core sheets selesai.');
}

// --- Setup sheet di file Database (spreadsheet terpisah) ---
function installDatabaseSheets() {
  if (!DB_SPREADSHEET_ID) {
    Logger.log('⚠️  DB_SPREADSHEET_ID kosong. Isi dulu di constants.gs, lalu jalankan installDatabaseSheets() lagi.');
    return;
  }
  var ss = getDbSpreadsheet();

  _ensureSheet(ss, DB_SHEET.PLAYER_MASTER, [
    'player_id', 'player_name', 'nickname',
    'elo', 'total_games', 'total_wins', 'total_losses',
    'created_at', 'last_played_at', 'status'
  ]);

  _ensureSheet(ss, DB_SHEET.SESSION_MASTER, [
    'session_id', 'session_number',
    'started_at', 'ended_at', 'status', 'notes'
  ]);

  // Segment = satu blok permainan dalam sesi (1 mode + 1 set player + 1 siklus)
  // Setiap kali End Game atau Shuffle ulang → segment baru
  _ensureSheet(ss, DB_SHEET.SESSION_SEGMENTS, [
    'segment_id', 'session_id', 'segment_order',
    'game_mode', 'player_ids',   // player_ids: JSON array
    'cycle_json',                // seluruh siklus yang digenerate (JSON array of match arrays)
    'cycle_index',               // posisi saat ini dalam cycle
    'status',                    // ongoing | finished
    'started_at', 'ended_at'
  ]);

  _ensureSheet(ss, DB_SHEET.MATCH_MASTER, [
    'match_id', 'segment_id', 'match_order',
    'player_ids',   // JSON array: semua player dalam match ini
    'winner_ids',   // JSON array: pemenang (1 untuk duel/king, bisa lebih untuk singapore)
    'elo_before',   // JSON object: { player_id: elo_value }
    'elo_after',    // JSON object: { player_id: elo_value }
    'played_at'
  ]);

  _ensureSheet(ss, DB_SHEET.PLAYER_STATS, [
    'player_id', 'session_count', 'match_count',
    'win_count', 'loss_count', 'win_rate',
    'current_elo', 'peak_elo', 'last_updated'
  ]);

  Logger.log('✅ Database sheets selesai.');
}

// --- Helper: buat sheet jika belum ada, atau pastikan header benar ---
function _ensureSheet(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    // Freeze header row
    sh.setFrozenRows(1);
    // Style header
    sh.getRange(1, 1, 1, headers.length)
      .setBackground('#1a1a2e')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    Logger.log('  ✅ Sheet dibuat: ' + name);
  } else {
    Logger.log('  ⏭️  Sheet sudah ada: ' + name);
  }
}

// --- Seed CONFIG ---
function _seedConfig(ss) {
  var sh = ss.getSheetByName(SHEET.CONFIG);
  var data = sh.getDataRange().getValues();
  // Cek apakah sudah ada data (selain header)
  if (data.length > 1) {
    Logger.log('  ⏭️  CONFIG sudah ada data, skip seed.');
    return;
  }
  var configs = [
    ['app_name',       'CueHub'],
    ['version',        '3.0.0'],
    ['default_lang',   'id'],
    ['default_theme',  'dark'],
    ['db_linked',      'false']  // set ke true setelah DB_SPREADSHEET_ID diisi
  ];
  for (var i = 0; i < configs.length; i++) {
    sh.appendRow(configs[i]);
  }
  Logger.log('  ✅ CONFIG seed selesai.');
}
