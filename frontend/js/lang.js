// =============================================================
// CueHub v3 — lang.js
// Semua string UI dalam dua bahasa: ID (Indonesian) dan EN (English)
// Tidak ada teks hardcode di file JS/HTML lain
// =============================================================

var LANG = {
  id: {
    // --- App ---
    app_name          : 'CueHub',
    app_tagline       : 'Manajer Sesi Biliar',

    // --- Auth ---
    login             : 'Masuk',
    logout            : 'Keluar',
    register          : 'Daftar',
    display_name      : 'Nama Tampilan',
    password          : 'Kata Sandi',
    login_welcome     : 'Selamat datang kembali',
    login_subtitle    : 'Masuk sebagai fasilitator untuk memulai sesi',
    register_title    : 'Buat Akun',
    register_subtitle : 'Daftarkan akun fasilitator baru',
    no_account        : 'Belum punya akun?',
    have_account      : 'Sudah punya akun?',

    // --- Dashboard ---
    dashboard         : 'Dashboard',
    start_session     : 'Mulai Sesi',
    active_session    : 'Sesi Aktif',
    resume_session    : 'Lanjutkan Sesi',
    end_session       : 'Akhiri Sesi',
    no_active_session : 'Tidak ada sesi aktif',
    start_new         : 'Mulai sesi baru untuk bermain',

    // --- Navigation ---
    nav_home          : 'Beranda',
    nav_players       : 'Pemain',
    nav_history       : 'Riwayat',
    nav_settings      : 'Pengaturan',

    // --- Players ---
    players           : 'Pemain',
    add_player        : 'Tambah Pemain',
    player_name       : 'Nama Pemain',
    nickname          : 'Panggilan',
    nickname_optional : 'Panggilan (opsional)',
    no_players        : 'Belum ada pemain terdaftar',
    add_first_player  : 'Tambah pemain pertama untuk mulai bermain',
    edit_player       : 'Edit Pemain',
    delete_player     : 'Hapus Pemain',
    delete_confirm    : 'Yakin hapus pemain ini? Data match tetap tersimpan.',
    search_player     : 'Cari pemain...',

    // --- Setup Game ---
    setup_game        : 'Atur Permainan',
    select_players    : 'Pilih Pemain',
    select_mode       : 'Pilih Mode',
    selected_players  : 'Pemain Dipilih',
    selected_label    : 'dipilih',
    min_players_note  : 'min. {n} pemain',
    step_1_of_2       : 'Langkah 1 dari 2',
    step_2_of_2       : 'Langkah 2 dari 2',
    no_active_game    : 'Belum ada game aktif',
    confirm_end_session: 'Akhiri sesi malam ini?',
    start_game        : 'Mulai',
    back              : 'Kembali',

    // --- Game Modes ---
    mode_duel         : 'Duel',
    mode_duel_desc    : '1 vs 1 — Bertanding satu lawan satu, siklus otomatis',
    mode_king         : 'King of Table',
    mode_king_desc    : 'Pemenang tetap di meja, yang kalah kembali ke antrean',
    mode_team         : 'Team Battle',
    mode_team_desc    : '2 vs 2 — Tim berganti setiap ronde secara otomatis',
    mode_singapore    : 'Singapore',
    mode_singapore_desc: '3 pemain sekaligus, pemenang mendapat poin',

    // --- Play Screen ---
    now_playing       : 'Sedang Main',
    next_match        : 'Match Berikutnya',
    queue             : 'Antrean',
    resting           : 'Istirahat',
    vs                : 'VS',
    pick_winner       : 'Pilih Pemenang',
    winner            : 'Pemenang',
    end_game          : 'Akhiri Game',
    shuffle_cycle     : 'Acak Ulang Siklus',
    confirm_end_game  : 'Akhiri game saat ini? Kamu bisa mulai mode atau pemain baru setelahnya.',
    confirm_shuffle   : 'Acak ulang urutan pertandingan? Mode dan pemain tetap sama, history match tetap tersimpan.',
    match_count       : '{n} Match Dimainkan',
    team_a            : 'Tim A',
    team_b            : 'Tim B',
    king_king         : '👑 King',
    king_challenger   : 'Challenger',
    king_queue        : 'Antrean',

    // --- ELO ---
    elo_change        : 'Perubahan ELO',
    elo_rating        : 'Rating ELO',
    elo_label_1       : '🌱 Beginner',
    elo_label_2       : '🔰 Novice',
    elo_label_3       : '🥉 Intermediate',
    elo_label_4       : '🥈 Advanced',
    elo_label_5       : '🥇 Expert',
    elo_label_6       : '💎 Professional',
    elo_label_7       : '👑 World Class',

    // --- Play ---
    recent_matches    : 'History Game',
    winner_label      : 'menang!',

    // --- Stats & History ---
    statistics        : 'Statistik',
    history           : 'Riwayat',
    leaderboard       : 'Papan Peringkat',
    total_matches     : 'Total Match',
    total_wins        : 'Menang',
    total_losses      : 'Kalah',
    win_rate          : 'Win Rate',
    total_sessions    : 'Total Sesi',
    peak_elo          : 'ELO Terbaik',
    last_played       : 'Terakhir Main',
    session_detail    : 'Detail Sesi',
    session_number    : 'Sesi #{n}',
    champion          : 'Champion',
    no_history        : 'Belum ada riwayat sesi',

    // --- Settings ---
    settings          : 'Pengaturan',
    language          : 'Bahasa',
    theme             : 'Tema',
    theme_dark        : 'Gelap',
    theme_light       : 'Terang',
    theme_green       : 'Hijau',
    theme_purple      : 'Ungu',
    theme_gold        : 'Emas',
    save_settings     : 'Simpan',
    settings_saved    : 'Pengaturan disimpan',

    // --- Errors ---
    err_INVALID_ACTION     : 'Aksi tidak dikenali',
    err_MISSING_PARAMS     : 'Data tidak lengkap',
    err_UNAUTHORIZED       : 'Sesi berakhir, silakan login kembali',
    err_INVALID_CREDENTIALS: 'Nama atau kata sandi salah',
    err_USER_NOT_FOUND     : 'Pengguna tidak ditemukan',
    err_PLAYER_NOT_FOUND   : 'Pemain tidak ditemukan',
    err_SESSION_NOT_FOUND  : 'Sesi tidak ditemukan',
    err_SEGMENT_NOT_FOUND  : 'Game tidak ditemukan',
    err_MATCH_NOT_FOUND    : 'Match tidak ditemukan',
    err_NAME_REQUIRED      : 'Nama tidak boleh kosong',
    err_NAME_DUPLICATE     : 'Nama sudah digunakan',
    err_MIN_PLAYERS        : 'Jumlah pemain kurang dari minimum',
    err_INVALID_MODE       : 'Mode permainan tidak valid',
    err_INVALID_WINNER     : 'Pemenang tidak valid',
    err_SESSION_FINISHED   : 'Sesi sudah berakhir',
    err_SEGMENT_FINISHED   : 'Game sudah berakhir',
    err_SERVER_ERROR       : 'Terjadi kesalahan server',
    err_NETWORK            : 'Gagal terhubung ke server',

    // --- General ---
    save              : 'Simpan',
    cancel            : 'Batal',
    confirm           : 'Konfirmasi',
    delete            : 'Hapus',
    edit              : 'Edit',
    close             : 'Tutup',
    loading           : 'Memuat...',
    success           : 'Berhasil',
    error             : 'Gagal',
    yes               : 'Ya',
    no                : 'Tidak',
    search            : 'Cari',
    empty             : 'Kosong',
    optional          : 'opsional'
  },

  en: {
    // --- App ---
    app_name          : 'CueHub',
    app_tagline       : 'Billiard Session Manager',

    // --- Auth ---
    login             : 'Sign In',
    logout            : 'Sign Out',
    register          : 'Register',
    display_name      : 'Display Name',
    password          : 'Password',
    login_welcome     : 'Welcome back',
    login_subtitle    : 'Sign in as facilitator to start a session',
    register_title    : 'Create Account',
    register_subtitle : 'Register a new facilitator account',
    no_account        : "Don't have an account?",
    have_account      : 'Already have an account?',

    // --- Dashboard ---
    dashboard         : 'Dashboard',
    start_session     : 'Start Session',
    active_session    : 'Active Session',
    resume_session    : 'Resume Session',
    end_session       : 'End Session',
    no_active_session : 'No active session',
    start_new         : 'Start a new session to play',

    // --- Navigation ---
    nav_home          : 'Home',
    nav_players       : 'Players',
    nav_history       : 'History',
    nav_settings      : 'Settings',

    // --- Players ---
    players           : 'Players',
    add_player        : 'Add Player',
    player_name       : 'Player Name',
    nickname          : 'Nickname',
    nickname_optional : 'Nickname (optional)',
    no_players        : 'No players registered yet',
    add_first_player  : 'Add the first player to get started',
    edit_player       : 'Edit Player',
    delete_player     : 'Delete Player',
    delete_confirm    : 'Delete this player? Match history will be kept.',
    search_player     : 'Search players...',

    // --- Setup Game ---
    setup_game        : 'Game Setup',
    select_players    : 'Select Players',
    select_mode       : 'Select Mode',
    selected_players  : 'Selected Players',
    selected_label    : 'selected',
    min_players_note  : 'min. {n} players',
    step_1_of_2       : 'Step 1 of 2',
    step_2_of_2       : 'Step 2 of 2',
    no_active_game    : 'No active game',
    confirm_end_session: 'End tonight\'s session?',
    start_game        : 'Start',
    back              : 'Back',

    // --- Game Modes ---
    mode_duel         : 'Duel',
    mode_duel_desc    : '1v1 — Head to head matches with auto rotation',
    mode_king         : 'King of Table',
    mode_king_desc    : 'Winner stays, loser goes back to queue',
    mode_team         : 'Team Battle',
    mode_team_desc    : '2v2 — Teams rotate automatically every round',
    mode_singapore    : 'Singapore',
    mode_singapore_desc: '3 players at once, winner takes the point',

    // --- Play Screen ---
    now_playing       : 'Now Playing',
    next_match        : 'Next Match',
    queue             : 'Queue',
    resting           : 'Resting',
    vs                : 'VS',
    pick_winner       : 'Pick Winner',
    winner            : 'Winner',
    end_game          : 'End Game',
    shuffle_cycle     : 'Shuffle Cycle',
    confirm_end_game  : 'End current game? You can start a new mode or player set after.',
    confirm_shuffle   : 'Reshuffle the match order? Mode and players stay the same, match history is kept.',
    match_count       : '{n} Matches Played',
    team_a            : 'Team A',
    team_b            : 'Team B',
    king_king         : '👑 King',
    king_challenger   : 'Challenger',
    king_queue        : 'Queue',

    // --- ELO ---
    elo_change        : 'ELO Change',
    elo_rating        : 'ELO Rating',
    elo_label_1       : '🌱 Beginner',
    elo_label_2       : '🔰 Novice',
    elo_label_3       : '🥉 Intermediate',
    elo_label_4       : '🥈 Advanced',
    elo_label_5       : '🥇 Expert',
    elo_label_6       : '💎 Professional',
    elo_label_7       : '👑 World Class',
    
    // --- Play ---
    recent_matches    : 'Game History',
    winner_label      : 'wins!',

    // --- Stats & History ---
    statistics        : 'Statistics',
    history           : 'History',
    leaderboard       : 'Leaderboard',
    total_matches     : 'Total Matches',
    total_wins        : 'Wins',
    total_losses      : 'Losses',
    win_rate          : 'Win Rate',
    total_sessions    : 'Total Sessions',
    peak_elo          : 'Peak ELO',
    last_played       : 'Last Played',
    session_detail    : 'Session Detail',
    session_number    : 'Session #{n}',
    champion          : 'Champion',
    no_history        : 'No session history yet',

    // --- Settings ---
    settings          : 'Settings',
    language          : 'Language',
    theme             : 'Theme',
    theme_dark        : 'Dark',
    theme_light       : 'Light',
    theme_green       : 'Green',
    theme_purple      : 'Purple',
    theme_gold        : 'Gold',
    save_settings     : 'Save',
    settings_saved    : 'Settings saved',

    // --- Errors ---
    err_INVALID_ACTION     : 'Unknown action',
    err_MISSING_PARAMS     : 'Incomplete request data',
    err_UNAUTHORIZED       : 'Session expired, please sign in again',
    err_INVALID_CREDENTIALS: 'Incorrect name or password',
    err_USER_NOT_FOUND     : 'User not found',
    err_PLAYER_NOT_FOUND   : 'Player not found',
    err_SESSION_NOT_FOUND  : 'Session not found',
    err_SEGMENT_NOT_FOUND  : 'Game not found',
    err_MATCH_NOT_FOUND    : 'Match not found',
    err_NAME_REQUIRED      : 'Name is required',
    err_NAME_DUPLICATE     : 'Name already in use',
    err_MIN_PLAYERS        : 'Not enough players for this mode',
    err_INVALID_MODE       : 'Invalid game mode',
    err_INVALID_WINNER     : 'Invalid winner',
    err_SESSION_FINISHED   : 'Session already ended',
    err_SEGMENT_FINISHED   : 'Game already ended',
    err_SERVER_ERROR       : 'Server error occurred',
    err_NETWORK            : 'Failed to connect to server',

    // --- General ---
    save              : 'Save',
    cancel            : 'Cancel',
    confirm           : 'Confirm',
    delete            : 'Delete',
    edit              : 'Edit',
    close             : 'Close',
    loading           : 'Loading...',
    success           : 'Success',
    error             : 'Error',
    yes               : 'Yes',
    no                : 'No',
    search            : 'Search',
    empty             : 'Empty',
    optional          : 'optional'
  }
};

// --- Active language (default dari localStorage) ---
var _currentLang = localStorage.getItem('ch_lang') || 'id';

// Get string by key, dengan placeholder support: getLang('key', { n: 5 })
function getLang(key, vars) {
  var dict = LANG[_currentLang] || LANG['id'];
  var str = dict[key] || key;
  if (vars) {
    for (var k in vars) {
      str = str.replace('{' + k + '}', vars[k]);
    }
  }
  return str;
}

// Set bahasa aktif
function setLang(lang) {
  if (!LANG[lang]) return;
  _currentLang = lang;
  localStorage.setItem('ch_lang', lang);
  applyLang();
}

// Apply semua string ke DOM (elemen dengan data-lang attribute)
function applyLang() {
  var elements = document.querySelectorAll('[data-lang]');
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    var key = el.getAttribute('data-lang');
    el.textContent = getLang(key);
  }
  // Placeholder
  var placeholders = document.querySelectorAll('[data-lang-placeholder]');
  for (var i = 0; i < placeholders.length; i++) {
    var el = placeholders[i];
    el.placeholder = getLang(el.getAttribute('data-lang-placeholder'));
  }
}

// Ambil bahasa aktif
function getCurrentLang() {
  return _currentLang;
}