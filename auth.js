// auth.js — Nexlance Login & Registration
// User accounts are stored in localStorage under 'nexlance_users' (JSON array).
// This is the standard approach for a browser-based app with no backend server.

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     TAB SWITCHING
  ============================================================ */
  const loginTab      = document.getElementById('loginTab');
  const registerTab   = document.getElementById('registerTab');
  const loginForm     = document.getElementById('loginForm');
  const registerForm  = document.getElementById('registerForm');

  function switchTab(tab) {
    clearAllErrors();
    if (tab === 'login') {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.style.display   = 'flex';
      registerForm.style.display = 'none';
    } else {
      loginTab.classList.remove('active');
      registerTab.classList.add('active');
      loginForm.style.display   = 'none';
      registerForm.style.display = 'flex';
    }
  }

  loginTab.addEventListener('click',    () => switchTab('login'));
  registerTab.addEventListener('click', () => switchTab('register'));

  /* ============================================================
     USER STORAGE (localStorage — persists across sessions)
  ============================================================ */
  function getUsers() {
    try { return JSON.parse(localStorage.getItem('nexlance_users') || '[]'); }
    catch (e) { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem('nexlance_users', JSON.stringify(users));
  }

  /* ============================================================
     VALIDATION RULES
  ============================================================ */
  function validateName(name) {
    if (!name.trim())              return 'Full name is required.';
    if (name.trim().length < 2)    return 'Name must be at least 2 characters.';
    if (!/^[a-zA-Z ]+$/.test(name.trim())) return 'Name can only contain letters and spaces.';
    return null;
  }

  function validateEmail(email) {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
    return null;
  }

  function validateMobile(mobile) {
    if (!mobile.trim()) return 'Mobile number is required.';
    if (!/^[6-9][0-9]{9}$/.test(mobile.trim())) return 'Enter a valid 10-digit mobile number (starts with 6–9).';
    return null;
  }

  function validatePassword(password) {
    if (!password)              return 'Password is required.';
    if (password.length < 8)   return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter (A–Z).';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter (a–z).';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number (0–9).';
    if (!/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/`~\\]/.test(password))
      return 'Password must contain at least one special character (e.g. @, #, $, !).';
    return null;
  }

  /* ============================================================
     FIELD ERROR HELPERS
  ============================================================ */
  function showFieldError(fieldId, message) {
    const errEl = document.getElementById(fieldId + 'Error');
    const input  = document.getElementById(fieldId);
    if (errEl) { errEl.textContent = message; errEl.style.display = 'block'; }
    if (input)  input.classList.add('input-error');
  }

  function clearFieldError(fieldId) {
    const errEl = document.getElementById(fieldId + 'Error');
    const input  = document.getElementById(fieldId);
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    if (input)  input.classList.remove('input-error');
  }

  function clearAllErrors() {
    ['loginEmail', 'loginPassword',
     'regName', 'regEmail', 'regMobile', 'regPassword', 'regConfirm'
    ].forEach(clearFieldError);
    setMessage('loginMessage', '', '');
    setMessage('registerMessage', '', '');
  }

  function setMessage(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message' + (type ? ' ' + type : '');
  }

  /* ============================================================
     SHOW / HIDE PASSWORD TOGGLES
  ============================================================ */
  function setupToggle(btnId, inputId) {
    const btn   = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      if (input.type === 'password') { input.type = 'text';     btn.textContent = 'Hide'; }
      else                           { input.type = 'password'; btn.textContent = 'Show'; }
    });
  }

  setupToggle('toggleLoginPassword', 'loginPassword');
  setupToggle('toggleRegPassword',   'regPassword');
  setupToggle('toggleRegConfirm',    'regConfirm');

  /* ============================================================
     LOGIN FORM — submit
  ============================================================ */
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    clearAllErrors();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    let valid = true;

    const emailErr = validateEmail(email);
    if (emailErr) { showFieldError('loginEmail', emailErr); valid = false; }

    if (!password) { showFieldError('loginPassword', 'Password is required.'); valid = false; }

    if (!valid) return;

    const users = getUsers();
    const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      showFieldError('loginEmail', 'No account found with this email.');
      return;
    }
    if (user.password !== password) {
      showFieldError('loginPassword', 'Incorrect password.');
      return;
    }

    setMessage('loginMessage', 'Login successful! Redirecting...', 'success');
    localStorage.setItem('nexlance_auth', '1');
    localStorage.setItem('nexlance_user', JSON.stringify({ name: user.name, email: user.email }));
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  });

  /* ============================================================
     REGISTER FORM — submit
  ============================================================ */
  registerForm.addEventListener('submit', e => {
    e.preventDefault();
    clearAllErrors();

    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const mobile   = document.getElementById('regMobile').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm  = document.getElementById('regConfirm').value;
    let valid = true;

    const nameErr     = validateName(name);
    if (nameErr)     { showFieldError('regName',     nameErr);     valid = false; }

    const emailErr    = validateEmail(email);
    if (emailErr)    { showFieldError('regEmail',    emailErr);    valid = false; }

    const mobileErr   = validateMobile(mobile);
    if (mobileErr)   { showFieldError('regMobile',   mobileErr);   valid = false; }

    const passwordErr = validatePassword(password);
    if (passwordErr) { showFieldError('regPassword', passwordErr); valid = false; }

    if (!confirm) {
      showFieldError('regConfirm', 'Please confirm your password.');
      valid = false;
    } else if (!passwordErr && password !== confirm) {
      showFieldError('regConfirm', 'Passwords do not match.');
      valid = false;
    }

    if (!valid) return;

    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      showFieldError('regEmail', 'An account with this email already exists.');
      return;
    }

    users.push({
      name,
      email,
      mobile,
      password,
      createdAt: new Date().toISOString()
    });
    saveUsers(users);

    setMessage('registerMessage', 'Account created successfully! You can now sign in.', 'success');
    setTimeout(() => {
      switchTab('login');
      document.getElementById('loginEmail').value = email;
    }, 1500);
  });

  /* ============================================================
     REAL-TIME INLINE VALIDATION (on blur / input)
  ============================================================ */
  document.getElementById('regName').addEventListener('blur', () => {
    const err = validateName(document.getElementById('regName').value);
    err ? showFieldError('regName', err) : clearFieldError('regName');
  });

  document.getElementById('regEmail').addEventListener('blur', () => {
    const err = validateEmail(document.getElementById('regEmail').value);
    err ? showFieldError('regEmail', err) : clearFieldError('regEmail');
  });

  document.getElementById('regMobile').addEventListener('blur', () => {
    const err = validateMobile(document.getElementById('regMobile').value);
    err ? showFieldError('regMobile', err) : clearFieldError('regMobile');
  });

  // Only allow digits in mobile field
  document.getElementById('regMobile').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '');
  });

  document.getElementById('regPassword').addEventListener('input', () => {
    const pw  = document.getElementById('regPassword').value;
    const err = validatePassword(pw);
    err ? showFieldError('regPassword', err) : clearFieldError('regPassword');
    // Re-check confirm match
    const confirm = document.getElementById('regConfirm').value;
    if (confirm) {
      pw !== confirm
        ? showFieldError('regConfirm', 'Passwords do not match.')
        : clearFieldError('regConfirm');
    }
  });

  document.getElementById('regConfirm').addEventListener('input', () => {
    const pw      = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    if (!confirm) { clearFieldError('regConfirm'); return; }
    pw !== confirm
      ? showFieldError('regConfirm', 'Passwords do not match.')
      : clearFieldError('regConfirm');
  });

  // Login inline validation on blur
  document.getElementById('loginEmail').addEventListener('blur', () => {
    const err = validateEmail(document.getElementById('loginEmail').value);
    err ? showFieldError('loginEmail', err) : clearFieldError('loginEmail');
  });

});
