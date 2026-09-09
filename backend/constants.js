// =============================================================
// CueHub v3 — constants.gs
// Semua enum, nama sheet, dan konstanta global
// JANGAN hardcode string enum di file lain — selalu pakai dari sini
// =============================================================

// --- Database Spreadsheet ID ---
// Isi dengan ID Google Spreadsheet database setelah installDatabase() dijalankan
var DB_SPREADSHEET_ID = '';

// --- Sheet Names: Core (bound ke GAS) ---
var SHEET = {
  CONFIG  : 'CONFIG',
  USERS   : 'USERS',
  LOGS    : 'LOGS'
};

// --- Sheet Names: Database (spreadsheet terpisah) ---
var DB_SHEET = {
  PLAYER_MASTER   : 'PLAYER_MASTER',
  SESSION_MASTER  : 'SESSION_MASTER',
  SESSION_SEGMENTS: 'SESSION_SEGMENTS',
  MATCH_MASTER    : 'MATCH_MASTER',
  PLAYER_STATS    : 'PLAYER_STATS'
};

// --- Session Status ---
var SESSION_STATUS = {
  ONGOING  : 'ongoing',
  FINISHED : 'finished'
};

// --- Segment Status ---
var SEGMENT_STATUS = {
  ONGOING  : 'ongoing',
  FINISHED : 'finished'
};

// --- Match Status ---
var MATCH_STATUS = {
  PLAYED   : 'played',
  SKIPPED  : 'skipped'
};

// --- Game Mode ---
var GAME_MODE = {
  DUEL        : 'duel',
  KING        : 'king_of_table',
  TEAM_BATTLE : 'team_battle',
  SINGAPORE   : 'singapore'
};

// --- User Status ---
var USER_STATUS = {
  ACTIVE   : 'active',
  INACTIVE : 'inactive'
};

// --- ELO Config ---
var ELO = {
  DEFAULT     : 1000,
  K_BEGINNER  : 40,   // < 10 games
  K_NOVICE    : 32,   // 10–29 games
  K_REGULAR   : 24,   // 30–99 games
  K_VETERAN   : 16    // >= 100 games
};

// --- Minimum Players per Mode ---
var MIN_PLAYERS = {
  duel         : 2,
  king_of_table: 3,
  team_battle  : 4,
  singapore    : 3
};

// --- Error Codes ---
// Frontend translate via lang.js
var ERR = {
  INVALID_ACTION     : 'INVALID_ACTION',
  MISSING_PARAMS     : 'MISSING_PARAMS',
  UNAUTHORIZED       : 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND     : 'USER_NOT_FOUND',
  PLAYER_NOT_FOUND   : 'PLAYER_NOT_FOUND',
  SESSION_NOT_FOUND  : 'SESSION_NOT_FOUND',
  SEGMENT_NOT_FOUND  : 'SEGMENT_NOT_FOUND',
  MATCH_NOT_FOUND    : 'MATCH_NOT_FOUND',
  NAME_REQUIRED      : 'NAME_REQUIRED',
  NAME_DUPLICATE     : 'NAME_DUPLICATE',
  MIN_PLAYERS        : 'MIN_PLAYERS',
  INVALID_MODE       : 'INVALID_MODE',
  INVALID_WINNER     : 'INVALID_WINNER',
  SESSION_FINISHED   : 'SESSION_FINISHED',
  SEGMENT_FINISHED   : 'SEGMENT_FINISHED',
  SERVER_ERROR       : 'SERVER_ERROR'
};
