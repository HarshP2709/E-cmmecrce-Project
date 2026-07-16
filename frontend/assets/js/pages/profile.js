/**
 * ShopVerse - Profile Page
 * Handles user profile display, edit, and avatar upload
 */

import {
  initPage, apiFetch, showToast, formatDate, escapeHTML, API_BASE, storage
} from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';
import { Auth, requireAuth } from '../modules/auth.js';

// ── Entry Point ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  initPage();
  await initNavbar();

  await loadProfile();
  initProfileForm();
  initPasswordForm();
  initAvatarUpload();
  initPasswordToggles();
  initLogout();
  initBioCounter();

  // Scroll to section if hash present
  const hash = window.location.hash;
  if (hash) {
    const el = document.querySelector(hash.replace('#', '#section-'));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

// ── State ─────────────────────────────────────────────────────
let originalProfile = {};

// ── Load Profile ─────────────────────────────────────────────
async function loadProfile() {
  try {
    const data = await apiFetch('/users/profile');
    const profile = data.data || data.user || data;
    originalProfile = { ...profile };
    populateForm(profile);
    updateSidebar(profile);
  } catch (err) {
    showToast('Failed to load profile. Please refresh.', 'error');
  }
}

// ── Populate Form ────────────────────────────────────────────
function populateForm(profile) {
  const fields = ['full_name', 'display_name', 'phone', 'date_of_birth', 'gender', 'bio'];
  fields.forEach(field => {
    const el = document.getElementById(field);
    if (!el) return;
    if (field === 'date_of_birth' && profile[field]) {
      el.value = profile[field].split('T')[0]; // ISO date
    } else {
      el.value = profile[field] || '';
    }
  });

  const emailEl = document.getElementById('email');
  if (emailEl) emailEl.value = profile.email || '';

  // Update bio counter
  const bio = document.getElementById('bio');
  const counter = document.getElementById('bio-char-count');
  if (bio && counter) counter.textContent = bio.value.length;

  // Update avatar
  updateAvatarDisplay(profile.avatar_url, profile.full_name);
}

// ── Update Sidebar Info ───────────────────────────────────────
function updateSidebar(profile) {
  const nameEl = document.getElementById('sidebar-name');
  const emailEl = document.getElementById('sidebar-email');
  const avatarEl = document.getElementById('sidebar-avatar');

  if (nameEl) nameEl.textContent = profile.full_name || profile.display_name || 'User';
  if (emailEl) emailEl.textContent = profile.email || '';
  if (avatarEl) {
    if (profile.avatar_url) {
      avatarEl.innerHTML = `<img src="${escapeHTML(profile.avatar_url)}" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      avatarEl.textContent = (profile.full_name?.[0] || profile.email?.[0] || '👤').toUpperCase();
    }
  }
}

// ── Update All Avatar Displays ────────────────────────────────
function updateAvatarDisplay(url, name) {
  const avatarEls = ['main-avatar', 'sidebar-avatar'];
  avatarEls.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (url) {
      el.innerHTML = `<img src="${escapeHTML(url)}" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      el.textContent = (name?.[0] || '👤').toUpperCase();
    }
  });
  // Also update navbar avatar
  const navAvatar = document.getElementById('nav-avatar');
  if (navAvatar) {
    if (url) {
      navAvatar.innerHTML = `<img src="${escapeHTML(url)}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      navAvatar.textContent = (name?.[0] || '👤').toUpperCase();
    }
  }
}

// ── Profile Form Submit ───────────────────────────────────────
function initProfileForm() {
  const form = document.getElementById('profile-form');
  const saveBtn = document.getElementById('save-profile-btn');
  const resetBtn = document.getElementById('reset-profile-btn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      full_name: form.full_name?.value.trim(),
      display_name: form.display_name?.value.trim(),
      phone: form.phone?.value.trim(),
      date_of_birth: form.date_of_birth?.value || null,
      gender: form.gender?.value || null,
      bio: form.bio?.value.trim(),
    };

    // Validate
    if (!payload.full_name) {
      showToast('Full name is required.', 'error');
      document.getElementById('full_name')?.focus();
      return;
    }

    saveBtn.classList.add('loading');
    const btnText = document.getElementById('save-btn-text');
    if (btnText) btnText.textContent = 'Saving…';

    try {
      const data = await apiFetch('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      const updated = data.data || data.user || payload;
      originalProfile = { ...originalProfile, ...payload };

      // Update stored user
      const user = Auth.getUser();
      if (user) {
        storage.set('user', { ...user, ...payload });
      }

      updateSidebar({ ...originalProfile, ...updated });
      showToast('Profile updated successfully! ✅', 'success', 'Profile Saved');
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      saveBtn.classList.remove('loading');
      if (btnText) btnText.textContent = 'Save Changes';
    }
  });

  resetBtn?.addEventListener('click', () => {
    populateForm(originalProfile);
    showToast('Changes reset.', 'info');
  });
}

// ── Password Form ─────────────────────────────────────────────
function initPasswordForm() {
  const form = document.getElementById('password-form');
  const changeBtn = document.getElementById('change-pwd-btn');
  if (!form) return;

  const newPwdInput = document.getElementById('new_password');
  const strengthBar = document.getElementById('pwd-strength');
  const bar = document.getElementById('pwd-strength-bar');
  const label = document.getElementById('pwd-strength-label');

  // Live strength indicator
  newPwdInput?.addEventListener('input', () => {
    const val = newPwdInput.value;
    if (!val) { strengthBar.style.display = 'none'; return; }

    strengthBar.style.display = 'block';
    const score = calcPasswordScore(val);
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPwd = document.getElementById('current_password')?.value;
    const newPwd = document.getElementById('new_password')?.value;
    const confirmPwd = document.getElementById('confirm_password')?.value;

    if (!currentPwd || !newPwd || !confirmPwd) {
      showToast('All password fields are required.', 'error'); return;
    }
    if (newPwd.length < 8) {
      showToast('New password must be at least 8 characters.', 'error'); return;
    }
    if (newPwd !== confirmPwd) {
      showToast('Passwords do not match.', 'error'); return;
    }

    changeBtn.classList.add('loading');
    changeBtn.textContent = 'Updating…';

    try {
      await apiFetch('/users/change-password', {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      showToast('Password changed successfully! 🔒', 'success', 'Security');
      form.reset();
      strengthBar.style.display = 'none';
    } catch (err) {
      showToast(err.message || 'Failed to change password.', 'error');
    } finally {
      changeBtn.classList.remove('loading');
      changeBtn.textContent = 'Update Password 🔒';
    }
  });
}

// ── Avatar Upload ─────────────────────────────────────────────
function initAvatarUpload() {
  const fileInput = document.getElementById('avatar-file-input');
  const editBtns = document.querySelectorAll('#main-avatar-edit-btn, #sidebar-avatar-edit-btn, #main-avatar-trigger');
  const progress = document.getElementById('avatar-upload-progress');
  const progressBar = document.getElementById('avatar-progress-bar');

  if (!fileInput) return;

  editBtns.forEach(btn => btn?.addEventListener('click', () => fileInput.click()));

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'error'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be smaller than 5MB.', 'error'); return;
    }

    // Show progress
    if (progress) progress.style.display = 'block';
    if (progressBar) progressBar.style.width = '30%';

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = storage.get('token');
      if (progressBar) progressBar.style.width = '60%';

      const res = await fetch(`${API_BASE}/users/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      });

      if (progressBar) progressBar.style.width = '90%';
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Upload failed');

      if (progressBar) progressBar.style.width = '100%';

      const avatarUrl = data.data?.avatar_url || data.avatar_url;
      updateAvatarDisplay(avatarUrl, originalProfile.full_name);

      // Update stored user
      const user = Auth.getUser();
      if (user) storage.set('user', { ...user, avatar_url: avatarUrl });
      originalProfile.avatar_url = avatarUrl;

      showToast('Profile photo updated! 📸', 'success');
    } catch (err) {
      showToast(err.message || 'Photo upload failed.', 'error');
    } finally {
      setTimeout(() => {
        if (progress) progress.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
      }, 800);
      fileInput.value = '';
    }
  });
}

// ── Password Toggles ──────────────────────────────────────────
function initPasswordToggles() {
  document.querySelectorAll('.pwd-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '🙈' : '👁';
    });
  });
}

// ── Logout Button ─────────────────────────────────────────────
function initLogout() {
  document.getElementById('profile-logout-btn')?.addEventListener('click', async () => {
    await Auth.logout();
  });
}

// ── Bio Character Counter ─────────────────────────────────────
function initBioCounter() {
  const bio = document.getElementById('bio');
  const counter = document.getElementById('bio-char-count');
  if (!bio || !counter) return;
  bio.addEventListener('input', () => {
    counter.textContent = bio.value.length;
  });
}

// ── Password Strength Score ───────────────────────────────────
function calcPasswordScore(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}
