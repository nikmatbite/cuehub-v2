// ============================================================
// CONSTANTS
// ============================================================
var SESSION_KEY = 'ch_user';
var LANG_KEY    = 'ch_lang';
var THEME_KEY   = 'ch_theme';
var ACTIVE_KEY  = 'ch_active';

// ============================================================
// SESSION MANAGEMENT
// ============================================================
function saveSession(userData) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch (e) { return null; }
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ACTIVE_KEY);
}
function saveActiveState(state) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(state));
}
function getActiveState() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_KEY)); }
  catch (e) { return null; }
}
function clearActiveState() {
  localStorage.removeItem(ACTIVE_KEY);
}

// ============================================================
// THEME
// ============================================================
var THEMES = ['blue', 'green', 'purple', 'gold'];
function applyTheme(theme) {
  if (THEMES.indexOf(theme) === -1) theme = 'blue';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}
function getCurrentTheme() {
  return localStorage.getItem(THEME_KEY) || 'blue';
}

// ============================================================
// NAVIGATION
// ============================================================
function goTo(page) { window.location.href = page; }
function requireAuth() {
  var user = getSession();
  if (!user) { goTo('index.html'); return null; }
  return user;
}

// ============================================================
// ERROR
// ============================================================
function resolveError(err) {
  if (!err) return getLang('INTERNAL_ERROR');
  var base = (err.message || err.code || '').split(':')[0];
  return getLang(base) || getLang('INTERNAL_ERROR');
}

// ============================================================
// LOADING OVERLAY
// ============================================================
function showLoading() {
  if (document.getElementById('ch-loading')) return;
  var el = document.createElement('div');
  el.id = 'ch-loading';
  el.className = 'loading-overlay';
  el.innerHTML = '<div class="spinner-border"></div>';
  document.body.appendChild(el);
}
function hideLoading() {
  var el = document.getElementById('ch-loading');
  if (el) el.remove();
}

// ============================================================
// TOAST
// ============================================================
function showToast(type, messageKey) {
  Swal.fire({
    toast: true, position: 'top', icon: type,
    title: getLang(messageKey),
    showConfirmButton: false, timer: 2500, timerProgressBar: true
  });
}
function showToastMsg(type, message) {
  Swal.fire({
    toast: true, position: 'top', icon: type,
    title: message,
    showConfirmButton: false, timer: 2500, timerProgressBar: true
  });
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
function showConfirm(messageKey, onConfirm) {
  Swal.fire({
    title: getLang(messageKey),
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: getLang('YES'),
    cancelButtonText: getLang('CANCEL'),
    confirmButtonColor: getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary').trim()
  }).then(function(result) {
    if (result.isConfirmed && onConfirm) onConfirm();
  });
}

// ============================================================
// AVATAR
// ============================================================
function makeAvatar(name, size) {
  var initials = (name || '?').split(' ').slice(0, 2)
    .map(function(w) { return w[0]; }).join('').toUpperCase();
  var cls = 'avatar' + (size === 'sm' ? ' avatar-sm' : '');
  return '<div class="' + cls + '">' + initials + '</div>';
}

// ============================================================
// FORMAT HELPERS
// ============================================================
function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(
    localStorage.getItem(LANG_KEY) === 'en' ? 'en-GB' : 'id-ID',
    { day: 'numeric', month: 'short', year: 'numeric' }
  );
}
function formatTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatWinRate(rate) {
  return (parseFloat(rate) || 0).toFixed(1) + '%';
}
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// INIT (dijalankan di setiap halaman)
// ============================================================
function initApp() {
  applyTheme(getCurrentTheme());
  applyLang();
}
document.addEventListener('DOMContentLoaded', initApp);
