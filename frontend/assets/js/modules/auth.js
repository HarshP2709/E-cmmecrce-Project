/**
 * ShopVerse - Authentication Module
 * Handles login, register, logout, session management
 */

import { storage, apiFetch, showToast } from './utils.js';

export class Auth {
  static getToken() { return storage.get('token'); }
  static getUser() { return storage.get('user'); }
  static isLoggedIn() { return !!this.getToken(); }
  static isAdmin() { return this.getUser()?.role === 'admin'; }

  static async login(email, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    storage.set('token', data.token);
    storage.set('refresh_token', data.refresh_token);
    storage.set('user', data.user);
    return data.user;
  }

  static async register(fullName, email, password, phone) {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password, phone: phone || undefined }),
    });
  }

  static async logout() {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch {}
    storage.remove('token');
    storage.remove('refresh_token');
    storage.remove('user');
    window.location.href = '/index.html';
  }

  static async forgotPassword(email) {
    return apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  static async refreshToken() {
    const refresh = storage.get('refresh_token');
    if (!refresh) return false;
    try {
      const data = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refresh }),
      });
      storage.set('token', data.token);
      storage.set('refresh_token', data.refresh_token);
      return true;
    } catch { return false; }
  }

  static async getMe() {
    const data = await apiFetch('/auth/me');
    storage.set('user', data.user);
    return data.user;
  }
}

// ── Navbar User UI ───────────────────────────────────────────
export function updateNavbarAuth() {
  const user = Auth.getUser();
  const dropdown = document.getElementById('user-dropdown');
  const nameEl = document.getElementById('nav-username');
  const avatarEl = document.getElementById('nav-avatar');
  const mobileLogin = document.getElementById('mobile-login-link');
  const mobileProfile = document.getElementById('mobile-profile-link');

  if (user) {
    if (nameEl) nameEl.textContent = user.full_name?.split(' ')[0] || 'Account';
    if (avatarEl) {
      if (user.avatar_url) {
        avatarEl.innerHTML = `<img src="${user.avatar_url}" alt="${user.full_name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        avatarEl.textContent = (user.full_name?.[0] || user.email?.[0] || '👤').toUpperCase();
      }
    }
    if (dropdown) {
      dropdown.innerHTML = `
        <div class="nav-dropdown-header">
          <div class="nav-dropdown-name">${user.full_name || 'User'}</div>
          <div class="nav-dropdown-email">${user.email}</div>
        </div>
        <div class="nav-dropdown-body">
          <a href="/pages/profile.html" class="dropdown-item"><span class="icon">👤</span> My Profile</a>
          <a href="/pages/orders.html" class="dropdown-item"><span class="icon">📦</span> My Orders</a>
          <a href="/pages/wishlist.html" class="dropdown-item"><span class="icon">🤍</span> Wishlist</a>
          <a href="/pages/profile.html#addresses" class="dropdown-item"><span class="icon">📍</span> Addresses</a>
          ${user.role === 'admin' ? '<a href="/pages/admin/dashboard.html" class="dropdown-item"><span class="icon">⚙️</span> Admin Panel</a>' : ''}
        </div>
        <div class="nav-dropdown-footer">
          <button class="dropdown-item danger w-full" id="logout-btn"><span class="icon">🚪</span> Sign Out</button>
        </div>
      `;
      document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await Auth.logout();
      });
    }
    if (mobileLogin) mobileLogin.style.display = 'none';
    if (mobileProfile) mobileProfile.style.display = 'flex';
  } else {
    if (nameEl) nameEl.textContent = 'Account';
    if (avatarEl) avatarEl.textContent = '👤';
    if (dropdown) {
      dropdown.innerHTML = `
        <div class="nav-dropdown-header">
          <div class="nav-dropdown-name">Welcome!</div>
          <div class="nav-dropdown-email">Sign in to your account</div>
        </div>
        <div class="nav-dropdown-body">
          <a href="/pages/login.html" class="dropdown-item"><span class="icon">🔐</span> Sign In</a>
          <a href="/pages/register.html" class="dropdown-item"><span class="icon">📝</span> Create Account</a>
        </div>
        <div class="nav-dropdown-footer">
          <a href="/pages/orders.html" class="dropdown-item"><span class="icon">📦</span> Track Order</a>
        </div>
      `;
    }
    if (mobileLogin) mobileLogin.style.display = 'flex';
    if (mobileProfile) mobileProfile.style.display = 'none';
  }
}

// ── User Menu Toggle ─────────────────────────────────────────
export function initUserMenu() {
  const btn = document.getElementById('user-menu-btn');
  const dropdown = document.getElementById('user-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('active');
    btn.setAttribute('aria-expanded', isOpen);
  });

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
      btn.setAttribute('aria-expanded', false);
    }
  });
}

// ── Protect Route ────────────────────────────────────────────
export function requireAuth(redirectUrl) {
  if (!Auth.isLoggedIn()) {
    const returnPath = redirectUrl || window.location.pathname + window.location.search;
    window.location.href = `/pages/login.html?redirect=${encodeURIComponent(returnPath)}`;
    return false;
  }
  return true;
}

export function requireAdmin() {
  if (!Auth.isAdmin()) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}
