/**
 * ShopVerse - Register Page
 * Handles registration form with validation, password strength, and redirect
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
  initPasswordToggles();
  initPasswordStrength();
  initSocialButtons();
  initLoginLink();
});

// ── Redirect if already authenticated ────────────────────────
function checkAlreadyLoggedIn() {
  if (Auth.isLoggedIn()) {
    window.location.href = getRedirectTarget();
  }
}

// ── Theme (no full navbar on auth page) ──────────────────────
function initTheme() {
  const saved = storage.get('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

// ── Redirect target ───────────────────────────────────────────
function getRedirectTarget() {
  const params = getParams();
  const redirect = params.redirect || params.next || '';
  if (redirect && !redirect.startsWith('http')) return redirect;
  return '../index.html';
}

// ── Form Initialization ───────────────────────────────────────
function initForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  const nameInput = document.getElementById('reg-name');
  const emailInput = document.getElementById('reg-email');
  const phoneInput = document.getElementById('reg-phone');
  const passwordInput = document.getElementById('reg-password');
  const confirmInput = document.getElementById('reg-confirm');
  const termsInput = document.getElementById('reg-terms');

  // Live validation on blur
  nameInput?.addEventListener('blur', () => validateName(nameInput));
  emailInput?.addEventListener('blur', () => validateEmail(emailInput));
  phoneInput?.addEventListener('blur', () => validatePhone(phoneInput));
  passwordInput?.addEventListener('blur', () => validatePassword(passwordInput));
  confirmInput?.addEventListener('blur', () => validateConfirm(passwordInput, confirmInput));

  // Clear error on input
  nameInput?.addEventListener('input', () => clearFieldError(nameInput, 'name-error'));
  emailInput?.addEventListener('input', () => clearFieldError(emailInput, 'email-error'));
  phoneInput?.addEventListener('input', () => clearFieldError(phoneInput, 'phone-error'));
  passwordInput?.addEventListener('input', () => {
    clearFieldError(passwordInput, 'password-error');
    // Re-check confirm match if confirm has a value
    if (confirmInput?.value) validateConfirm(passwordInput, confirmInput);
  });
  confirmInput?.addEventListener('input', () => validateConfirm(passwordInput, confirmInput));
  termsInput?.addEventListener('change', () => {
    clearFieldError(null, 'terms-error');
  });

  form.addEventListener('submit', handleSubmit);
}

// ── Form Submit ───────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('reg-name');
  const emailInput = document.getElementById('reg-email');
  const phoneInput = document.getElementById('reg-phone');
  const passwordInput = document.getElementById('reg-password');
  const confirmInput = document.getElementById('reg-confirm');
  const termsInput = document.getElementById('reg-terms');
  const submitBtn = document.getElementById('register-btn');

  // Validate everything
  const nameOk = validateName(nameInput);
  const emailOk = validateEmail(emailInput);
  const phoneOk = validatePhone(phoneInput);
  const passOk = validatePassword(passwordInput);
  const confirmOk = validateConfirm(passwordInput, confirmInput);
  const termsOk = validateTerms(termsInput);

  if (!nameOk || !emailOk || !phoneOk || !passOk || !confirmOk || !termsOk) {
    // Focus the first invalid field
    const firstInvalid = document.querySelector('.form-control.invalid');
    firstInvalid?.focus();
    return;
  }

  const fullName = nameInput.value.trim();
  const email    = emailInput.value.trim().toLowerCase();
  const phone    = phoneInput.value.trim();
  const password = passwordInput.value;

  // Loading state
  setLoadingState(true, submitBtn);
  hideAlert();

  try {
    await Auth.register(fullName, email, password, phone);

    // Auto-login after successful registration
    try {
      await Auth.login(email, password);
      await Cart.mergeGuestCart();
    } catch {
      // Login failed — still redirect to login with success message
      storage.set('register_success', true);
      window.location.href = `login.html?registered=1&redirect=${encodeURIComponent(getRedirectTarget())}`;
      return;
    }

    showToast(`Welcome to ShopVerse, ${fullName.split(' ')[0]}! 🎉`, 'success');
    showAlert('Account created successfully! Redirecting…', 'success');

    setTimeout(() => {
      window.location.href = getRedirectTarget();
    }, 1200);

  } catch (err) {
    const message = getErrorMessage(err.message);
    showAlert(message);
    showToast(message, 'error');
  } finally {
    setLoadingState(false, submitBtn);
  }
}

// ── Validators ────────────────────────────────────────────────
function validateName(input) {
  const val = input?.value.trim() || '';
  if (!val) {
    setFieldError(input, 'name-error', 'Full name is required');
    return false;
  }
  if (val.length < 2) {
    setFieldError(input, 'name-error', 'Name must be at least 2 characters');
    return false;
  }
  if (val.length > 100) {
    setFieldError(input, 'name-error', 'Name is too long (max 100 characters)');
    return false;
  }
  if (!/^[a-zA-Z\s'-]+$/.test(val)) {
    setFieldError(input, 'name-error', 'Name can only contain letters, spaces, hyphens, and apostrophes');
    return false;
  }
  clearFieldError(input, 'name-error');
  return true;
}

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

function validatePhone(input) {
  const val = input?.value.trim() || '';
  if (!val) {
    setFieldError(input, 'phone-error', 'Phone number is required');
    return false;
  }
  const phoneRegex = /^[+]?[0-9\s\-]{7,15}$/;
  if (!phoneRegex.test(val)) {
    setFieldError(input, 'phone-error', 'Please enter a valid phone number');
    return false;
  }
  clearFieldError(input, 'phone-error');
  return true;
}

function validatePassword(input) {
  const val = input?.value || '';
  if (!val) {
    setFieldError(input, 'password-error', 'Password is required');
    return false;
  }
  if (val.length < 8) {
    setFieldError(input, 'password-error', 'Password must be at least 8 characters');
    return false;
  }
  if (!/[A-Z]/.test(val)) {
    setFieldError(input, 'password-error', 'Password must contain at least one uppercase letter');
    return false;
  }
  if (!/[a-z]/.test(val)) {
    setFieldError(input, 'password-error', 'Password must contain at least one lowercase letter');
    return false;
  }
  if (!/[0-9]/.test(val)) {
    setFieldError(input, 'password-error', 'Password must contain at least one number');
    return false;
  }
  if (!/[^A-Za-z0-9]/.test(val)) {
    setFieldError(input, 'password-error', 'Password must contain at least one special character (e.g. @#$!%&*)');
    return false;
  }
  clearFieldError(input, 'password-error');
  return true;
}

function validateConfirm(passwordInput, confirmInput) {
  const pass = passwordInput?.value || '';
  const confirm = confirmInput?.value || '';
  if (!confirm) {
    setFieldError(confirmInput, 'confirm-error', 'Please confirm your password');
    return false;
  }
  if (pass !== confirm) {
    setFieldError(confirmInput, 'confirm-error', 'Passwords do not match');
    return false;
  }
  clearFieldError(confirmInput, 'confirm-error');
  return true;
}

function validateTerms(input) {
  if (!input?.checked) {
    setFieldError(null, 'terms-error', 'You must agree to the Terms of Service to continue');
    const errEl = document.getElementById('terms-error');
    if (errEl) errEl.classList.add('visible');
    return false;
  }
  const errEl = document.getElementById('terms-error');
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
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
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
}

// ── Alert helpers ─────────────────────────────────────────────
function showAlert(message, type = 'error') {
  const alert = document.getElementById('register-alert');
  const msgEl = document.getElementById('register-alert-msg');
  const iconEl = document.getElementById('register-alert-icon');
  if (!alert) return;
  if (msgEl) msgEl.textContent = message;
  if (iconEl) iconEl.textContent = type === 'error' ? '⚠️' : '✅';
  alert.className = `auth-alert ${type} visible`;
  alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  const alert = document.getElementById('register-alert');
  if (alert) alert.classList.remove('visible');
}

// ── Loading state ─────────────────────────────────────────────
function setLoadingState(loading, btn) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.classList.add('loading');
    btn.innerHTML = '<span style="animation:spin 0.6s linear infinite;display:inline-block">⟳</span> Creating Account…';
  } else {
    btn.classList.remove('loading');
    btn.innerHTML = 'Create My Account →';
  }
}

// ── Password score calculator ─────────────────────────────────
function getPasswordScore(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

// ── Password Strength Meter ───────────────────────────────────
function initPasswordStrength() {
  const input = document.getElementById('reg-password');
  const wrap = document.getElementById('pw-strength-wrap');
  const bars = [
    document.getElementById('sb-1'),
    document.getElementById('sb-2'),
    document.getElementById('sb-3'),
    document.getElementById('sb-4'),
  ];
  const label = document.getElementById('password-strength-label');

  const reqs = {
    len: { el: document.getElementById('req-len'), test: (v) => v.length >= 8 },
    upperlower: { el: document.getElementById('req-upperlower'), test: (v) => /[A-Z]/.test(v) && /[a-z]/.test(v) },
    num: { el: document.getElementById('req-num'), test: (v) => /[0-9]/.test(v) },
    special: { el: document.getElementById('req-special'), test: (v) => /[^A-Za-z0-9]/.test(v) },
  };

  if (!input || !wrap) return;

  const levels = [
    { label: 'Very Weak', cls: 'weak', fill: 1, color: 'var(--color-danger)' },
    { label: 'Weak', cls: 'weak', fill: 1, color: 'var(--color-danger)' },
    { label: 'Fair', cls: 'fair', fill: 2, color: 'var(--color-warning)' },
    { label: 'Good', cls: 'good', fill: 3, color: 'var(--color-info)' },
    { label: 'Strong', cls: 'strong', fill: 4, color: 'var(--color-success)' },
    { label: 'Very Strong', cls: 'strong', fill: 4, color: 'var(--color-success)' },
  ];

  input.addEventListener('input', () => {
    const val = input.value;

    if (!val) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = 'block';

    const score = Math.min(getPasswordScore(val), 5);
    const level = levels[score];

    // Update bars
    bars.forEach((bar, i) => {
      bar.className = 'strength-bar';
      if (i < level.fill) bar.classList.add(level.cls);
    });

    // Update label
    if (label) {
      label.textContent = level.label;
      label.className = `strength-label ${level.cls}`;
    }

    // Update requirements
    Object.values(reqs).forEach(({ el, test }) => {
      el?.classList.toggle('met', test(val));
    });
  });
}

// ── Password Visibility Toggles ───────────────────────────────
function initPasswordToggles() {
  const pairs = [
    { toggleId: 'toggle-password', inputId: 'reg-password' },
    { toggleId: 'toggle-confirm', inputId: 'reg-confirm' },
  ];

  pairs.forEach(({ toggleId, inputId }) => {
    const btn = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', () => {
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      btn.textContent = isVisible ? '👁' : '🙈';
      btn.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    });
  });
}

// ── Social Signup Buttons ─────────────────────────────────────
function initSocialButtons() {
  document.getElementById('google-signup-btn')?.addEventListener('click', () => {
    showToast('Google OAuth integration coming soon!', 'info');
  });
  document.getElementById('facebook-signup-btn')?.addEventListener('click', () => {
    showToast('Facebook OAuth integration coming soon!', 'info');
  });
}

// ── Login link with redirect preservation ────────────────────
function initLoginLink() {
  const link = document.getElementById('login-link');
  if (!link) return;
  const params = getParams();
  if (params.redirect) {
    link.href = `login.html?redirect=${encodeURIComponent(params.redirect)}`;
  }
}

// ── Error message mapping ─────────────────────────────────────
function getErrorMessage(raw = '') {
  const msg = raw.toLowerCase();
  if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate') || msg.includes('taken')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('invalid email') || msg.includes('email format')) {
    return 'Please provide a valid email address.';
  }
  if (msg.includes('password') && (msg.includes('weak') || msg.includes('strength'))) {
    return 'Password is too weak. Use at least 8 characters with uppercase, lowercase, a number, and a special character (e.g. Hello@123).';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  // Show the real server error — do NOT mask it as "Connection error"
  return raw || 'Registration failed. Please try again.';
}
