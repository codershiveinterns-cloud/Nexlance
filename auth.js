// js/auth.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const toggle = document.getElementById('togglePassword');
  const message = document.getElementById('formMessage');

  toggle.addEventListener('click', () => {
    if (password.type === 'password') {
      password.type = 'text';
      toggle.textContent = 'Hide';
    } else {
      password.type = 'password';
      toggle.textContent = 'Show';
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    message.textContent = '';

    const em = email.value.trim();
    const pw = password.value;

    if (!em || !pw) {
      message.className = 'form-message error';
      message.textContent = 'Please enter your email and password.';
      return;
    }

    // Demo credential check (replace with server auth in production)
    if (em === 'demo@nexlance.com' && pw === 'demopassword') {
      message.className = 'form-message success';
      message.textContent = 'Login successful! Redirecting...';
      localStorage.setItem('nexlance_auth', '1');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } else {
      message.className = 'form-message error';
      message.textContent = 'Invalid credentials — try demo@nexlance.com / demopassword';
    }
  });
});