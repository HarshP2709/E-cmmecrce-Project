/**
 * ShopVerse - Navbar Module
 * Handles nav behavior, mega menu, mobile menu, search
 */

import { debounce, apiFetch, escapeHTML } from './utils.js';
import { updateNavbarAuth, initUserMenu } from './auth.js';
import { initCartBadge } from './cart.js';
import { Wishlist } from './wishlist.js';

export async function initNavbar() {
  updateNavbarAuth();
  initUserMenu();
  initMobileMenu();
  initMegaMenu();
  initNavSearch();
  initScrollEffect();
  await Promise.all([initCartBadge(), Wishlist.updateBadge()]);
}

// ── Scroll Effect ────────────────────────────────────────────
function initScrollEffect() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ── Mobile Menu ──────────────────────────────────────────────
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-overlay');
  const closeBtn = document.getElementById('mobile-close-btn');

  const open = () => {
    mobileMenu?.classList.add('open');
    hamburger?.classList.add('open');
    hamburger?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    mobileMenu?.classList.remove('open');
    hamburger?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  hamburger?.addEventListener('click', () => {
    if (mobileMenu?.classList.contains('open')) close();
    else open();
  });
  overlay?.addEventListener('click', close);
  closeBtn?.addEventListener('click', close);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

// ── Mega Menu ────────────────────────────────────────────────
async function initMegaMenu() {
  const trigger = document.getElementById('mega-menu-trigger');
  const menu = document.getElementById('mega-menu');
  const grid = document.getElementById('mega-menu-grid');

  if (!trigger || !menu) return;

  let loaded = false;

  const loadCategories = async () => {
    if (loaded) return;
    try {
      const data = await apiFetch('/categories');
      if (!grid) return;
      const parents = data.data?.filter(c => !c.parent_id) || [];
      grid.innerHTML = parents.slice(0, 4).map(cat => `
        <div>
          <div class="mega-menu-col-title">${escapeHTML(cat.name)}</div>
          <div class="mega-menu-items">
            <a href="/pages/products.html?category=${cat.slug}" class="mega-menu-item">→ All ${escapeHTML(cat.name)}</a>
            ${(data.data?.filter(c => c.parent_id === cat.id) || []).slice(0, 5).map(sub =>
              `<a href="/pages/products.html?category=${sub.slug}" class="mega-menu-item">${escapeHTML(sub.name)}</a>`
            ).join('')}
          </div>
        </div>
      `).join('');
      loaded = true;
    } catch {}
  };

  trigger.addEventListener('click', async (e) => {
    e.stopPropagation();
    await loadCategories();
    const isOpen = menu.classList.toggle('active');
    trigger.setAttribute('aria-expanded', isOpen);
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== trigger) {
      menu.classList.remove('active');
      trigger.setAttribute('aria-expanded', false);
    }
  });
}

// ── Search ───────────────────────────────────────────────────
function initNavSearch() {
  const input = document.getElementById('nav-search-input');
  const dropdown = document.getElementById('search-dropdown');
  const searchBtn = document.getElementById('nav-search-btn');

  if (!input) return;

  const getSuggestions = debounce(async (query) => {
    if (query.length < 2) { dropdown?.classList.remove('active'); return; }
    try {
      const data = await apiFetch(`/search/suggestions?q=${encodeURIComponent(query)}`);
      if (!dropdown || !data.data?.length) { dropdown?.classList.remove('active'); return; }

      dropdown.innerHTML = data.data.map(item => `
        <div class="search-suggestion" data-slug="${item.slug}">
          <span class="search-suggestion-icon">🔍</span>
          <span class="search-suggestion-text">${escapeHTML(item.name).replace(new RegExp(`(${query})`, 'gi'), '<em>$1</em>')}</span>
        </div>
      `).join('');

      dropdown.classList.add('active');

      dropdown.querySelectorAll('.search-suggestion').forEach(item => {
        item.addEventListener('click', () => {
          window.location.href = `/pages/product-detail.html?slug=${item.dataset.slug}`;
        });
      });
    } catch {}
  }, 350);

  input.addEventListener('input', (e) => getSuggestions(e.target.value));
  input.addEventListener('focus', (e) => { if (e.target.value.length >= 2) getSuggestions(e.target.value); });

  const doSearch = () => {
    const q = input.value.trim();
    if (q) window.location.href = `/pages/search.html?q=${encodeURIComponent(q)}`;
  };

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  searchBtn?.addEventListener('click', doSearch);

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown?.contains(e.target)) {
      dropdown?.classList.remove('active');
    }
  });
}
