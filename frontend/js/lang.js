var STRINGS = {
    // Auth
    AUTH_LOGIN: {
		id: 'Masuk',
		en: 'Sign In' },
    AUTH_REGISTER: {
		id: 'Daftar',
		en: 'Register' },
    AUTH_EMAIL: {
		id: 'Email',
		en: 'Email' },
    AUTH_PASSWORD: {
		id: 'Password',
		en: 'Password' },
    AUTH_DISPLAY_NAME: {
		id: 'Nama User',
		en: 'Display Name' },
    AUTH_TIMEZONE: {
		id: 'Zona waktu',
		en: 'Timezone' },
    AUTH_LANGUAGE: {
		id: 'Bahasa',
		en: 'Language' },
    AUTH_PENDING_TITLE: {
		id: 'Akun dalam verifikasi', 
		en: 'Account under review' },
    AUTH_PENDING_MSG: {
		id: 'Akun kamu sedang di verifikasi oleh Admin. Coba lagi setelah dapat konfirmasi.',
		en: 'Your account is being verified by the admin. Please try again after confirmation.' },

    // Error codes dari backend
    INVALID_CREDENTIALS: {
		id: 'Email atau password salah.',
		en: 'Incorrect email or password.' },
    USER_INACTIVE: {
		id: 'Akun tidak aktif. Hubungi admin.',
		en: 'Account is inactive. Contact admin.' },
    ACCOUNT_PENDING: {
		id: 'Akun kamu belum diaktifkan. Tunggu verifikasi dari admin.',
		en: 'Your account has not been activated yet. Wait for admin verification.' },
    CORRUPT_PASSWORD: {
		id: 'Data akun bermasalah. Hubungi admin.',
		en: 'Account data issue. Contact admin.' },
    CONFIG_NOT_FOUND: {
		id: 'Konfigurasi akun tidak ditemukan. Hubungi admin.',
		en: 'Account configuration not found. Contact admin.' },
    EMAIL_ALREADY_EXISTS: {
		id: 'Email sudah terdaftar',
		en: 'Email is already registered.' },
    INVALID_EMAIL: {
		id: 'Format email tidak valid.',
		en: 'Invalid email format.' },
    PASSWORD_MIN_6: {
		id: 'Password minimal 6 karakter.',
		en: 'Password must be at least 6 characters.' },
    MISSING_FIELD: {
		id: 'Harap lengkapi semua field yang wajib diisi.',
		en: 'Please fill in all required fields.' },
    INTERNAL_ERROR: {
		id: 'Terjadi kesalahan pada server. Coba lagi.',
		en: 'Server error. Please try again.' },
    LOCK_TIMEOUT: {
		id: 'Server sedang sibuk, coba lagi sebentar.',
		en: 'Server is busy, please try again shortly.' },
    NETWORK_ERROR: {
		id: 'Tidak dapat terhubung ke server. Periksa koneksi internet.',
		en: 'Unable to connect to server. Check your internet connection.' },

    // Nav
    NAV_HOME: {
		id: 'Home',
		en: 'Home' },
    NAV_SESSION: {
		id: 'Sesi',
		en: 'Session' },
    NAV_PLAYERS: {
		id: 'Pemain',
		en: 'Players' },
    NAV_HISTORY: {
		id: 'Riwayat',
		en: 'History' },

    // Dashboard
    DASH_WELCOME: {
		id: 'Selamat datang,',
		en: 'Welcome' },
	DASH_BADGE_SUCCESS: {
        id: 'Selesai',
        en: 'Finished' },
    DASH_TOTAL_SESSION: {
		id: 'Total sesi',
		en: 'Total sessions' },
    DASH_WIN_RATE: {
		id: 'Win rate',
		en: 'Win rate' },
    DASH_TOTAL_MATCH: {
		id: 'Total match',
		en: 'Total matches' },
    DASH_STREAK: {
		id: 'Streak terpanjang',
		en: 'Longest streak' },
    DASH_LAST_SESSION: {
		id: 'Sesi terakhir',
		en: 'Last session' },
    DASH_NO_SESSION: {
		id: 'Belum ada sesi. Yuk mulai main!',
		en: 'No sessions yet. Start playing!' },
    BTN_START_PLAY: {
		id: 'Mulai main',
		en: 'Start playing' },

    // Session
    SESSION_ACTIVE: {
		id: 'Sesi aktif',
		en: 'Active session' },
    SESSION_NO_ACTIVE: {
		id: 'Tidak ada sesi aktif',
		en: 'No active session' },
    SESSION_SCHEDULED: {
		id: 'Terjadwal',
		en: 'Scheduled' },
    SESSION_ONGOING: {
		id: 'Berlangsung',
		en: 'Ongoing' },
    SESSION_FINISHED: {
		id: 'Selesai',
		en: 'Finished' },
    SESSION_CANCELLED: {
		id: 'Dibatalkan',
		en: 'Cancelled' },

    // Player
    PLAYER_SEARCH: {
		id: 'Cari nama pemain...',
		en: 'Search player name...' },
    PLAYER_SELECTED: {
		id: 'pemain dipilih',
		en: 'players selected' },
    PLAYER_ALL: {
		id: 'Semua pemain',
		en: 'All players' },
    PLAYER_NEW: {
		id: 'Pemain baru',
		en: 'New player' },
    PLAYER_NAME: {
		id: 'Nama pemain',
		en: 'Player name' },
    PLAYER_NICKNAME: {
		id: 'Nama panggilan',
		en: 'Nickname' },
    PLAYER_PHONE: {
		id: 'Nomor telepon',
		en: 'Phone number' },
    PLAYER_NOTES: {
		id: 'Catatan',
		en: 'Notes' },
    PLAYER_SAVE: {
		id: 'Simpan',
		en: 'Save' },
    PLAYER_READY: {
		id: 'pemain siap',
		en: 'players ready' },
    PLAYER_STATS_SESSION: {
		id: 'sesi',
		en: 'sessions' },
    PLAYER_STATS_SINCE: {
		id: 'sejak',
		en: 'since' },
    BTN_NEXT: {
		id: 'Lanjut',
		en: 'Next' },
    PLAYER_NOT_FOUND: {
		id: 'Pemain tidak ditemukan.',
		en: 'Player not found.' },
    PLAYER_IN_USE: {
		id: 'Pemain sudah memiliki riwayat, tidak bisa dihapus.',
		en: 'Player has match history and cannot be deleted.' },
    PLAYER_NAME_EXISTS: {
		id: 'Nama pemain sudah ada.',
		en: 'Player name already exists.' },

    // Game Mode
	MODE_DUEL: {
        id: 'Duel',
        en: 'Duel' },
    MODE_KING_OF_TABLE: {
        id: 'Raja Meja ♛',
        en: 'King of Table ♛' },
    MODE_TEAM_BATTLE: {
        id: 'Team Battle',
        en: 'Team Battle' },
    MODE_SINGAPORE: {
        id: 'Singapore',
        en: 'Singapore' },
    MODE_CUSTOM: {
        id: 'Kustom',
        en: 'Custom' },
    MODE_SELECT: {
		id: 'Mode permainan',
		en: 'Game mode' },
    MODE_DUEL_DESC: {
		id: '1 vs 1, head to head',
		en: '1 vs 1, head to head' },
    MODE_KING_DESC: {
		id: 'Sistem antrian, pemenang tetap di meja',
		en: 'Queue system, winner stays at table' }, 
    MODE_SG_DESC: {
		id: 'Multi-pemain, hasil berupa ranking',
		en: 'Multi-player, ranked results' },
    MODE_TEAM_DESC: {
		id: 'Tim vs tim dengan rotasi otomatis',
		en: 'Team vs team with automatic rotation' },
	MODE_TOURN_DESC: {
		id: 'Bracket eliminasi',
		en: 'Elimination bracket' },
    MODE_RR_DESC: {
		id: 'Semua lawan semua',
		en: 'Everyone vs everyone' },
    MODE_CUSTOM_DESC: {
		id: 'Atur sendiri format permainan',
		en: 'Set your own game format' },
    BTN_START: {
		id: 'Mulai',
		en: 'Start' },

    TAB_CASUAL: {
		id: 'Kasual',
		en: 'Casual' },
    TAB_TOURNAMENT: {
		id: 'Turnamen',
		en: 'Tournament' },
    COMING_SOON: {
		id: 'Segera Hadir',
		en: 'Coming Soon' },
    COMING_SOON_DESC: {
		id: 'Sedang dalam pengembangan',
		en: 'Currently under development' },
    TEAM_CONFIG_TITLE: {
		id: 'Team Battle — Konfigurasi',
		en: 'Team Battle — Configuration' },
    ROTATION_MODE_LABEL: {
		id: 'Mode Rotasi',
		en: 'Rotation Mode' },
    ROTATION_FAIR: {
		id: 'Fair Rotation',
		en: 'Fair Rotation' },
    ROTATION_FAIR_DESC: {
		id: 'Semua kombinasi partner merata',
		en: 'All partner combinations distributed evenly' },
    ROTATION_RANDOM: {
		id: 'Acak',
		en: 'Random' },
    ROTATION_RANDOM_DESC: {
		id: 'Rotasi acak setiap match',
		en: 'Random rotation each match' },
    ROTATION_MANUAL: {
		id: 'Manual',
		en: 'Manual' },
    ROTATION_MANUAL_DESC: {
		id: 'Atur sendiri tiap match',
		en: 'Set teams manually each match' },

    // Match / Play
    MATCH_NO: {
		id: 'Match',
		en: 'Match' },
    ROUND: {
		id: 'Ronde',
		en: 'Round' },
    QUEUE: {
		id: 'Antrian',
		en: 'Queue' },
    BTN_END_GAME: {
		id: 'Akhiri game', 
		en: 'End game' },
    BTN_BACK: {
		id: 'Kembali',
		en: 'Back' },
    WINS: { id: 'menang', en: 'wins' },

    // Statistik ringkas
    STATS_SUMMARY: {
		id: 'Ringkasan game',
		en: 'Game summary' },
    STATS_MODE: {
		id: 'Mode',
		en: 'Mode' },
    STATS_TOTAL_MATCH: {
		id: 'Total match',
		en: 'Total matches' },
    STATS_DURATION: {
		id: 'Durasi',
		en: 'Duration' },
    STATS_KING: {
		id: 'Raja',
		en: 'King' },
    STATS_STREAK: {
		id: 'Streak terpanjang',
		en: 'Longest streak' },
    STATS_CHAMPION: {
		id: 'Champion',
		en: 'Champion' },
    STATS_MVP: {
		id: 'MVP',
		en: 'MVP' },
    BTN_CLOSE: {
		id: 'Tutup',
		en: 'Close' },
    BTN_END_SESSION: {
		id: 'Akhiri sesi',
		en: 'End session' },

    // History
    HISTORY_BY_SESSION: {
		id: 'Per sesi',
		en: 'By session' },
    HISTORY_BY_GAME: {
		id: 'Per game',
		en: 'By game' },
    HISTORY_NO_DATA: {
		id: 'Belum ada riwayat.',
		en: 'No history yet.' },

    // Settings
    SETTINGS_TITLE: {
		id: 'Pengaturan',
		en: 'Settings' },
    SETTINGS_LANGUAGE: {
		id: 'Bahasa',
		en: 'Language' },
    SETTINGS_THEME: {
		id: 'Warna tema',
		en: 'Theme color' },
    SETTINGS_LOGOUT: {
		id: 'Keluar',
		en: 'Sign out' },
    THEME_BLUE: {
		id: 'Biru',
		en: 'Blue' },
    THEME_GREEN: {
		id: 'Hijau',
		en: 'Green' },
    THEME_PURPLE: {
		id: 'Ungu',
		en: 'Purple' },
    THEME_GOLD: {
		id: 'Emas',
		en: 'Gold' },
    LANG_ID: {
		id: 'Indonesia',
		en: 'Indonesia' },
    LANG_EN: {
		id: 'English',
		en: 'English' },

    // Confirm & feedback
    CONFIRM_LOGOUT: {
		id: 'Yakin ingin keluar?',
		en: 'Are you sure you want to sign out?' },
    CONFIRM_END_SESSION: {
		id: 'Yakin akhiri sesi?',
		en: 'End session?' },
    CONFIRM_DELETE: {
		id: 'Yakin ingin menghapus?',
		en: 'Are you sure you want to delete?' },
    YES: {
		id: 'Ya',
		en: 'Yes' },
    NO: {
		id: 'Tidak',
		en: 'No' },
    CANCEL: {
		id: 'Batal',
		en: 'Cancel' },
    CONFIRM: {
		id: 'Konfirmasi',
		en: 'Confirm' },
    SUCCESS: {
		id: 'Berhasil',
		en: 'Success' },
    ERROR: {
		id: 'Gagal',
		en: 'Error' },
    SAVED: {
		id: 'Data berhasil disimpan.',
		en: 'Data saved successfully.' },
    DELETED: {
		id: 'Data berhasil dihapus.',
		en: 'Data deleted successfully.' },

    // Validasi
    FIELD_REQUIRED: {
		id: 'Field ini wajib diisi.',
		en: 'This field is required.' },
    MIN_PLAYERS: {
		id: 'Pilih minimal 2 pemain.',
		en: 'Select at least 2 players.' },
    INSUFFICIENT_PLAYERS: {
		id: 'Pemain tidak cukup untuk mode ini.',
		en: 'Not enough players for this mode.' },

    PLAY_MATCH_LABEL: {
        id: 'Match',
        en: 'Match' },
    PLAY_ROUND_LABEL: {
        id: 'Ronde',
        en: 'Round' },
    PLAY_KING_BADGE: {
        id: 'KING',
        en: 'KING' },
    PLAY_CHALLENGER_BADGE: {
        id: 'PENANTANG',
        en: 'CHALLENGER' },
    PLAY_WIN_STREAK_LABEL: {
        id: 'MENANG BERUNTUN',
        en: 'WIN STREAK' },
	PLAY_PICK_WINNER: {
		id: 'Pilih Pemenang',
		en: 'Pick Winner' },
    PLAY_WIN_LABEL: {
		id: 'menang',
		en: 'wins' },
    PLAY_NOW_PLAYING: {
		id: 'Sedang Berlangsung',
		en: 'Now Playing' },
    PLAY_NEXT_MATCH: {
		id: 'Match Berikutnya',
		en: 'Next Match' },
    PLAY_QUEUE_LABEL: {
		id: 'Antrian',
		en: 'Queue' },
    PLAY_WAITING: {
		id: 'Menunggu',
		en: 'Waiting' },
    PLAY_VS: {
		id: 'VS',
		en: 'VS' },
    PLAY_WIN_TAP_HINT: {
		id: 'Ketuk nama pemenang',
		en: 'Tap winner name' },
	PLAY_WINNER: {
		id: 'PEMENANG',
		en: 'WINNER' },
    PLAY_HISTORY: {
		id: 'Riwayat',
		en: 'History' },
    PLAY_INPUT_RANKING: {
		id: 'Input Ranking',
		en: 'Input Ranking' },
    PLAY_RANKING_HINT: {
		id: 'Atur urutan dari peringkat 1 (terbaik) ke bawah menggunakan tombol panah.',
		en: 'Arrange players from rank 1 (best) downward using the arrow buttons.' },
    PLAY_CONFIRM_RESULT: {
		id: 'Konfirmasi Hasil',
		en: 'Confirm Result' },
    PLAY_GAME_SUMMARY: {
		id: 'Ringkasan Game',
		en: 'Game Summary' },
    PLAY_CONTINUE: {
		id: 'Lanjut Main',
		en: 'Continue Playing' },
    PLAY_END_SESSION: {
		id: 'Akhiri Sesi',
		en: 'End Session' },
    PLAY_END_GAME: {
		id: 'Akhiri Game',
		en: 'End Game' },
    PLAY_QUEUE_TITLE: {
		id: 'Antrian Pemain',
		en: 'Player Queue' },
    PLAY_QUEUE: {
		id: 'Antrian',
		en: 'Queue' },
    PLAY_QUEUE_EMPTY: {
		id: 'Belum ada pemain dalam antrian.',
		en: 'No players in queue yet.' },
    PLAY_DONE: {
		id: 'Selesai',
		en: 'Done' },
    PLAY_BRACKET_TITLE: {
		id: 'Bagan Turnamen',
		en: 'Tournament Bracket' },
    PLAY_BRACKET: {
		id: 'Bagan',
		en: 'Bracket' },
    PLAY_CLOSE: {
		id: 'Tutup',
		en: 'Close' },
    PLAY_CONFIRM_END_GAME: {
		id: 'Akhiri game ini?',
		en: 'End this game?' },
    PLAY_CONFIRM_BACK: {
		id: 'Kembali ke pilih mode? Sesi game ini akan dibatalkan.',
		en: 'Go back to mode selection? This game session will be cancelled.' },
    PLAY_SINGAPORE_HINT: {
		id: 'Ketuk "Input Ranking" setelah ronde selesai untuk mencatat hasil.',
		en: 'Tap "Input Ranking" after the round ends to record results.' },
	PLAY_TB_TAP_HINT: {
    	id: 'Ketuk tim pemenang',
    	en: 'Tap winning team' },
	PLAY_TB_REST: {
    	id: 'Istirahat',
    	en: 'Resting' },
    PLAY_TEAM_WIN: {
		id: 'Tim',
		en: 'Team' },
	PLAY_TEAM_A: {
        id: 'TIM A',
        en: 'TEAM A' },
    PLAY_TEAM_B: {
        id: 'TIM B',
        en: 'TEAM B' },
    PLAY_TEAM_A_SHORT: {
        id: 'A',
        en: 'A' },
    PLAY_TEAM_B_SHORT: {
        id: 'B',
        en: 'B' },
    PLAY_NO_PLAYERS_IN_TEAM: {
        id: 'Tidak ada pemain di tim ini',
        en: 'No players in this team' },
    PLAY_CONFIRM_WIN_TITLE: {
		id: 'Konfirmasi Pemenang',
		en: 'Confirm Winner' },
	PLAY_STANDINGS: {
        id: 'KLASEMEN',
        en: 'STANDINGS' },
    PLAY_WIN_COUNT_SUFFIX: {
        id: 'W',
        en: 'W' },
    PLAY_TOURNAMENT_PROGRESS: {
        id: 'PROGRESS TURNAMEN',
        en: 'TOURNAMENT PROGRESS' },
    PLAY_ADD_TO_QUEUE: {
        id: 'TAMBAH KE ANTRIAN',
        en: 'ADD TO QUEUE' },
    PLAY_NO_BRACKET_DATA: {
        id: 'Belum ada data bracket.',
        en: 'No bracket data yet.' },
    PLAY_NO_PLAYER_DATA: {
        id: 'Data pemain tidak ditemukan. Kembali dan pilih pemain ulang.',
        en: 'Player data not found. Go back and select players again.' },
    PLAY_MATCH_FINISHED_SUFFIX: {
        id: 'selesai',
        en: 'finished' },
    PLAY_SUMMARY_MODE: {
		id: 'Mode',
		en: 'Mode' },
    PLAY_SUMMARY_TOTAL: {
		id: 'Total Match',
		en: 'Total Matches' },
    PLAY_SUMMARY_TOP: {
		id: 'Pemenang Terbanyak',
		en: 'Top Winner' },
    PLAY_SUMMARY_STREAK: {
		id: 'Streak Terpanjang',
		en: 'Longest Streak' },
    PLAY_RETRY: {
		id: 'Coba Lagi',
		en: 'Try Again' }
}

function getLang(key) {
	var lang = localStorage.getItem('ch_lang') || 'id';
	if (STRINGS[key]) {
		return STRINGS[key][lang] || STRINGS[key].id;
	}
	return key;
}

function applyLang() {
  document.querySelectorAll('[data-lang]').forEach(function (el) {
    el.textContent = getLang(el.getAttribute('data-lang'));
  });
  document.querySelectorAll('[data-lang-placeholder]').forEach(function (el) {
    el.placeholder = getLang(el.getAttribute('data-lang-placeholder'));
  });
}