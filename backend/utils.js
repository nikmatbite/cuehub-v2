// =============================================================
// CueHub v3 — utils.gs
// Helper functions: response, sheet, UUID, hashing, lock, validasi
// =============================================================

// --- Response Builder ---

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function fail(code) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: { code: code } }))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Sheet Helpers ---

function getCoreSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getDbSpreadsheet() {
  if (!DB_SPREADSHEET_ID) throw new Error('DB_SPREADSHEET_ID belum diisi di constants.gs');
  return SpreadsheetApp.openById(DB_SPREADSHEET_ID);
}

function getCoreSheet(name) {
  var ss = getCoreSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet tidak ditemukan: ' + name);
  return sh;
}

function getDbSheet(name) {
  var ss = getDbSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet DB tidak ditemukan: ' + name);
  return sh;
}

// Ambil semua row sebagai array of objects (row pertama = header)
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var results = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Skip baris kosong
    if (!row[0]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    results.push(obj);
  }
  return results;
}

// Append satu row ke sheet berdasarkan urutan header
function appendRow(sheet, obj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(h) {
    var v = obj[h];
    return v !== undefined ? v : '';
  });
  sheet.appendRow(row);
}

// Update satu row berdasarkan match pada kolom idCol
function updateRowById(sheet, idCol, idValue, updates) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf(idCol);
  if (idIdx === -1) throw new Error('Kolom tidak ditemukan: ' + idCol);

  for (var i = 1; i < data.length; i++) {
    if (data[i][idIdx] === idValue) {
      for (var key in updates) {
        var colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          sheet.getRange(i + 1, colIdx + 1).setValue(updates[key]);
        }
      }
      return true;
    }
  }
  return false;
}

// Cari satu row berdasarkan nilai kolom
function findRowByField(sheet, field, value) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  var colIdx = headers.indexOf(field);
  if (colIdx === -1) return null;

  for (var i = 1; i < data.length; i++) {
    if (data[i][colIdx] === value) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = data[i][j];
      }
      return obj;
    }
  }
  return null;
}

// --- UUID Generator ---
function generateUUID() {
  return Utilities.getUuid();
}

// --- Timestamp ---
function now() {
  return new Date().toISOString();
}

// --- Password Hashing ---
// Format: salt$hash (SHA-256)
function hashPassword(plain) {
  var salt = generateUUID().replace(/-/g, '').substring(0, 16);
  var raw = salt + plain;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  var hash = bytes.map(function(b) {
    var h = (b & 0xff).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
  return salt + '$' + hash;
}

function verifyPassword(plain, stored) {
  var parts = stored.split('$');
  if (parts.length !== 2) return false;
  var salt = parts[0];
  var expectedHash = parts[1];
  var raw = salt + plain;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  var actualHash = bytes.map(function(b) {
    var h = (b & 0xff).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
  return actualHash === expectedHash;
}

// --- Lock Service ---
// Pakai untuk semua operasi tulis agar tidak race condition
function withLock(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var result = fn();
    return result;
  } catch(e) {
    throw e;
  } finally {
    lock.releaseLock();
  }
}

// --- Simple Token (session auth) ---
// Token disimpan di USERS.last_token, expired setelah 24 jam
function generateToken(userId) {
  return userId + '_' + Utilities.getUuid().replace(/-/g, '') + '_' + Date.now();
}

// --- JSON parse helper ---
function parseJson(str) {
  try {
    return JSON.parse(str);
  } catch(e) {
    return null;
  }
}

// --- Validate required fields ---
function requireFields(obj, fields) {
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    if (obj[f] === undefined || obj[f] === null || obj[f] === '') {
      return false;
    }
  }
  return true;
}

// --- Auth check ---
// Setiap request (selain login) wajib kirim token
function validateToken(token) {
  if (!token) return null;
  var sheet = getCoreSheet(SHEET.USERS);
  var user = findRowByField(sheet, 'token', token);
  if (!user) return null;
  if (user.status !== USER_STATUS.ACTIVE) return null;
  // Token expired setelah 24 jam
  var tokenParts = token.split('_');
  if (tokenParts.length < 3) return null;
  var ts = parseInt(tokenParts[tokenParts.length - 1]);
  if (isNaN(ts)) return null;
  var hoursPassed = (Date.now() - ts) / (1000 * 60 * 60);
  if (hoursPassed > 24) return null;
  return user;
}

// --- Log Action ---
function logAction(userId, action, detail) {
  try {
    var sheet = getCoreSheet(SHEET.LOGS);
    appendRow(sheet, {
      log_id    : generateUUID(),
      timestamp : now(),
      user_id   : userId || '',
      action    : action,
      detail    : detail || ''
    });
  } catch(e) {
    // Log tidak boleh meledakkan request utama
  }
}
