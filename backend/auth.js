var AuthService = {

  register: function (payload) {
    requireFields(payload, ['email', 'password', 'display_name']);

    var userSheet   = getSheet('core', SHEET_USERS);
    var configSheet = getSheet('core', SHEET_CONFIG);

    // cek email duplikat
    var existing = findRowByField(userSheet, 'email', payload.email);
    if (existing) throw new ApiError('EMAIL_ALREADY_EXISTS');

    var now    = nowISOString();
    var userId = generateUUID();

    var newUser = {
      user_id:       userId,
      email:         payload.email,
      password_hash: buildPasswordField(payload.password),
      display_name:  payload.display_name,
      status:        USER_STATUS.ACTIVE,
      last_login:    '',
      created_at:    now
    };

    var newConfig = {
      user_id:          userId,
      database_id:      '', // dikosongkan, developer isi manual setelah verifikasi
      timezone:         payload.timezone        || 'Asia/Jakarta',
      default_language: payload.default_language || 'id'
    };

    withLock(function () {
      Logger.log("APPEND USERS");
      appendRowObject(userSheet, newUser);
      Logger.log("APPEND CONFIG");
      appendRowObject(configSheet, newConfig);
      Logger.log("APPEND SELESAI");
    });

    logAction(userId, 'REGISTER');

    return {
      user_id:      userId,
      email:        newUser.email,
      display_name: newUser.display_name,
      status:       USER_STATUS.ACTIVE
    };
  },

  login: function (payload) {
    requireFields(payload, ['email', 'password']);

    var userSheet = getSheet('core', SHEET_USERS);
    var user      = findRowByField(userSheet, 'email', payload.email);

    if (!user) throw new ApiError('INVALID_CREDENTIALS');
    if (user.status !== USER_STATUS.ACTIVE) throw new ApiError('USER_INACTIVE');

    var parts = String(user.password_hash).split('$');
    if (parts.length !== 2) throw new ApiError('CORRUPT_PASSWORD');

    var inputHash = hashPassword(payload.password, parts[0]);
    if (inputHash !== parts[1]) throw new ApiError('INVALID_CREDENTIALS');

    // cek database_id sudah diisi developer belum
    var configSheet = getSheet('core', SHEET_CONFIG);
    var config      = findRowByField(configSheet, 'user_id', user.user_id);

    if (!config) throw new ApiError('CONFIG_NOT_FOUND');
    if (!config.database_id || config.database_id === '') {
      throw new ApiError('ACCOUNT_PENDING');
    }

    withLock(function () {
      updateRowObject(userSheet, user._rowIndex, { last_login: nowISOString() });
    });

    logAction(user.user_id, 'LOGIN');

    return {
      user_id:          user.user_id,
      email:            user.email,
      display_name:     user.display_name,
      database_id:      config.database_id,
      timezone:         config.timezone,
      default_language: config.default_language
    };
  }

};

// ---- Logger (dipanggil dari semua modul) ----
function logAction(userId, action, description) {
  try {
    var sheet = getSheet('core', SHEET_LOGS);
    appendRowObject(sheet, {
      log_id:      generateUUID(),
      date_time:   nowISOString(),
      user_id:     userId      || '',
      action:      action      || '',
      description: description || '',
      ip:          '',
      device:      ''
    });
  } catch (err) {
    console.error('[CUEHUB LOG ERROR] ' + err.code);
  }
}