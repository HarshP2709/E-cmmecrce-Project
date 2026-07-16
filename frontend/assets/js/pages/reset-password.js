/**
 * ShopVerse - Reset Password Page
 * Validates token from URL, handles new password submission
 */

import { initPage, apiFetch, showToast, getParams, escapeHTML } from '../modules/utils.js';
import { Auth } from '../modules/auth.js';

document.addEventListener('DOMContentLoaded', () => {
  initPage();

  // Redirect already-logged-in users
  if (Auth.isLoggedIn()) {
    window.location.href = '/pages/profile.html';
    return;
  }

  const { token, access_token } = getParams();
  const resetToken = token || access_token;

  if (!resetToken) {
    showInvalidPanel();
    return;
  }

  // Store token in hidden field
  const tokenField = document.getElementById('reset-token');
  if (tokenField) tokenField.value = resetToken;

  initPasswordStrength();
  initPasswordToggles();
  initResetForm(resetToken);
});

// ── Reset Form ────────────────────────────────────────────────
function initResetForm(token) {
  const form = document.getElementById('reset-form');
  const submitBtn = document.getElementById('reset-submit-btn');
  const btnText = document.getElementById('reset-btn-text');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('new-password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;
    const confirmError = document.getElementById('confirm-pwd-error');

    // Validate
    if (!newPassword || newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error'); return;
    }
    if (newPassword !== confirmPassword) {
      if (confirmError) confirmError.style.display = 'block';
      showToast('Passwords do not match.', 'error'); return;
    }

    if (!checkRequirements(newPassword)) {
      showToast('Password does not meet all requirements.', 'error'); return;
    }

    submitBtn.classList.add('loading');
    if (btnText) btnText.textContent = 'Updating…';

    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password: newPassword }),
      });

      showSuccessPanel();
    } catch (err) {
      if (err.message?.includes('expired') || err.message?.includes('invalid')) {
        showInvalidPanel();
      } else {
        showToast(err.message || 'Failed to reset password. The link may have expired.', 'error');
      }
    } finally {
      submitBtn.classList.remove('loading');
      if (btnText) btnText.textContent = 'Update Password 🔒';
    }
  });

  // Live confirm password match check
  document.getElementById('confirm-password')?.addEventListener('input', (e) => {
    const confirmError = document.getElementById('confirm-pwd-error');
    const newPwd = document.getElementById('new-password')?.value;
    if (confirmError) {
      confirmError.style.display = (e.target.value && e.target.value !== newPwd) ? 'block' : 'none';
    }
  });
}

// ── Password Strength ─────────────────────────────────────────
function initPasswordStrength() {
  const input = document.getElementById('new-password');
  const strengthWrap = document.getElementById('pwd-strength');
  const bar = document.getElementById('pwd-strength-bar');
  const label = document.getElementById('pwd-strength-label');

  if (!input) return;

  input.addEventListener('input', () => {
    const val = input.value;
    updateRequirements(val);

    if (!val) { if (strengthWrap) strengthWrap.style.display = 'none'; return; }
    if (strengthWrap) strengthWrap.style.display = 'block';

    const score = calcScore(val);
    const levels = [
      { width: '20%', color: '#ef4444', text: 'Very Weak' },
      { width: '40%', color: '#f97316', text: 'Weak' },
      { width: '60%', color: '#eab308', text: 'Fair' },
      { width: '80%', color: '#22c55e', text: 'Strong' },
      { width: '100%', color: '#10b981', text: 'Very Strong' },
    ];
    const level = levels[Math.min(score, 4)];
    if (bar) { bar.style.width = level.width; bar.style.background = level.color; }
    if (label) label.textContent = level.text;
  });
}

function updateRequirements(password) {
  const checks = {
    'req-length':  password.length >= 8,
    'req-upper':   /[A-Z]/.test(password),
    'req-number':  /[0-9]/.test(password),
    'req-special': /[^A-Za-z0-9]/.test(password),
  };

  Object.entries(checks).forEach(([id, passes]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const icon = el.querySelector('.req-icon');
    if (icon) icon.textContent = passes ? '✅' : '○';
    el.style.color = passes ? 'var(--color-success)' : 'var(--text-muted)';
  });
}

function checkRequirements(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function calcScore(password) {
  let s = 0;
  if (password.length >= 8) s++;
  if (password.length >= 12) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  return Math.min(s, 4);
}

// ── Password Toggles ──────────────────────────────────────────
function initPasswordToggles() {
  document.getElementById('toggle-new-pwd')?.addEventListener('click', () => {
    const input = document.getElementById('new-password');
    togglePasswordVisibility(input, document.getElementById('toggle-new-pwd'));
  });

  document.getElementById('toggle-confirm-pwd')?.addEventListener('click', () => {
    const input = document.getElementById('confirm-password');
    togglePasswordVisibility(input, document.getElementById('toggle-confirm-pwd'));
  });
}

function togglePasswordVisibility(input, btn) {
  if (!input || !btn) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.textContent = isPassword ? '🙈' : '👁';
}

// ── Panel Switches ────────────────────────────────────────────
function showInvalidPanel() {
  document.getElementById('reset-panel').style.display = 'none';
  document.getElementById('reset-success-panel').style.display = 'none';
  document.getElementById('invalid-token-panel').style.display = 'block';
}

function showSuccessPanel() {
  document.getElementById('reset-panel').style.display = 'none';
  document.getElementById('invalid-token-panel').style.display = 'none';
  document.getElementById('reset-success-panel').style.display = 'block';

  // Auto-redirect to login after 3 seconds
  setTimeout(() => {
    window.location.href = '/pages/login.html?message=password_reset';
  }, 3000);
}
