(function () {
  // Redirect kalau sudah login
  if (getSession()) { goTo('dashboard.html'); return; }

  var tabLogin    = document.getElementById('tab-login');
  var tabRegister = document.getElementById('tab-register');
  var formLogin   = document.getElementById('form-login');
  var formReg     = document.getElementById('form-register');
  var loginEmail    = document.getElementById('login-email');
  var loginPassword = document.getElementById('login-password');
  var loginError    = document.getElementById('login-error');
  var btnLogin      = document.getElementById('btn-login');
  var regName     = document.getElementById('reg-name');
  var regEmail    = document.getElementById('reg-email');
  var regPassword = document.getElementById('reg-password');
  var regTimezone = document.getElementById('reg-timezone');
  var regLanguage = document.getElementById('reg-language');
  var regError    = document.getElementById('reg-error');
  var regSuccess  = document.getElementById('reg-success');
  var btnRegister = document.getElementById('btn-register');

  // ── Tab switching ──
  function showTab(tab) {
    var isLogin = tab === 'login';
    tabLogin.classList.toggle('active', isLogin);
    tabRegister.classList.toggle('active', !isLogin);
    formLogin.classList.toggle('d-none', !isLogin);
    formReg.classList.toggle('d-none', isLogin);
    setMsg(loginError, '');
    setMsg(regError, '');
    setMsg(regSuccess, '');
    // Focus first input
    setTimeout(function() {
      var first = (isLogin ? formLogin : formReg).querySelector('input');
      if (first) first.focus();
    }, 50);
  }
  tabLogin.addEventListener('click', function() { showTab('login'); });
  tabRegister.addEventListener('click', function() { showTab('register'); });

  // ── Toggle password ──
  document.querySelectorAll('.btn-toggle-pw').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var inp  = document.getElementById(btn.getAttribute('data-target'));
      var icon = btn.querySelector('i');
      if (inp.type === 'password') {
        inp.type = 'text'; icon.className = 'fa-solid fa-eye-slash';
      } else {
        inp.type = 'password'; icon.className = 'fa-solid fa-eye';
      }
    });
  });

  // ── Helpers ──
  function setMsg(el, msg, isSuccess) {
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('d-none', !msg);
    if (isSuccess) el.style.color = 'var(--color-success)';
    else el.style.color = '';
  }
  function setBtnLoading(btn, loading) {
    var lbl = btn.querySelector('.btn-label');
    var spn = btn.querySelector('.btn-spinner');
    btn.disabled = loading;
    if (lbl) lbl.classList.toggle('d-none', loading);
    if (spn) spn.classList.toggle('d-none', !loading);
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

  // ── Login ──
  formLogin.addEventListener('submit', function(e) {
    e.preventDefault();
    setMsg(loginError, '');
    var email = loginEmail.value.trim();
    var pass  = loginPassword.value;
    if (!email || !pass) { setMsg(loginError, getLang('MISSING_FIELD')); return; }
    if (!validEmail(email)) { setMsg(loginError, getLang('INVALID_CREDENTIALS')); return; }

    setBtnLoading(btnLogin, true);
    Api.auth.login(email, pass)
      .then(function(data) {
        saveSession(data);
        if (data.language) localStorage.setItem(LANG_KEY, data.language);
        applyTheme(getCurrentTheme());
        goTo('dashboard.html');
      })
      .catch(function(err) {
        setBtnLoading(btnLogin, false);
        var code = (err.message || '').split(':')[0];
        if (code === 'ACCOUNT_PENDING') {
          Swal.fire({
            icon: 'info',
            title: getLang('AUTH_PENDING_TITLE'),
            text: getLang('AUTH_PENDING_MSG'),
            confirmButtonText: getLang('YES'),
            confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
          });
          return;
        }
        setMsg(loginError, resolveError(err));
      });
  });

  // ── Register ──
  formReg.addEventListener('submit', function(e) {
    e.preventDefault();
    setMsg(regError, ''); setMsg(regSuccess, '');
    var name  = regName.value.trim();
    var email = regEmail.value.trim();
    var pass  = regPassword.value;
    if (!name || !email || !pass) { setMsg(regError, getLang('MISSING_FIELD')); return; }
    if (!validEmail(email)) { setMsg(regError, getLang('INVALID_EMAIL')); return; }
    if (pass.length < 6) { setMsg(regError, getLang('PASSWORD_MIN_6')); return; }

    setBtnLoading(btnRegister, true);
    Api.auth.register({
      display_name: name, email: email, password: pass,
      timezone: regTimezone.value, default_language: regLanguage.value
    })
    .then(function() {
      setBtnLoading(btnRegister, false);
      formReg.reset();
      setMsg(regSuccess, getLang('ACCOUNT_PENDING'), true);
      setTimeout(function() { showTab('login'); }, 2500);
    })
    .catch(function(err) {
      setBtnLoading(btnRegister, false);
      setMsg(regError, resolveError(err));
    });
  });

  // ── Auto-detect timezone ──
  (function() {
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) {}
    if (!tz) return;
    var opts = regTimezone.querySelectorAll('option');
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === tz) { regTimezone.value = tz; break; }
    }
  }());
})();
