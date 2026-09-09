// =============================================================
// CueHub v3 — auth.gs
// Login, logout, register, me
// =============================================================

// Register fasilitator baru
// params: { display_name, password }
function authRegister(params, user) {
  if (!requireFields(params, ['display_name', 'password'])) {
    return fail(ERR.MISSING_PARAMS);
  }

  return withLock(function() {
    var sheet = getCoreSheet(SHEET.USERS);
    var existing = sheetToObjects(sheet);

    // Cek nama duplikat
    var nameLower = params.display_name.trim().toLowerCase();
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].display_name.toLowerCase() === nameLower) {
        return fail(ERR.NAME_DUPLICATE);
      }
    }

    var userId = generateUUID();
    var passwordHash = hashPassword(params.password);
    var timestamp = now();

    appendRow(sheet, {
      user_id      : userId,
      display_name : params.display_name.trim(),
      password_hash: passwordHash,
      token        : '',
      status       : USER_STATUS.ACTIVE,
      last_login   : '',
      created_at   : timestamp
    });

    logAction(userId, 'auth.register', params.display_name);
    return ok({ message: 'register_ok' });
  });
}

// Login fasilitator
// params: { display_name, password }
function authLogin(params, user) {
  if (!requireFields(params, ['display_name', 'password'])) {
    return fail(ERR.MISSING_PARAMS);
  }

  return withLock(function() {
    var sheet = getCoreSheet(SHEET.USERS);
    var found = findRowByField(sheet, 'display_name', params.display_name.trim());

    if (!found) return fail(ERR.INVALID_CREDENTIALS);
    if (found.status !== USER_STATUS.ACTIVE) return fail(ERR.UNAUTHORIZED);
    if (!verifyPassword(params.password, found.password_hash)) {
      return fail(ERR.INVALID_CREDENTIALS);
    }

    var token = generateToken(found.user_id);
    updateRowById(sheet, 'user_id', found.user_id, {
      token     : token,
      last_login: now()
    });

    logAction(found.user_id, 'auth.login', '');

    return ok({
      token       : token,
      user_id     : found.user_id,
      display_name: found.display_name
    });
  });
}

// Logout — hapus token
function authLogout(params, user) {
  return withLock(function() {
    var sheet = getCoreSheet(SHEET.USERS);
    updateRowById(sheet, 'user_id', user.user_id, { token: '' });
    logAction(user.user_id, 'auth.logout', '');
    return ok({ message: 'logout_ok' });
  });
}

// Cek token masih valid + ambil data user
function authMe(params, user) {
  return ok({
    user_id     : user.user_id,
    display_name: user.display_name
  });
}
