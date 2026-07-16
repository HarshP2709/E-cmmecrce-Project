/**
 * ShopVerse - Login Page
 * Handles form validation, authentication, and redirect logic
 */

import { initPage, showToast, getParams, storage } from '../modules/utils.js';
import { Auth } from '../modules/auth.js';
import { Cart } from '../modules/cart.js';

// ── Entry Point ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPage();
  initTheme();
  checkAlreadyLoggedIn();
  initForm();
  initPasswordToggle();
  initSocialButtons();
  initRegisterLink();
});

// ── Redirect if already authenticated ────────────────────────
function checkAlreadyLoggedIn() {
  if (Auth.isLoggedIn()) {
    const redirectUrl = getParams().redirect || getParams().next || '../index.html';
    window.location.href = redirectUrl;
  }
}

// ── Theme (no full navbar, so init manually) ─────────────────
function initTheme() {
  const saved = storage.get('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

// ── Get redirect target ───────────────────────────────────────
function getRedirectTarget() {
  const params = getParams();
  const redirect = params.redirect || params.next || '';
  if (redirect && redirect.startsWith('/')) return redirect;
  if (redirect && !redirect.startsWith('http')) return redirect;
  return '../index.html';
}

// ── Form Initialization ───────────────────────────────────────
function initForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailInput    = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  // Live validation on blur
  emailInput?.addEventListener('blur', () => validateEmail(emailInput));
  passwordInput?.addEventListener('blur', () => validatePassword(passwordInput));

  // Clear error on input
  emailInput?.addEventListener('input', () => clearFieldError(emailInput, 'email-error'));
  passwordInput?.addEventListener('input', () => clearFieldError(passwordInput, 'password-error'));

  form.addEventListener('submit', handleSubmit);
}

// ── Form Submit ───────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();

  const emailInput    = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const submitBtn     = document.getElementById('login-btn');
  const rememberMe    = document.getElementById('remember-me');

  // Validate all fields
  const emailOk    = validateEmail(emailInput);
  const passwordOk = validatePassword(passwordInput);
  if (!emailOk || !passwordOk) return;

  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  // UI: loading state
  setLoadingState(true, submitBtn);
  hideAlert();

  try {
    const user = await Auth.login(email, password);

    // Merge guest cart after login
    try { await Cart.mergeGuestCart(); } catch {}

    // Remember me — store flag
    if (rememberMe?.checked) {
      storage.set('remember_me', true);
    }

    showToast(`Welcome back, ${user.full_name?.split(' ')[0] || 'User'}! 👋`, 'success');

    // Brief delay for toast to show, then redirect
    setTimeout(() => {
      window.location.href = getRedirectTarget();
    }, 800);

  } catch (err) {
    const message = getErrorMessage(err.message);
    showAlert(message);
    showToast(message, 'error');

    // Clear password on auth failure
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.focus();
    }
  } finally {
    setLoadingState(false, submitBtn);
  }
}

// ── Field Validators ─────────────────────────────────────────
function validateEmail(input) {
  const val = input?.value.trim() || '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (!val) {
    setFieldError(input, 'email-error', 'Email address is required');
    return false;
  }
  if (!emailRegex.test(val)) {
    setFieldError(input, 'email-error', 'Please enter a valid email address');
    return false;
  }
  clearFieldError(input, 'email-error');
  return true;
}

function validatePassword(input) {
  const val = input?.value || '';

  if (!val) {
    setFieldError(input, 'password-error', 'Password is required');
    return false;
  }
  if (val.length < 6) {
    setFieldError(input, 'password-error', 'Password must be at least 6 characters');
    return false;
  }
  clearFieldError(input, 'password-error');
  return true;
}

// ── Field Error Helpers ───────────────────────────────────────
function setFieldError(input, errorId, message) {
  if (input) {
    input.classList.add('invalid');
    input.classList.remove('valid');
    input.setAttribute('aria-invalid', 'true');
  }
  const errEl = document.getElementById(errorId);
  if (errEl) {
    errEl.textContent = '⚠ ' + message;
    errEl.classList.add('visible');
  }
}

function clearFieldError(input, errorId) {
  if (input) {
    input.classList.remove('invalid');
    if (input.value.trim()) input.classList.add('valid');
    input.removeAttribute('aria-invalid');
  }
  const errEl = document.getElementById(errorId);
  if (errEl) {
    errEl.textContent = '';
    errEl.classList.remove('visible');
  }
}

// ── Alert helpers ─────────────────────────────────────────────
function showAlert(message, type = 'error') {
  const alert = document.getElementById('login-alert');
  const msgEl = document.getElementById('login-alert-msg');
  const iconEl = document.getElementById('login-alert-icon');
  if (!alert) return;
  if (msgEl) msgEl.textContent = message;
  if (iconEl) iconEl.textContent = type === 'error' ? '⚠️' : '✅';
  alert.className = `auth-alert ${type} visible`;
  alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  const alert = document.getElementById('login-alert');
  if (alert) alert.classList.remove('visible');
}

// ── Loading state ─────────────────────────────────────────────
function setLoadingState(loading, btn) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.classList.add('loading');
    btn.innerHTML = '<span style="animation:spin 0.6s linear infinite;display:inline-block">⟳</span> Signing in…';
  } else {
    btn.classList.remove('loading');
    btn.innerHTML = 'Sign In →';
  }
}

// ── Error message mapping ─────────────────────────────────────
function getErrorMessage(raw = '') {
  const msg = raw.toLowerCase();
  if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('incorrect') || msg.includes('wrong')) {
    return 'Invalid email or password. Please double-check and try again.';
  }
  if (msg.includes('not found') || msg.includes('no user')) {
    return 'No account found with this email. Please register first.';
  }
  if (msg.includes('too many') || msg.includes('rate limit')) {
    return 'Too many login attempts. Please wait a few minutes before trying again.';
  }
  if (msg.includes('disabled') || msg.includes('blocked') || msg.includes('banned')) {
    return 'Your account has been suspended. Please contact support.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Connection error. Please check your internet and try again.';
  }
  if (msg.includes('email') && msg.includes('verif')) {
    return 'Please verify your email address before signing in.';
  }
  return raw || 'Sign in failed. Please try again.';
}

// ── Password visibility toggle ────────────────────────────────
function initPasswordToggle() {
  const toggleBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('login-password');
  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener('click', () => {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    toggleBtn.textContent = isVisible ? '👁' : '🙈';
    toggleBtn.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    toggleBtn.title = isVisible ? 'Show password' : 'Hide password';
  });
}

// ── Social Login Buttons ──────────────────────────────────────
function initSocialButtons() {
  const googleBtn = document.getElementById('google-login-btn');
  const facebookBtn = document.getElementById('facebook-login-btn');

  googleBtn?.addEventListener('click', () => {
    showToast('Google OAuth integration coming soon!', 'info');
    // In production: window.location.href = `${API_BASE}/auth/google`;
  });

  facebookBtn?.addEventListener('click', () => {
    showToast('Facebook OAuth integration coming soon!', 'info');
    // In production: window.location.href = `${API_BASE}/auth/facebook`;
  });
}

// ── Register link: preserve redirect ─────────────────────────
function initRegisterLink() {
  const link = document.getElementById('register-link');
  if (!link) return;

  const params = getParams();
  if (params.redirect) {
    link.href = `register.html?redirect=${encodeURIComponent(params.redirect)}`;
  }
}
