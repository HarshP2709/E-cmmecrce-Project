/**
 * ShopVerse - Utility Functions
 * Shared utilities used across all pages
 */

export const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? (window.location.port === '5000' ? '/api/v1' : 'http://localhost:5000/api/v1')
  : '/api/v1';

// ── Storage Helpers ─────────────────────────────────────────
export const storage = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  remove: (key) => localStorage.removeItem(key),
  clear: () => localStorage.clear(),
};

// ── Toast Notifications ─────────────────────────────────────
const toastIcons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

export function showToast(message, type = 'success', title = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast-icon">${toastIcons[type] || '💬'}</span>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${escapeHTML(title)}</div>` : ''}
      <div class="toast-message">${escapeHTML(message)}</div>
    </div>
    <button class="toast-close" aria-label="Dismiss notification">✕</button>
  `;

  const close = () => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };
  toast.querySelector('.toast-close').addEventListener('click', close);
  container.appendChild(toast);
  setTimeout(close, 4500);
}

// ── API Fetch Helper ─────────────────────────────────────────
export async function apiFetch(endpoint, options = {}) {
  const token = storage.get('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        storage.remove('token');
        storage.remove('user');
        window.location.href = '/pages/login.html';
      }
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    return data;
  } catch (err) {
    if (err.message !== 'Failed to fetch') {
      throw err;
    }
    throw new Error('Network error. Please check your connection.');
  }
}

// ── Debounce ─────────────────────────────────────────────────
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ── Throttle ─────────────────────────────────────────────────
export function throttle(fn, ms = 100) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn.apply(this, args); }
  };
}

// ── Currency Formatter ───────────────────────────────────────
export function formatPrice(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Date Formatter ───────────────────────────────────────────
export function formatDate(dateStr) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(dateStr));
}

// ── Escape HTML ──────────────────────────────────────────────
export function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str ?? '')));
  return div.innerHTML;
}

// ── Star Rating HTML ─────────────────────────────────────────
export function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= full) html += '<span class="star">★</span>';
    else if (i === full + 1 && half) html += '<span class="star" style="opacity:0.6">★</span>';
    else html += '<span class="star empty">☆</span>';
  }
  return html;
}

// ── URL Params ───────────────────────────────────────────────
export function getParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}
export function setParams(params) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  });
  history.pushState({}, '', url);
}

// ── Page Loader ──────────────────────────────────────────────
export function hidePageLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.add('hidden');
    document.body.style.overflow = '';
  }
}
export function showPageLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

// ── Scroll Reveal ────────────────────────────────────────────
export function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    observer.observe(el);
  });
}

// ── Back to Top ──────────────────────────────────────────────
export function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', throttle(() => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, 100));
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── Theme Toggle ─────────────────────────────────────────────
export function initTheme() {
  const saved = storage.get('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeBtn(saved);

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      storage.set('theme', next);
      updateThemeBtn(next);
    });
  }
}
function updateThemeBtn(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── Ripple Effect ────────────────────────────────────────────
export function addRipple(btn) {
  btn.addEventListener('click', (e) => {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

// ── Format Discount ──────────────────────────────────────────
export function calcDiscount(price, comparePrice) {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round((comparePrice - price) / comparePrice * 100);
}

// ── Countdown Timer ──────────────────────────────────────────
export function startCountdown(targetDate, onTick, onEnd) {
  const tick = () => {
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) { onEnd?.(); return; }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    onTick(h, m, s);
  };
  tick();
  return setInterval(tick, 1000);
}

// ── Lazy Image Loading ───────────────────────────────────────
export function lazyLoadImages() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
}

// ── Confetti Animation ───────────────────────────────────────
export function launchConfetti(count = 60) {
  const colors = ['#6c63ff', '#ff6584', '#43e97b', '#4facfe', '#f5576c', '#fbbf24'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: -10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 2}s;
      animation-duration: ${2 + Math.random() * 2}s;
      width: ${6 + Math.random() * 10}px;
      height: ${6 + Math.random() * 10}px;
      transform: rotate(${Math.random() * 360}deg);
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }
}

// ── Truncate ─────────────────────────────────────────────────
export function truncate(str, len = 80) {
  return str?.length > len ? str.slice(0, len) + '...' : str;
}

// ── Debounced Input Handler ──────────────────────────────────
export function onInput(input, fn, ms = 350) {
  const d = debounce(fn, ms);
  input.addEventListener('input', (e) => d(e.target.value));
}

// ── Initialize page-level utilities ─────────────────────────
export function initPage() {
  hidePageLoader();
  initTheme();
  initScrollReveal();
  initBackToTop();
  document.querySelectorAll('.btn').forEach(addRipple);
}
