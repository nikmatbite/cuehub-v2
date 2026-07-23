var STRINGS = {
  id: {
    // Auth
    AUTH_LOGIN:           'Masuk',
    AUTH_REGISTER:        'Daftar',
    AUTH_EMAIL:           'Email',
    AUTH_PASSWORD:        'Password',
    AUTH_DISPLAY_NAME:    'Nama User',
    AUTH_TIMEZONE:        'Zona waktu',
    AUTH_LANGUAGE:        'Bahasa',
    AUTH_PENDING_TITLE:   'Akun dalam verifikasi',
    AUTH_PENDING_MSG:     'Akun kamu sedang diverifikasi oleh admin. Coba lagi setelah mendapat konfirmasi.',

    // Error codes dari backend
    INVALID_CREDENTIALS:  'Email atau password salah.',
    USER_INACTIVE:        'Akun tidak aktif. Hubungi admin.',
    ACCOUNT_PENDING:      'Akun kamu belum diaktifkan. Tunggu verifikasi dari admin.',
    CORRUPT_PASSWORD:     'Data akun bermasalah. Hubungi admin.',
    CONFIG_NOT_FOUND:     'Konfigurasi akun tidak ditemukan. Hubungi admin.',
    EMAIL_ALREADY_EXISTS: 'Email sudah terdaftar.',
    INVALID_EMAIL:        'Format email tidak valid.',
    PASSWORD_MIN_6:       'Password minimal 6 karakter.',
    MISSING_FIELD:        'Harap lengkapi semua field yang wajib diisi.',
    INTERNAL_ERROR:       'Terjadi kesalahan pada server. Coba lagi.',
    LOCK_TIMEOUT:         'Server sedang sibuk, coba lagi sebentar.',
    NETWORK_ERROR:        'Tidak dapat terhubung ke server. Periksa koneksi internet.',

    // Nav
    NAV_HOME:             'Home',
    NAV_SESSION:          'Sesi',
    NAV_PLAYERS:          'Pemain',
    NAV_HISTORY:          'Riwayat',

    // Dashboard
    DASH_WELCOME:         'Selamat datang,',
    DASH_TOTAL_SESSION:   'Total sesi',
    DASH_WIN_RATE:        'Win rate',
    DASH_TOTAL_MATCH:     'Total match',
    DASH_STREAK:          'Streak terpanjang',
    DASH_LAST_SESSION:    'Sesi terakhir',
    DASH_NO_SESSION:      'Belum ada sesi. Yuk mulai main!',
    BTN_START_PLAY:       'Mulai main',

    // Session
    SESSION_ACTIVE:       'Sesi aktif',
    SESSION_NO_ACTIVE:    'Tidak ada sesi aktif',
    SESSION_SCHEDULED:    'Terjadwal',
    SESSION_ONGOING:      'Berlangsung',
    SESSION_FINISHED:     'Selesai',
    SESSION_CANCELLED:    'Dibatalkan',

    // Player
    PLAYER_SEARCH:        'Cari nama pemain...',
    PLAYER_SELECTED:      'pemain dipilih',
    PLAYER_ALL:           'Semua pemain',
    PLAYER_NEW:           'Pemain baru',
    PLAYER_NAME:          'Nama pemain',
    PLAYER_NICKNAME:      'Nama panggilan',
    PLAYER_PHONE:         'Nomor telepon',
    PLAYER_NOTES:         'Catatan',
    PLAYER_SAVE:          'Simpan',
    PLAYER_READY:         'pemain siap',
    PLAYER_STATS_SESSION: 'sesi',
    PLAYER_STATS_SINCE:   'sejak',
    BTN_NEXT:             'Lanjut',
    PLAYER_NOT_FOUND:     'Pemain tidak ditemukan.',
    PLAYER_IN_USE:        'Pemain sudah memiliki riwayat, tidak bisa dihapus.',
    PLAYER_NAME_EXISTS:   'Nama pemain sudah ada.',

    // Game Mode
    MODE_SELECT:          'Mode permainan',
    MODE_DUEL_DESC:       '1 vs 1, head to head',
    MODE_KING_DESC:       'Sistem antrian, pemenang tetap di meja',
    MODE_TEAM_DESC:       'Tim vs tim dengan rotasi otomatis',
    MODE_SG_DESC:         'Multi-pemain, ranking akhir',
    MODE_TOURN_DESC:      'Bracket eliminasi',
    MODE_RR_DESC:         'Semua lawan semua',
    MODE_CUSTOM_DESC:     'Atur sendiri format permainan',
    BTN_START:            'Mulai',

    // Match / Play
    MATCH_NO:             'Match',
    ROUND:                'Ronde',
    QUEUE:                'Antrian',
    BTN_END_GAME:         'End game',
    BTN_BACK:             'Kembali',
    WINS:                 'menang',

    // Statistik ringkas
    STATS_SUMMARY:        'Ringkasan game',
    STATS_MODE:           'Mode',
    STATS_TOTAL_MATCH:    'Total match',
    STATS_DURATION:       'Durasi',
    STATS_KING:           'King',
    STATS_STREAK:         'Streak terpanjang',
    STATS_CHAMPION:       'Champion',
    STATS_MVP:            'MVP',
    BTN_CLOSE:            'Tutup',
    BTN_END_SESSION:      'Akhiri sesi',

    // History
    HISTORY_BY_SESSION:   'Per sesi',
    HISTORY_BY_GAME:      'Per game',
    HISTORY_NO_DATA:      'Belum ada riwayat.',

    // Settings
    SETTINGS_TITLE:       'Pengaturan',
    SETTINGS_LANGUAGE:    'Bahasa',
    SETTINGS_THEME:       'Warna tema',
    SETTINGS_LOGOUT:      'Keluar',
    THEME_BLUE:           'Biru',
    THEME_GREEN:          'Hijau',
    THEME_PURPLE:         'Ungu',
    THEME_GOLD:           'Gold',
    LANG_ID:              'Indonesia',
    LANG_EN:              'English',

    // Confirm & feedback
    CONFIRM_LOGOUT:       'Yakin ingin keluar?',
    CONFIRM_END_SESSION:  'Yakin akhiri sesi?',
    CONFIRM_DELETE:       'Yakin ingin menghapus?',
    YES:                  'Ya',
    NO:                   'Tidak',
    CANCEL:               'Batal',
    CONFIRM:              'Konfirmasi',
    SUCCESS:              'Berhasil',
    ERROR:                'Gagal',
    SAVED:                'Data berhasil disimpan.',
    DELETED:              'Data berhasil dihapus.',

    // Validasi
    FIELD_REQUIRED:       'Field ini wajib diisi.',
    MIN_PLAYERS:          'Pilih minimal 2 pemain.',
    INSUFFICIENT_PLAYERS: 'Pemain tidak cukup untuk mode ini.',

    PLAY_PICK_WINNER:       'Pilih Pemenang',
    PLAY_WIN_LABEL:         'menang',
    PLAY_INPUT_RANKING:     'Input Ranking',
    PLAY_RANKING_HINT:      'Atur urutan dari peringkat 1 (terbaik) ke bawah menggunakan tombol panah.',
    PLAY_CONFIRM_RESULT:    'Konfirmasi Hasil',
    PLAY_GAME_SUMMARY:      'Ringkasan Game',
    PLAY_CONTINUE:          'Lanjut Main',
    PLAY_END_SESSION:       'End Session',
    PLAY_END_GAME:          'End Game',
    PLAY_QUEUE_TITLE:       'Antrian Pemain',
    PLAY_QUEUE:             'Antrian',
    PLAY_QUEUE_EMPTY:       'Belum ada pemain dalam antrian.',
    PLAY_DONE:              'Selesai',
    PLAY_BRACKET_TITLE:     'Bracket Turnamen',
    PLAY_BRACKET:           'Bracket',
    PLAY_CLOSE:             'Tutup',
    PLAY_CONFIRM_END_GAME:  'Akhiri game ini?',
    PLAY_CONFIRM_BACK:      'Kembali ke pilih mode? Sesi game ini akan dibatalkan.',
    PLAY_SINGAPORE_HINT:    'Ketuk "Input Ranking" setelah ronde selesai untuk mencatat hasil.',
    PLAY_TEAM_WIN:          'Tim',
    PLAY_CONFIRM_WIN_TITLE: 'Konfirmasi Pemenang',
    PLAY_SUMMARY_MODE:      'Mode',
    PLAY_SUMMARY_TOTAL:     'Total Match',
    PLAY_SUMMARY_TOP:       'Pemenang Terbanyak',
    PLAY_SUMMARY_STREAK:    'Streak Terpanjang',
    PLAY_RETRY:             'Coba Lagi'
  },

  en: {
    // Auth
    AUTH_LOGIN:           'Sign In',
    AUTH_REGISTER:        'Register',
    AUTH_EMAIL:           'Email',
    AUTH_PASSWORD:        'Password',
    AUTH_DISPLAY_NAME:    'Display Name',
    AUTH_TIMEZONE:        'Timezone',
    AUTH_LANGUAGE:        'Language',
    AUTH_PENDING_TITLE:   'Account under review',
    AUTH_PENDING_MSG:     'Your account is being verified by the admin. Please try again after confirmation.',

    // Error codes
    INVALID_CREDENTIALS:  'Incorrect email or password.',
    USER_INACTIVE:        'Account is inactive. Contact admin.',
    ACCOUNT_PENDING:      'Your account has not been activated yet. Wait for admin verification.',
    CORRUPT_PASSWORD:     'Account data issue. Contact admin.',
    CONFIG_NOT_FOUND:     'Account configuration not found. Contact admin.',
    EMAIL_ALREADY_EXISTS: 'Email is already registered.',
    INVALID_EMAIL:        'Invalid email format.',
    PASSWORD_MIN_6:       'Password must be at least 6 characters.',
    MISSING_FIELD:        'Please fill in all required fields.',
    INTERNAL_ERROR:       'Server error. Please try again.',
    LOCK_TIMEOUT:         'Server is busy, please try again shortly.',
    NETWORK_ERROR:        'Unable to connect to server. Check your internet connection.',

    // Nav
    NAV_HOME:             'Home',
    NAV_SESSION:          'Session',
    NAV_PLAYERS:          'Players',
    NAV_HISTORY:          'History',

    // Dashboard
    DASH_WELCOME:         'Welcome,',
    DASH_TOTAL_SESSION:   'Total sessions',
    DASH_WIN_RATE:        'Win rate',
    DASH_TOTAL_MATCH:     'Total matches',
    DASH_STREAK:          'Longest streak',
    DASH_LAST_SESSION:    'Last session',
    DASH_NO_SESSION:      'No sessions yet. Start playing!',
    BTN_START_PLAY:       'Start playing',

    // Session
    SESSION_ACTIVE:       'Active session',
    SESSION_NO_ACTIVE:    'No active session',
    SESSION_SCHEDULED:    'Scheduled',
    SESSION_ONGOING:      'Ongoing',
    SESSION_FINISHED:     'Finished',
    SESSION_CANCELLED:    'Cancelled',

    // Player
    PLAYER_SEARCH:        'Search player name...',
    PLAYER_SELECTED:      'players selected',
    PLAYER_ALL:           'All players',
    PLAYER_NEW:           'New player',
    PLAYER_NAME:          'Player name',
    PLAYER_NICKNAME:      'Nickname',
    PLAYER_PHONE:         'Phone number',
    PLAYER_NOTES:         'Notes',
    PLAYER_SAVE:          'Save',
    PLAYER_READY:         'players ready',
    PLAYER_STATS_SESSION: 'sessions',
    PLAYER_STATS_SINCE:   'since',
    BTN_NEXT:             'Next',
    PLAYER_NOT_FOUND:     'Player not found.',
    PLAYER_IN_USE:        'Player has match history and cannot be deleted.',
    PLAYER_NAME_EXISTS:   'Player name already exists.',

    // Game Mode
    MODE_SELECT:          'Game mode',
    MODE_DUEL_DESC:       '1 vs 1, head to head',
    MODE_KING_DESC:       'Queue system, winner stays on table',
    MODE_TEAM_DESC:       'Team vs team with auto rotation',
    MODE_SG_DESC:         'Multi-player, final ranking',
    MODE_TOURN_DESC:      'Elimination bracket',
    MODE_RR_DESC:         'Everyone vs everyone',
    MODE_CUSTOM_DESC:     'Set your own game format',
    BTN_START:            'Start',

    // Match / Play
    MATCH_NO:             'Match',
    ROUND:                'Round',
    QUEUE:                'Queue',
    BTN_END_GAME:         'End game',
    BTN_BACK:             'Back',
    WINS:                 'wins',

    // Statistik ringkas
    STATS_SUMMARY:        'Game summary',
    STATS_MODE:           'Mode',
    STATS_TOTAL_MATCH:    'Total matches',
    STATS_DURATION:       'Duration',
    STATS_KING:           'King',
    STATS_STREAK:         'Longest streak',
    STATS_CHAMPION:       'Champion',
    STATS_MVP:            'MVP',
    BTN_CLOSE:            'Close',
    BTN_END_SESSION:      'End session',

    // History
    HISTORY_BY_SESSION:   'By session',
    HISTORY_BY_GAME:      'By game',
    HISTORY_NO_DATA:      'No history yet.',

    // Settings
    SETTINGS_TITLE:       'Settings',
    SETTINGS_LANGUAGE:    'Language',
    SETTINGS_THEME:       'Theme color',
    SETTINGS_LOGOUT:      'Sign out',
    THEME_BLUE:           'Blue',
    THEME_GREEN:          'Green',
    THEME_PURPLE:         'Purple',
    THEME_GOLD:           'Gold',
    LANG_ID:              'Indonesia',
    LANG_EN:              'English',

    // Confirm & feedback
    CONFIRM_LOGOUT:       'Are you sure you want to sign out?',
    CONFIRM_END_SESSION:  'End session?',
    CONFIRM_DELETE:       'Are you sure you want to delete?',
    YES:                  'Yes',
    NO:                   'No',
    CANCEL:               'Cancel',
    CONFIRM:              'Confirm',
    SUCCESS:              'Success',
    ERROR:                'Error',
    SAVED:                'Data saved successfully.',
    DELETED:              'Data deleted successfully.',

    // Validasi
    FIELD_REQUIRED:       'This field is required.',
    MIN_PLAYERS:          'Select at least 2 players.',
    INSUFFICIENT_PLAYERS: 'Not enough players for this mode.',

    PLAY_PICK_WINNER:       'Pick Winner',
    PLAY_WIN_LABEL:         'wins',
    PLAY_INPUT_RANKING:     'Input Ranking',
    PLAY_RANKING_HINT:      'Arrange players from rank 1 (best) downward using the arrow buttons.',
    PLAY_CONFIRM_RESULT:    'Confirm Result',
    PLAY_GAME_SUMMARY:      'Game Summary',
    PLAY_CONTINUE:          'Continue Playing',
    PLAY_END_SESSION:       'End Session',
    PLAY_END_GAME:          'End Game',
    PLAY_QUEUE_TITLE:       'Player Queue',
    PLAY_QUEUE:             'Queue',
    PLAY_QUEUE_EMPTY:       'No players in queue yet.',
    PLAY_DONE:              'Done',
    PLAY_BRACKET_TITLE:     'Tournament Bracket',
    PLAY_BRACKET:           'Bracket',
    PLAY_CLOSE:             'Close',
    PLAY_CONFIRM_END_GAME:  'End this game?',
    PLAY_CONFIRM_BACK:      'Go back to mode selection? This game session will be cancelled.',
    PLAY_SINGAPORE_HINT:    'Tap "Input Ranking" after the round ends to record results.',
    PLAY_TEAM_WIN:          'Team',
    PLAY_CONFIRM_WIN_TITLE: 'Confirm Winner',
    PLAY_SUMMARY_MODE:      'Mode',
    PLAY_SUMMARY_TOTAL:     'Total Matches',
    PLAY_SUMMARY_TOP:       'Top Winner',
    PLAY_SUMMARY_STREAK:    'Longest Streak',
    PLAY_RETRY:             'Try Again'
  }
};

function getLang(key) {
  var lang = localStorage.getItem('ch_lang') || 'id';
  var dict = STRINGS[lang] || STRINGS['id'];
  return dict[key] || STRINGS['id'][key] || key;
}

function applyLang() {
  document.querySelectorAll('[data-lang]').forEach(function (el) {
    el.textContent = getLang(el.getAttribute('data-lang'));
  });
  document.querySelectorAll('[data-lang-placeholder]').forEach(function (el) {
    el.placeholder = getLang(el.getAttribute('data-lang-placeholder'));
  });
}