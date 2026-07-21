/**
 * ShopVerse - Forgot Password Page
 * Sends password reset email via API
 */

import { initPage, apiFetch, showToast, escapeHTML } from '../modules/utils.js';
import { Auth } from '../modules/auth.js';

document.addEventListener('DOMContentLoaded', () => {
  initPage();

  // Redirect already-logged-in users
  if (Auth.isLoggedIn()) {
    window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') + 'profile.html';
    return;
  }

  initForgotForm();
  initResendButton();
});

// ── State ─────────────────────────────────────────────────────
let lastEmail = '';
let resendCooldown = false;

// ── Forgot Password Form ──────────────────────────────────────
function initForgotForm() {
  const form = document.getElementById('forgot-form');
  const emailInput = document.getElementById('forgot-email');
  const submitBtn = document.getElementById('forgot-submit-btn');
  const btnText = document.getElementById('forgot-btn-text');
  const emailError = document.getElementById('forgot-email-error');

  if (!form) return;

  // Real-time validation
  emailInput?.addEventListener('input', () => {
    if (emailError) emailError.style.display = 'none';
    emailInput.classList.remove('input-error');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput?.value.trim();

    // Validate
    if (!email) {
      showFieldError(emailInput, emailError, 'Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      showFieldError(emailInput, emailError, 'Please enter a valid email address.');
      return;
    }

    lastEmail = email;
    submitBtn.classList.add('loading');
    if (btnText) btnText.textContent = 'Sending…';

    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      // Show success state
      showSuccessPanel(email);
    } catch (err) {
      // For security, show success even on "not found" to prevent email enumeration
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        showSuccessPanel(email); // Intentional
      } else {
        showToast(err.message || 'Something went wrong. Please try again.', 'error');
      }
    } finally {
      submitBtn.classList.remove('loading');
      if (btnText) btnText.textContent = 'Send Reset Link ✉️';
    }
  });
}

// ── Show Success Panel ────────────────────────────────────────
function showSuccessPanel(email) {
  const forgotPanel = document.getElementById('forgot-panel');
  const successPanel = document.getElementById('success-panel');
  const sentEmailEl = document.getElementById('sent-email');
  const backLink = document.getElementById('back-to-login-link');

  if (forgotPanel) forgotPanel.style.display = 'none';
  if (successPanel) successPanel.style.display = 'block';
  if (sentEmailEl) sentEmailEl.textContent = escapeHTML(email);
  if (backLink) backLink.style.display = 'none';
}

// ── Resend Button ─────────────────────────────────────────────
function initResendButton() {
  const resendBtn = document.getElementById('resend-btn');
  if (!resendBtn) return;

  resendBtn.addEventListener('click', async () => {
    if (resendCooldown) {
      showToast('Please wait before requesting another email.', 'warning');
      return;
    }
    if (!lastEmail) {
      // Go back to form
      const forgotPanel = document.getElementById('forgot-panel');
      const successPanel = document.getElementById('success-panel');
      if (forgotPanel) forgotPanel.style.display = 'block';
      if (successPanel) successPanel.style.display = 'none';
      return;
    }

    resendBtn.classList.add('loading');
    resendBtn.textContent = '⏳ Sending…';
    resendCooldown = true;

    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: lastEmail }),
      });
      showToast('Reset email sent again! Check your inbox.', 'success');
    } catch {
      showToast('Failed to resend. Please try again shortly.', 'error');
    } finally {
      resendBtn.classList.remove('loading');
      resendBtn.textContent = '↩️ Resend Email';

      // 60-second cooldown
      let remaining = 60;
      const timer = setInterval(() => {
        remaining--;
        resendBtn.textContent = `↩️ Resend in ${remaining}s`;
        if (remaining <= 0) {
          clearInterval(timer);
          resendBtn.textContent = '↩️ Resend Email';
          resendCooldown = false;
        }
      }, 1000);
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────
function showFieldError(input, errorEl, message) {
  if (input) input.classList.add('input-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
