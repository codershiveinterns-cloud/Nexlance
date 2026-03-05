// auth.js — Nexlance Login & Registration
// Uses Firebase Auth when configured; falls back to localStorage when credentials not yet set.

document.addEventListener('DOMContentLoaded', async () => {

  /* ============================================================
     FIREBASE SESSION CHECK — redirect if already logged in
  ============================================================ */
  if (isFirebaseConfigured) {
    // Firebase Auth persists session automatically
    await new Promise(resolve => {
      const unsub = auth.onAuthStateChanged(user => {
        unsub();
        if (user) { window.location.href = 'dashboard.html'; return; }
        resolve();
      });
    });
  } else {
    // localStorage fallback session check
    if (localStorage.getItem('nexlance_auth') === '1') {
      window.location.href = 'dashboard.html'; return;
    }
  }

  /* ============================================================
     TAB SWITCHING
  ============================================================ */
  const loginTab      = document.getElementById('loginTab');
  const registerTab   = document.getElementById('registerTab');
  const loginForm     = document.getElementById('loginForm');
  const registerForm  = document.getElementById('registerForm');
  const authTabs      = document.getElementById('authTabs');
  const forgotSection = document.getElementById('forgotSection');
  const authSubText   = document.getElementById('authSubText');

  function switchTab(tab) {
    clearAllErrors();
    hideForgot();
    if (tab === 'login') {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.style.display    = 'flex';
      registerForm.style.display = 'none';
    } else {
      loginTab.classList.remove('active');
      registerTab.classList.add('active');
      loginForm.style.display    = 'none';
      registerForm.style.display = 'flex';
    }
  }

  loginTab.addEventListener('click',    () => switchTab('login'));
  registerTab.addEventListener('click', () => switchTab('register'));

  /* ============================================================
     FORGOT PASSWORD — show / hide
  ============================================================ */
  function showForgot() {
    authTabs.style.display      = 'none';
    loginForm.style.display     = 'none';
    registerForm.style.display  = 'none';
    forgotSection.style.display = 'block';
    authSubText.textContent     = 'Reset your password';
    clearFieldError('forgotEmail');
    setMessage('forgotMessage', '', '');
    document.getElementById('forgotEmail').value = '';
  }

  function hideForgot() {
    authTabs.style.display      = 'flex';
    forgotSection.style.display = 'none';
    authSubText.textContent     = 'Build beautiful websites & dashboards — sign in to continue.';
  }

  document.getElementById('forgotLink').addEventListener('click', e => {
    e.preventDefault();
    const existingEmail = document.getElementById('loginEmail').value.trim();
    showForgot();
    if (existingEmail) document.getElementById('forgotEmail').value = existingEmail;
  });

  document.getElementById('backToLoginLink').addEventListener('click', e => {
    e.preventDefault();
    switchTab('login');
  });

  /* ============================================================
     LOCAL STORAGE — fallback when Firebase not configured
  ============================================================ */
  function getLocalUsers() {
    try { return JSON.parse(localStorage.getItem('nexlance_users') || '[]'); }
    catch (e) { return []; }
  }
  function saveLocalUsers(users) {
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
     'regName', 'regEmail', 'regMobile', 'regPassword', 'regConfirm',
     'forgotEmail'
    ].forEach(clearFieldError);
    setMessage('loginMessage', '', '');
    setMessage('registerMessage', '', '');
    setMessage('forgotMessage', '', '');
  }

  function setMessage(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message' + (type ? ' ' + type : '');
  }

  function setLoading(btnId, loading, defaultText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait…' : defaultText;
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
     FIREBASE ERROR → friendly message
  ============================================================ */
  function friendlyFirebaseError(code) {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
      case 'auth/wrong-password':       return 'Incorrect email or password.';
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/weak-password':        return 'Password must be at least 8 characters.';
      case 'auth/too-many-requests':    return 'Too many attempts. Please try again later.';
      case 'auth/network-request-failed': return 'Network error. Check your internet connection.';
      case 'auth/operation-not-allowed':
        return 'Email/Password sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password.';
      case 'auth/invalid-continue-uri':
      case 'auth/unauthorized-continue-uri':
        return 'Reset email sent but redirect URL is not authorized. Add your domain in Firebase Console → Authentication → Authorized domains.';
      default: return `Error (${code}). Check browser console for details.`;
    }
  }

  /* ============================================================
     LOGIN FORM — submit
  ============================================================ */
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearAllErrors();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    let valid = true;

    const emailErr = validateEmail(email);
    if (emailErr) { showFieldError('loginEmail', emailErr); valid = false; }
    if (!password) { showFieldError('loginPassword', 'Password is required.'); valid = false; }
    if (!valid) return;

    setLoading('loginBtn', true, 'Sign In');

    if (isFirebaseConfigured) {
      // ── Firebase Auth ──
      try {
        const { user } = await auth.signInWithEmailAndPassword(email, password);

        localStorage.setItem('nexlance_auth', '1');
        localStorage.setItem('nexlance_user', JSON.stringify({
          name:  user.displayName || user.email,
          email: user.email
        }));
        setMessage('loginMessage', 'Login successful! Redirecting…', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);

      } catch (err) {
        setLoading('loginBtn', false, 'Sign In');
        const msg = friendlyFirebaseError(err.code);
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          showFieldError('loginEmail', msg);
        } else if (err.code === 'auth/wrong-password') {
          showFieldError('loginPassword', msg);
        } else {
          setMessage('loginMessage', msg, 'error');
        }
      }

    } else {
      // ── localStorage fallback ──
      const users = getLocalUsers();
      const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      setLoading('loginBtn', false, 'Sign In');
      if (!user) { showFieldError('loginEmail', 'No account found with this email.'); return; }
      if (user.password !== password) { showFieldError('loginPassword', 'Incorrect password.'); return; }

      localStorage.setItem('nexlance_auth', '1');
      localStorage.setItem('nexlance_user', JSON.stringify({ name: user.name, email: user.email }));
      setMessage('loginMessage', 'Login successful! Redirecting…', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
    }
  });

  /* ============================================================
     REGISTER FORM — submit
  ============================================================ */
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearAllErrors();

    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const mobile   = document.getElementById('regMobile').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm  = document.getElementById('regConfirm').value;
    let valid = true;

    const nameErr = validateName(name);
    if (nameErr)     { showFieldError('regName',     nameErr);     valid = false; }

    const emailErr = validateEmail(email);
    if (emailErr)    { showFieldError('regEmail',    emailErr);    valid = false; }

    const mobileErr = validateMobile(mobile);
    if (mobileErr)   { showFieldError('regMobile',   mobileErr);   valid = false; }

    const passwordErr = validatePassword(password);
    if (passwordErr) { showFieldError('regPassword', passwordErr); valid = false; }

    if (!confirm) {
      showFieldError('regConfirm', 'Please confirm your password.'); valid = false;
    } else if (!passwordErr && password !== confirm) {
      showFieldError('regConfirm', 'Passwords do not match.'); valid = false;
    }

    if (!valid) return;

    setLoading('registerBtn', true, 'Create Account');

    if (isFirebaseConfigured) {
      // ── Firebase Auth ──
      try {
        const { user } = await auth.createUserWithEmailAndPassword(email, password);
        // Save display name & mobile in Firebase user profile
        await user.updateProfile({ displayName: name });
        // Store mobile in Firestore user document
        await db.collection('users').doc(user.uid).set({ name, email, mobile, createdAt: new Date().toISOString() });

        setLoading('registerBtn', false, 'Create Account');
        setMessage('registerMessage', 'Account created successfully! You can now sign in.', 'success');
        setTimeout(() => {
          switchTab('login');
          document.getElementById('loginEmail').value = email;
        }, 1500);

      } catch (err) {
        setLoading('registerBtn', false, 'Create Account');
        if (err.code === 'auth/email-already-in-use') {
          showFieldError('regEmail', friendlyFirebaseError(err.code));
        } else {
          setMessage('registerMessage', friendlyFirebaseError(err.code), 'error');
        }
      }

    } else {
      // ── localStorage fallback ──
      const users = getLocalUsers();
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        setLoading('registerBtn', false, 'Create Account');
        showFieldError('regEmail', 'An account with this email already exists.');
        return;
      }
      users.push({ name, email, mobile, password, createdAt: new Date().toISOString() });
      saveLocalUsers(users);
      setLoading('registerBtn', false, 'Create Account');
      setMessage('registerMessage', 'Account created successfully! You can now sign in.', 'success');
      setTimeout(() => {
        switchTab('login');
        document.getElementById('loginEmail').value = email;
      }, 1500);
    }
  });

  /* ============================================================
     FORGOT PASSWORD — send reset email via Firebase
  ============================================================ */
  document.getElementById('sendResetBtn').addEventListener('click', async () => {
    clearFieldError('forgotEmail');
    setMessage('forgotMessage', '', '');

    const email = document.getElementById('forgotEmail').value.trim();
    const emailErr = validateEmail(email);
    if (emailErr) { showFieldError('forgotEmail', emailErr); return; }

    if (!isFirebaseConfigured) {
      setMessage('forgotMessage',
        'Password reset requires Firebase to be connected. Please add your Firebase credentials in supabase-config.js first.',
        'error');
      return;
    }

    setLoading('sendResetBtn', true, 'Send Reset Link');

    try {
      await auth.sendPasswordResetEmail(email, {
        url: window.location.origin + '/login.html'
      });

      setLoading('sendResetBtn', false, 'Send Reset Link');
      setMessage('forgotMessage',
        'If this email is registered, a reset link has been sent. Check your inbox, spam, and Gmail Promotions tab. Note: only accounts created via "Create Account" on this page will receive the email.',
        'success');
      document.getElementById('sendResetBtn').disabled = true;

    } catch (err) {
      setLoading('sendResetBtn', false, 'Send Reset Link');
      console.error('Password reset error:', err.code, err.message);

      if (err.code === 'auth/user-not-found') {
        // Account doesn't exist in Firebase — they may have registered before Firebase was set up
        setMessage('forgotMessage',
          'No Firebase account found for this email. Please create a new account using the "Create Account" tab first.',
          'error');
      } else {
        setMessage('forgotMessage', friendlyFirebaseError(err.code), 'error');
      }
    }
  });

  /* ============================================================
     REAL-TIME INLINE VALIDATION
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

  document.getElementById('regMobile').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '');
  });

  document.getElementById('regPassword').addEventListener('input', () => {
    const pw  = document.getElementById('regPassword').value;
    const err = validatePassword(pw);
    err ? showFieldError('regPassword', err) : clearFieldError('regPassword');
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

  document.getElementById('loginEmail').addEventListener('blur', () => {
    const err = validateEmail(document.getElementById('loginEmail').value);
    err ? showFieldError('loginEmail', err) : clearFieldError('loginEmail');
  });

  document.getElementById('forgotEmail').addEventListener('blur', () => {
    const err = validateEmail(document.getElementById('forgotEmail').value);
    err ? showFieldError('forgotEmail', err) : clearFieldError('forgotEmail');
  });

});
