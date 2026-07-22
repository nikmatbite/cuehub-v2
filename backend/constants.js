// ---- Spreadsheet IDs (isi manual setelah spreadsheet dibuat) ----
var DB_SPREADSHEET_ID   = '1Aj8bMA8C9tXNFdu4VaDtsT2AiTPQ0jK1_P1fQ-8oCs4';
// var DB_SPREADSHEET_ID   = 'id_database_user_2';
// var DB_SPREADSHEET_ID   = 'id_database_user_3';

// ---- Sheet Names - FILE CORE ----
var SHEET_CONFIG = 'CONFIG';
var SHEET_USERS  = 'USERS';
var SHEET_LOGS   = 'LOGS';

// ---- Sheet Names - FILE DATABASE ----
var SHEET_SESSION_MASTER      = 'SESSION_MASTER';
var SHEET_PLAYER_MASTER       = 'PLAYER_MASTER';
var SHEET_SESSION_PLAYERS     = 'SESSION_PLAYERS';
var SHEET_GAME_MASTER         = 'GAME_MASTER';
var SHEET_SESSION_GAMES       = 'SESSION_GAMES';
var SHEET_MATCH_MASTER        = 'MATCH_MASTER';
var SHEET_MATCH_PLAYERS       = 'MATCH_PLAYERS';
var SHEET_SCORE_LOG           = 'SCORE_LOG';
var SHEET_ROTATION_HISTORY    = 'ROTATION_HISTORY';
var SHEET_SESSION_GAME_QUEUE  = 'SESSION_GAME_QUEUE';
var SHEET_SESSION_STATISTICS  = 'SESSION_STATISTICS';
var SHEET_PLAYER_STATISTICS   = 'PLAYER_STATISTICS';

// ---- Enums ----
var SESSION_STATUS = {
  SCHEDULED: 'scheduled', ONGOING: 'ongoing', FINISHED: 'finished', CANCELLED: 'cancelled'
};

var SESSION_GAME_STATUS = {
  SCHEDULED: 'scheduled', ONGOING: 'ongoing', FINISHED: 'finished', CANCELLED: 'cancelled'
};

var MATCH_STATUS = {
  SCHEDULED: 'scheduled', ONGOING: 'ongoing', FINISHED: 'finished', CANCELLED: 'cancelled'
};

var QUEUE_STATUS = {
  WAITING: 'waiting', PLAYING: 'playing', DONE: 'done', REMOVED: 'removed'
};

var ROTATION_TYPE = {
  PARTNER: 'partner', OPPONENT: 'opponent'
};

var USER_STATUS = {
  ACTIVE: 'active', INACTIVE: 'inactive'
};

var GAME_MODE = {
  DUEL: 'duel', KING_OF_TABLE: 'king_of_table', TEAM_BATTLE: 'team_battle',
  SINGAPORE: 'singapore', TOURNAMENT: 'tournament', ROUND_ROBIN: 'round_robin', CUSTOM: 'custom'
};

var ROTATION_MODE = {
  FAIR: 'fair', RANDOM: 'random', MANUAL: 'manual'
};