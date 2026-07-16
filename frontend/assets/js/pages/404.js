/**
 * ShopVerse - 404 Page
 * Handles search redirect and floating background animations
 */

import { initPage, initTheme } from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  await initNavbar();

  initSearchForm();
  spawnFloatingIcons();

  // Log for analytics (would be real tracking in production)
  console.info('[ShopVerse] 404:', window.location.pathname);
});

// ── Search Form ───────────────────────────────────────────────
function initSearchForm() {
  const form = document.getElementById('error-search-form');
  const input = document.getElementById('error-search-input');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input?.value.trim();
    if (q) {
      window.location.href = `/pages/search.html?q=${encodeURIComponent(q)}`;
    }
  });
}

// ── Floating Background Icons ─────────────────────────────────
function spawnFloatingIcons() {
  const container = document.getElementById('floating-icons');
  if (!container) return;

  const icons = ['🛍️','📦','🛒','💳','🎁','⭐','🏷️','💰','🔥','✨','👗','💻','📱','👟','🎮','📚'];

  for (let i = 0; i < 20; i++) {
    const span = document.createElement('span');
    span.className = 'floating-icon';
    span.textContent = icons[Math.floor(Math.random() * icons.length)];
    span.style.cssText = `
      left: ${Math.random() * 100}%;
      animation-delay: ${Math.random() * 10}s;
      animation-duration: ${12 + Math.random() * 10}s;
      font-size: ${1.5 + Math.random() * 2.5}rem;
    `;
    container.appendChild(span);
  }
}
