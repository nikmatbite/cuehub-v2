// ---- Custom Error ----
function ApiError(code) {
  this.name    = 'ApiError';
  this.code    = code;
  this.message = code; // tidak ada teks bahasa di backend
}
ApiError.prototype = Object.create(Error.prototype);

// ---- Response Builders ----
function successResponse(data) {
  return { success: true, data: data };
}

function errorResponse(err) {
  var code = (err instanceof ApiError) ? err.code : 'INTERNAL_ERROR';
  console.error('[CUEHUB ERROR] ' + code + (err && err.stack ? '\n' + err.stack : ''));
  return { success: false, error: { code: code } };
}

function buildOutput(responseObj) {
  return ContentService
    .createTextOutput(JSON.stringify(responseObj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- Request Parsing ----
// Frontend kirim POST Content-Type: text/plain untuk hindari CORS preflight.
// Body tetap JSON string, di-parse manual di sini.
function parseRequest(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      throw new ApiError('INVALID_JSON');
    }
  }
  if (e && e.parameter && e.parameter.action) {
    var payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (err) { payload = {}; }
    }
    return { action: e.parameter.action, payload: payload };
  }
  throw new ApiError('EMPTY_REQUEST');
}

// ---- UUID ----
function generateUUID() {
  return Utilities.getUuid();
}

// ---- Password Hashing (SHA-256 + salt) ----
function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '');
}

function hashPassword(plainPassword, salt) {
  var input   = salt + plainPassword;
  var rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    input,
    Utilities.Charset.UTF_8
  );
  return rawHash.map(function (byte) {
    var v = (byte < 0) ? byte + 256 : byte;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function buildPasswordField(plainPassword) {
  var salt = generateSalt();
  return salt + '$' + hashPassword(plainPassword, salt);
}

// ---- Timestamp ----
function nowISOString() {
  return new Date().toISOString();
}

// ---- Sheet Accessors ----
// File Core  → SpreadsheetApp.getActiveSpreadsheet() (bound script)
// File DB    → SpreadsheetApp.openById(DB_SPREADSHEET_ID)
function getCoreSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getDbSpreadsheet() {
  return SpreadsheetApp.openById(DB_SPREADSHEET_ID);
}

function getSheet(fileType, sheetName) {
  var ss = (fileType === 'core') ? getCoreSpreadsheet() : getDbSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new ApiError('SHEET_NOT_FOUND');
  return sheet;
}

// ---- Sheet ↔ Object Mapping ----
// Baris pertama = header. Setiap baris data jadi object { fieldName: value }.
// _rowIndex disimpan untuk keperluan update (1-based, header di row 1).
function sheetToObjects(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).map(function (row, idx) {
    var obj = { _rowIndex: idx + 2 };
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function findRowByField(sheet, fieldName, value) {
  var rows = sheetToObjects(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][fieldName] === value) return rows[i];
  }
  return null;
}

function findAllByField(sheet, fieldName, value) {
  return sheetToObjects(sheet).filter(function (row) {
    return row[fieldName] === value;
  });
}

function appendRowObject(sheet, dataObj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) {
    return (dataObj[h] !== undefined) ? dataObj[h] : '';
  });
  sheet.appendRow(row);
  return dataObj;
}

function updateRowObject(sheet, rowIndex, updates) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach(function (h, i) {
    if (updates[h] !== undefined) {
      sheet.getRange(rowIndex, i + 1).setValue(updates[h]);
    }
  });
}

// ---- Lock (anti race condition untuk operasi tulis) ----
function withLock(fn) {
  var lock     = LockService.getScriptLock();
  var acquired = lock.tryLock(10000);
  if (!acquired) throw new ApiError('LOCK_TIMEOUT');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ---- Validation ----
function requireFields(payload, fields) {
  fields.forEach(function (f) {
    if (payload[f] === undefined || payload[f] === null || payload[f] === '') {
      throw new ApiError('MISSING_FIELD:' + f);
    }
  });
}