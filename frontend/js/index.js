(function () {

  // ============================================================
  // ELEMEN
  // ============================================================
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

  // ============================================================
  // GUARD — redirect jika sudah login
  // ============================================================
  if (getSession()) {
    goTo('dashboard.html');
    return;
  }

  // ============================================================
  // TAB SWITCHING
  // ============================================================
  function showTab(tab) {
    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.classList.remove('d-none');
      formReg.classList.add('d-none');
      clearErrors();
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formReg.classList.remove('d-none');
      formLogin.classList.add('d-none');
      clearErrors();
    }
  }

  tabLogin.addEventListener('click', function () { showTab('login'); });
  tabRegister.addEventListener('click', function () { showTab('register'); });

  // ============================================================
  // TOGGLE PASSWORD VISIBILITY
  // ============================================================
  document.querySelectorAll('.btn-toggle-pw').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-target');
      var input    = document.getElementById(targetId);
      var icon     = btn.querySelector('i');
      if (input.type === 'password') {
        input.type   = 'text';
        icon.className = 'fa-solid fa-eye-slash';
      } else {
        input.type   = 'password';
        icon.className = 'fa-solid fa-eye';
      }
    });
  });

  // ============================================================
  // HELPER UI
  // ============================================================
  function clearErrors() {
    setError(loginError, '');
    setError(regError, '');
    setSuccess(regSuccess, '');
  }

  function setError(el, msg) {
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.classList.remove('d-none');
    } else {
      el.textContent = '';
      el.classList.add('d-none');
    }
  }

  function setSuccess(el, msg) {
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.classList.remove('d-none');
    } else {
      el.textContent = '';
      el.classList.add('d-none');
    }
  }

  function setButtonLoading(btn, loading) {
    var label   = btn.querySelector('.btn-label');
    var spinner = btn.querySelector('.btn-spinner');
    btn.disabled = loading;
    if (loading) {
      if (label)   label.classList.add('d-none');
      if (spinner) spinner.classList.remove('d-none');
    } else {
      if (label)   label.classList.remove('d-none');
      if (spinner) spinner.classList.add('d-none');
    }
  }

  // ============================================================
  // VALIDASI SEDERHANA (client-side)
  // ============================================================
  function validateEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  function validateLoginForm() {
    var email = loginEmail.value.trim();
    var pass  = loginPassword.value;

    if (!email || !pass) {
      setError(loginError, getLang('MISSING_FIELD'));
      return false;
    }
    if (!validateEmail(email)) {
      setError(loginError, getLang('INVALID_CREDENTIALS'));
      return false;
    }
    return true;
  }

  function validateRegisterForm() {
    var name  = regName.value.trim();
    var email = regEmail.value.trim();
    var pass  = regPassword.value;

    console.log({
      name: name,
      email: email,
      pass: pass,
      passLength: pass.length
    });

    if (!name || !email || !pass) {
      console.log("GAGAL: FIELD KOSONG");
      setError(regError, getLang('MISSING_FIELD'));
      return false;
    }
    if (!validateEmail(email)) {
      console.log("GAGAL: EMAIL");
      setError(regError, getLang('INVALID_EMAIL'));
      return false;
    }
    if (pass.length < 6) {
      console.log("GAGAL: PASSWORD");
      setError(regError, getLang('PASSWORD_MIN_6'));
      return false;
    }
    return true;
  }

  // ============================================================
  // HANDLE LOGIN
  // ============================================================
  formLogin.addEventListener('submit', function (e) {
    e.preventDefault();
    setError(loginError, '');

    if (!validateLoginForm()) return;

    var email    = loginEmail.value.trim();
    var password = loginPassword.value;

    setButtonLoading(btnLogin, true);

    Api.auth.login(email, password)
      .then(function (data) {
        // Simpan session — data dari backend: { user_id, display_name, email, timezone, language, status }
        saveSession(data);

        // Terapkan bahasa & tema dari preferensi user
        if (data.language) localStorage.setItem(LANG_KEY, data.language);
        applyTheme(getCurrentTheme());
        applyLang();

        goTo('dashboard.html');
      })
      .catch(function (err) {
        setButtonLoading(btnLogin, false);

        var code = (err.message || '').split(':')[0];

        // ACCOUNT_PENDING — tampilkan dialog khusus
        if (code === 'ACCOUNT_PENDING') {
          Swal.fire({
            icon:             'info',
            title:            getLang('AUTH_PENDING_TITLE'),
            text:             getLang('AUTH_PENDING_MSG'),
            confirmButtonText: getLang('YES'),
            confirmButtonColor: getComputedStyle(document.documentElement)
                                  .getPropertyValue('--color-primary').trim()
          });
          return;
        }

        setError(loginError, resolveError(err));
      });
  });

  // ============================================================
  // HANDLE REGISTER
  // ============================================================
  formReg.addEventListener('submit', function (e) {
    e.preventDefault();
    console.log("REGISTER SUBMIT");
    setError(regError, '');
    setSuccess(regSuccess, '');

    if (!validateRegisterForm()) {
      console.log("VALIDASI GAGAL");
      return;
    }

    console.log("VALIDASI LOLOS");

    var payload = {
      display_name:     regName.value.trim(),
      email:            regEmail.value.trim(),
      password:         regPassword.value,
      timezone:         regTimezone.value,
      default_language: regLanguage.value
    };

    setButtonLoading(btnRegister, true);
    console.log("CALL API", payload);
    Api.auth.register(payload)
      .then(function () {
        setButtonLoading(btnRegister, false);
        formReg.reset();

        // Tampilkan pesan sukses di form, lalu switch ke tab login
        setSuccess(regSuccess, getLang('ACCOUNT_PENDING'));

        setTimeout(function () {
          showTab('login');
        }, 2500);
      })
      .catch(function (err) {
        setButtonLoading(btnRegister, false);
        setError(regError, resolveError(err));
      });
  });

  // ============================================================
  // DEFAULT TIMEZONE — detect dari browser
  // ============================================================
  (function setDefaultTimezone() {
    var browserTz = '';
    try { browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    if (!browserTz) return;

    var options = regTimezone.querySelectorAll('option');
    for (var i = 0; i < options.length; i++) {
      if (options[i].value === browserTz) {
        regTimezone.value = browserTz;
        break;
      }
    }
  }());

})();