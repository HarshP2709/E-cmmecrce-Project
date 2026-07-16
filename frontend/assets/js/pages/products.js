/**
 * ShopVerse - Products Page
 * Handles all filter, sort, pagination, and product rendering logic
 */

import {
  initPage, apiFetch, getParams, setParams,
  showToast, formatPrice, debounce, escapeHTML,
} from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';
import { fetchProducts, renderProductGrid, renderSkeletonCards } from '../modules/products.js';
import { Cart } from '../modules/cart.js';
import { Wishlist } from '../modules/wishlist.js';

// ── State ─────────────────────────────────────────────────────
let currentFilters = {};
let currentPage = 1;
const LIMIT = 20;
let isLoading = false;

// ── Entry Point ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  await initNavbar();
  loadFiltersFromURL();
  updateHeroAndBreadcrumb();
  initFilterSectionToggles();
  initMobileSidebar();
  // Load sidebar data and products concurrently
  await Promise.all([loadCategories(), loadBrands()]);
  await loadProducts();
  initFilterEvents();
  initSortEvents();
  initViewToggle();
  initProductActions();
  initPricePresets();
  initConditionFilter();
});

// ── Load Filters From URL ────────────────────────────────────
function loadFiltersFromURL() {
  const params = getParams();
  currentFilters = {
    category:    params.category    || '',
    brand:       params.brand       || '',
    min_price:   params.min_price   || '',
    max_price:   params.max_price   || '',
    rating:      params.rating      || '',
    sort:        params.sort        || 'newest',
    search:      params.search      || params.q || '',
    featured:    params.featured    || '',
    best_seller: params.best_seller || '',
    flash_sale:  params.flash_sale  || '',
    new_arrival: params.new_arrival || '',
  };
  currentPage = parseInt(params.page) || 1;

  // Reflect sort in selector
  const sortEl = document.getElementById('sort-select');
  if (sortEl) sortEl.value = currentFilters.sort;

  // Show search heading
  const searchTitle = document.getElementById('search-title');
  if (searchTitle && currentFilters.search) {
    searchTitle.innerHTML = `Results for <span>"${escapeHTML(currentFilters.search)}"</span>`;
    searchTitle.style.display = 'block';
  }

  // Reflect min/max price
  const minInput = document.getElementById('min-price');
  const maxInput = document.getElementById('max-price');
  if (minInput && currentFilters.min_price) minInput.value = currentFilters.min_price;
  if (maxInput && currentFilters.max_price) maxInput.value = currentFilters.max_price;

  // Reflect rating
  if (currentFilters.rating) {
    const radio = document.getElementById(`rating-${currentFilters.rating}`);
    if (radio) radio.checked = true;
  }
}

// ── Update page hero title based on active filters ───────────
function updateHeroAndBreadcrumb() {
  const heading = document.getElementById('hero-heading');
  const sub     = document.getElementById('hero-sub');
  const crumb   = document.getElementById('breadcrumb-current');

  const categoryMap = {
    electronics: 'Electronics',
    fashion: 'Fashion',
    'home-living': 'Home & Living',
    'sports-fitness': 'Sports & Fitness',
    'beauty-personal-care': 'Beauty & Care',
  };

  if (currentFilters.search) {
    if (heading) heading.textContent = `Search: ${currentFilters.search}`;
    if (sub) sub.textContent = 'Showing results for your search query';
    if (crumb) crumb.textContent = `Search: "${currentFilters.search}"`;
  } else if (currentFilters.category) {
    const label = categoryMap[currentFilters.category] || currentFilters.category;
    if (heading) heading.textContent = label;
    if (sub) sub.textContent = `Browse all ${label} products`;
    if (crumb) crumb.textContent = label;
  } else if (currentFilters.flash_sale === 'true') {
    if (heading) heading.textContent = '⚡ Flash Sale';
    if (sub) sub.textContent = 'Limited time deals — grab them before they\'re gone!';
    if (crumb) crumb.textContent = 'Flash Sale';
  } else if (currentFilters.best_seller === 'true') {
    if (heading) heading.textContent = '🏆 Best Sellers';
    if (sub) sub.textContent = 'Our most loved products by customers';
    if (crumb) crumb.textContent = 'Best Sellers';
  } else if (currentFilters.new_arrival === 'true') {
    if (heading) heading.textContent = '🆕 New Arrivals';
    if (sub) sub.textContent = 'Fresh products just landed on ShopVerse';
    if (crumb) crumb.textContent = 'New Arrivals';
  } else if (currentFilters.featured === 'true') {
    if (heading) heading.textContent = '✨ Featured Products';
    if (sub) sub.textContent = 'Handpicked by our team for you';
    if (crumb) crumb.textContent = 'Featured';
  }
}

// ── Load Categories ──────────────────────────────────────────
async function loadCategories() {
  const container = document.getElementById('category-filters');
  if (!container) return;
  try {
    const data = await apiFetch('/categories');
    const parents = (data.data || []).filter(c => !c.parent_id);
    if (!parents.length) {
      container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);padding:4px 0">No categories found</p>';
      return;
    }
    container.innerHTML = `
      <label class="checkbox-group">
        <div class="custom-checkbox ${!currentFilters.category ? 'checked' : ''}" data-value=""></div>
        <span class="checkbox-label">All Categories</span>
      </label>
      ${parents.map(cat => `
        <label class="checkbox-group">
          <div class="custom-checkbox ${currentFilters.category === cat.slug ? 'checked' : ''}" data-value="${escapeHTML(cat.slug)}"></div>
          <span class="checkbox-label">${escapeHTML(cat.name)}</span>
        </label>
      `).join('')}
    `;

    container.querySelectorAll('.custom-checkbox').forEach(cb => {
      cb.addEventListener('click', () => {
        const val = cb.dataset.value;
        container.querySelectorAll('.custom-checkbox').forEach(c => c.classList.remove('checked'));
        cb.classList.add('checked');
        currentFilters.category = val;
        currentPage = 1;
        updateFilterChips();
        loadProducts();
      });
    });
  } catch (err) {
    container.innerHTML = '<p style="font-size:0.8rem;color:var(--color-danger)">Failed to load categories</p>';
  }
}

// ── Load Brands ──────────────────────────────────────────────
async function loadBrands() {
  const container = document.getElementById('brand-filters');
  if (!container) return;

  // We'll use a curated list; in a full API, fetch /products/brands
  const brands = [
    { label: 'Apple', value: 'apple' },
    { label: 'Samsung', value: 'samsung' },
    { label: 'Sony', value: 'sony' },
    { label: 'Nike', value: 'nike' },
    { label: 'Adidas', value: 'adidas' },
    { label: 'OnePlus', value: 'oneplus' },
    { label: 'Dell', value: 'dell' },
    { label: 'HP', value: 'hp' },
    { label: 'boAt', value: 'boat' },
    { label: 'Puma', value: 'puma' },
  ];

  const selectedBrands = currentFilters.brand ? currentFilters.brand.split(',') : [];

  container.innerHTML = brands.map(b => `
    <label class="checkbox-group">
      <div class="custom-checkbox ${selectedBrands.includes(b.value) ? 'checked' : ''}" data-value="${b.value}"></div>
      <span class="checkbox-label">${b.label}</span>
    </label>
  `).join('');

  container.querySelectorAll('.custom-checkbox').forEach(cb => {
    cb.addEventListener('click', () => {
      cb.classList.toggle('checked');
      const checkedBrands = [...container.querySelectorAll('.custom-checkbox.checked')].map(c => c.dataset.value);
      currentFilters.brand = checkedBrands.join(',');
      currentPage = 1;
      updateFilterChips();
      loadProducts();
    });
  });
}

// ── Load Products ─────────────────────────────────────────────
async function loadProducts() {
  if (isLoading) return;
  isLoading = true;

  const grid = document.getElementById('products-grid');
  if (!grid) return;

  // Show skeletons
  grid.innerHTML = renderSkeletonCards(LIMIT > 12 ? 12 : LIMIT);

  try {
    // Build clean params (omit falsy values)
    const rawParams = { ...currentFilters, page: currentPage, limit: LIMIT };
    const params = {};
    Object.entries(rawParams).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params[k] = v;
    });

    const data = await fetchProducts(params);
    const products = data.data || [];
    const pagination = data.pagination || {};

    renderProductGrid(products, grid, 'No products found matching your filters.');
    updateCount(pagination.total || products.length);
    renderPagination(pagination);
    updateURL();
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to load products</h3>
        <p>${escapeHTML(err.message)}</p>
        <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
      </div>
    `;
  } finally {
    isLoading = false;
  }
}

// ── Update product count display ─────────────────────────────
function updateCount(total) {
  const el = document.getElementById('product-count');
  if (el) {
    el.innerHTML = total > 0
      ? `${total.toLocaleString('en-IN')} products found`
      : 'No products found';
  }
}

// ── Apply filters (reset to page 1 then reload) ──────────────
function applyFilters() {
  currentPage = 1;
  updateFilterChips();
  loadProducts();
}

// ── Sync URL with current state ──────────────────────────────
function updateURL() {
  const params = { ...currentFilters };
  if (currentPage > 1) params.page = currentPage;

  // Remove empty keys
  Object.keys(params).forEach(k => {
    if (params[k] === null || params[k] === undefined || params[k] === '') delete params[k];
  });

  const url = new URL(window.location.href);
  url.search = new URLSearchParams(params).toString();
  history.replaceState({ page: currentPage }, '', url);
}

// ── Active filter chips ──────────────────────────────────────
function updateFilterChips() {
  const container = document.getElementById('filter-chips');
  if (!container) return;

  const chips = [];

  if (currentFilters.category) {
    chips.push({ key: 'category', label: `Category: ${currentFilters.category}` });
  }
  if (currentFilters.brand) {
    currentFilters.brand.split(',').forEach(b => chips.push({ key: 'brand_' + b, label: `Brand: ${b}`, remove: () => removeBrand(b) }));
  }
  if (currentFilters.min_price || currentFilters.max_price) {
    const from = currentFilters.min_price ? `₹${Number(currentFilters.min_price).toLocaleString('en-IN')}` : '₹0';
    const to   = currentFilters.max_price ? `₹${Number(currentFilters.max_price).toLocaleString('en-IN')}` : 'Any';
    chips.push({ key: 'price', label: `Price: ${from} – ${to}` });
  }
  if (currentFilters.rating) chips.push({ key: 'rating', label: `${currentFilters.rating}★ & above` });
  if (currentFilters.search) chips.push({ key: 'search', label: `Search: "${currentFilters.search}"` });
  if (currentFilters.flash_sale === 'true') chips.push({ key: 'flash_sale', label: '⚡ Flash Sale' });
  if (currentFilters.featured === 'true') chips.push({ key: 'featured', label: '✨ Featured' });
  if (currentFilters.best_seller === 'true') chips.push({ key: 'best_seller', label: '🏆 Best Sellers' });
  if (currentFilters.new_arrival === 'true') chips.push({ key: 'new_arrival', label: '🆕 New Arrivals' });

  if (!chips.length) { container.innerHTML = ''; return; }

  container.innerHTML = chips.map(chip => `
    <div class="filter-chip" data-chip-key="${chip.key}">
      ${escapeHTML(chip.label)}
      <button class="filter-chip-remove" aria-label="Remove filter ${chip.label}">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.filter-chip').forEach(chipEl => {
    chipEl.querySelector('.filter-chip-remove').addEventListener('click', () => {
      removeChip(chipEl.dataset.chipKey);
    });
  });
}

function removeBrand(brandVal) {
  const brands = currentFilters.brand ? currentFilters.brand.split(',').filter(b => b !== brandVal) : [];
  currentFilters.brand = brands.join(',');
  // Uncheck visually
  const container = document.getElementById('brand-filters');
  container?.querySelectorAll(`.custom-checkbox[data-value="${brandVal}"]`).forEach(cb => cb.classList.remove('checked'));
  applyFilters();
}

function removeChip(key) {
  if (key === 'category') {
    currentFilters.category = '';
    document.getElementById('category-filters')?.querySelectorAll('.custom-checkbox').forEach((cb, i) => {
      cb.classList.toggle('checked', i === 0); // re-select "All"
    });
  } else if (key.startsWith('brand_')) {
    const brand = key.replace('brand_', '');
    removeBrand(brand);
    return;
  } else if (key === 'price') {
    currentFilters.min_price = '';
    currentFilters.max_price = '';
    const minEl = document.getElementById('min-price');
    const maxEl = document.getElementById('max-price');
    if (minEl) minEl.value = '';
    if (maxEl) maxEl.value = '';
  } else if (key === 'rating') {
    currentFilters.rating = '';
    document.querySelectorAll('[name="rating-filter"]').forEach(r => r.checked = false);
    const allRadio = document.getElementById('rating-all');
    if (allRadio) allRadio.checked = true;
  } else {
    currentFilters[key] = '';
  }
  applyFilters();
}

// ── Pagination ───────────────────────────────────────────────
function renderPagination({ page, pages, total } = {}) {
  const container = document.getElementById('pagination');
  if (!container) return;
  if (!pages || pages <= 1) { container.innerHTML = ''; return; }

  const items = [];

  // Prev button
  items.push(`
    <button class="page-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}" aria-label="Previous page">
      ← Prev
    </button>
  `);

  // Page numbers with ellipsis
  for (let i = 1; i <= pages; i++) {
    const show = (i === 1 || i === pages || (i >= page - 2 && i <= page + 2));
    const ellipsisBefore = (i === page - 3 && i > 2);
    const ellipsisAfter  = (i === page + 3 && i < pages - 1);
    if (ellipsisBefore || ellipsisAfter) {
      items.push(`<span class="page-btn" style="pointer-events:none;opacity:0.4">…</span>`);
    }
    if (show) {
      items.push(`
        <button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}" aria-label="Page ${i}" ${i === page ? 'aria-current="page"' : ''}>
          ${i}
        </button>
      `);
    }
  }

  // Next button
  items.push(`
    <button class="page-btn" ${page >= pages ? 'disabled' : ''} data-page="${page + 1}" aria-label="Next page">
      Next →
    </button>
  `);

  container.innerHTML = items.join('');

  container.querySelectorAll('[data-page]').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        loadProducts();
        // Smooth scroll to top of products area
        document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });
}

// ── Filter Events ────────────────────────────────────────────
function initFilterEvents() {
  // Price apply button
  document.getElementById('apply-price')?.addEventListener('click', () => {
    const minVal = document.getElementById('min-price')?.value.trim();
    const maxVal = document.getElementById('max-price')?.value.trim();
    currentFilters.min_price = minVal;
    currentFilters.max_price = maxVal;
    applyFilters();
  });

  // Allow Enter key on price inputs
  ['min-price', 'max-price'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('apply-price')?.click();
    });
  });

  // Rating filter
  document.querySelectorAll('[name="rating-filter"]').forEach(radio => {
    radio.addEventListener('change', () => {
      currentFilters.rating = radio.value;
      applyFilters();
    });
  });

  // Clear all filters
  document.getElementById('clear-filters')?.addEventListener('click', () => {
    // Reset state
    currentFilters = { sort: currentFilters.sort };
    currentPage = 1;

    // Reset price inputs
    const minEl = document.getElementById('min-price');
    const maxEl = document.getElementById('max-price');
    if (minEl) minEl.value = '';
    if (maxEl) maxEl.value = '';

    // Uncheck all checkboxes & select "All Categories"
    document.querySelectorAll('#category-filters .custom-checkbox').forEach((cb, i) => {
      cb.classList.toggle('checked', i === 0);
    });
    document.querySelectorAll('#brand-filters .custom-checkbox').forEach(cb => cb.classList.remove('checked'));

    // Reset radios
    document.querySelectorAll('[name="rating-filter"]').forEach(r => r.checked = false);
    const allRating = document.getElementById('rating-all');
    if (allRating) allRating.checked = true;

    document.querySelectorAll('[name="condition-filter"]').forEach(r => r.checked = false);
    const allCond = document.getElementById('cond-all');
    if (allCond) allCond.checked = true;

    updateFilterChips();
    loadProducts();
  });
}

// ── Sort Events ──────────────────────────────────────────────
function initSortEvents() {
  const sortSelect = document.getElementById('sort-select');
  sortSelect?.addEventListener('change', () => {
    currentFilters.sort = sortSelect.value;
    currentPage = 1;
    loadProducts();
  });
}

// ── View Toggle ──────────────────────────────────────────────
function initViewToggle() {
  const gridBtn = document.getElementById('view-grid');
  const listBtn = document.getElementById('view-list');
  const grid = document.getElementById('products-grid');

  gridBtn?.addEventListener('click', () => {
    grid?.classList.remove('product-list-view');
    gridBtn.classList.add('active');
    listBtn?.classList.remove('active');
  });
  listBtn?.addEventListener('click', () => {
    grid?.classList.add('product-list-view');
    listBtn.classList.add('active');
    gridBtn?.classList.remove('active');
  });
}

// ── Product Action Delegation ────────────────────────────────
function initProductActions() {
  document.addEventListener('click', async (e) => {
    // Add to Cart
    const cartBtn = e.target.closest('.product-card-add-btn[data-product-id]');
    if (cartBtn && !cartBtn.disabled) {
      const original = cartBtn.innerHTML;
      cartBtn.disabled = true;
      cartBtn.innerHTML = '<span style="animation:spin 0.6s linear infinite;display:inline-block">⟳</span> Adding…';
      try {
        await Cart.addItem(cartBtn.dataset.productId);
        cartBtn.classList.add('added');
        cartBtn.innerHTML = '✓ Added to Cart!';
        setTimeout(() => {
          cartBtn.classList.remove('added');
          cartBtn.innerHTML = original;
          cartBtn.disabled = false;
        }, 2200);
      } catch (err) {
        showToast(err.message || 'Failed to add to cart', 'error');
        cartBtn.innerHTML = original;
        cartBtn.disabled = false;
      }
      return;
    }

    // Wishlist toggle
    const wishBtn = e.target.closest('.product-card-wishlist[data-product-id], .product-card-quick-btn[data-action="wishlist"][data-product-id]');
    if (wishBtn) {
      try {
        const isIn = await Wishlist.toggle(wishBtn.dataset.productId);
        wishBtn.textContent = isIn ? '💜' : '🤍';
        wishBtn.classList.toggle('active', isIn);
      } catch (err) {
        showToast(err.message || 'Please sign in to use wishlist', 'error');
      }
      return;
    }
  });
}

// ── Price Presets ────────────────────────────────────────────
function initPricePresets() {
  document.querySelectorAll('[data-min][data-max]').forEach(btn => {
    btn.addEventListener('click', () => {
      const minEl = document.getElementById('min-price');
      const maxEl = document.getElementById('max-price');
      if (minEl) minEl.value = btn.dataset.min;
      if (maxEl) maxEl.value = btn.dataset.max;
      currentFilters.min_price = btn.dataset.min;
      currentFilters.max_price = btn.dataset.max;
      applyFilters();
    });
  });
}

// ── Condition Filter ──────────────────────────────────────────
function initConditionFilter() {
  document.querySelectorAll('[name="condition-filter"]').forEach(radio => {
    radio.addEventListener('change', () => {
      // Clear all condition-related flags first
      currentFilters.new_arrival  = '';
      currentFilters.flash_sale   = '';
      currentFilters.best_seller  = '';
      currentFilters.featured     = '';

      switch (radio.value) {
        case 'new':        currentFilters.new_arrival = 'true';  break;
        case 'sale':       currentFilters.flash_sale  = 'true';  break;
        case 'best_seller': currentFilters.best_seller = 'true'; break;
      }
      applyFilters();
    });
  });
}

// ── Filter Section Accordion Toggles ────────────────────────
function initFilterSectionToggles() {
  document.querySelectorAll('.filter-section-title[data-target]').forEach(title => {
    title.addEventListener('click', () => {
      const target = document.getElementById(title.dataset.target);
      if (!target) return;
      const isCollapsed = target.classList.contains('collapsed');
      target.classList.toggle('collapsed', !isCollapsed);
      title.classList.toggle('collapsed', !isCollapsed);
    });

    // Keyboard support
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        title.click();
      }
    });
  });
}

// ── Mobile Sidebar ────────────────────────────────────────────
function initMobileSidebar() {
  const sidebar = document.getElementById('filter-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('filter-toggle-btn');
  const closeBtn = document.getElementById('filter-close-btn');
  const closeBannerEl = document.getElementById('filter-sidebar-close');

  // Show close header on mobile (handled via CSS display:none on desktop)
  const checkMobile = () => {
    const isMobile = window.innerWidth <= 1024;
    if (closeBannerEl) closeBannerEl.style.display = isMobile ? 'flex' : 'none';
  };
  checkMobile();
  window.addEventListener('resize', checkMobile);

  const open = () => {
    sidebar?.classList.add('open');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  };

  toggleBtn?.addEventListener('click', open);
  overlay?.addEventListener('click', close);
  closeBtn?.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}
