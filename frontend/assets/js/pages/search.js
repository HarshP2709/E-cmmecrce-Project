/**
 * ShopVerse - Search Results Page
 * Full-featured search with filters, sorting, and pagination
 */

import {
  initPage, apiFetch, showToast, formatPrice, formatDate,
  escapeHTML, getParams, setParams, debounce, lazyLoadImages
} from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';
import { fetchProducts, renderProductCard, renderSkeletonCards } from '../modules/products.js';
import { Cart } from '../modules/cart.js';
import { Wishlist } from '../modules/wishlist.js';

// ── State ─────────────────────────────────────────────────────
const state = {
  query: '',
  category: '',
  brand: '',
  priceMin: '',
  priceMax: '',
  rating: '',
  discount: '',
  inStock: false,
  sort: '',
  page: 1,
  limit: 12,
  total: 0,
};

// ── Entry Point ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  await initNavbar();

  // Read initial state from URL
  const params = getParams();
  state.query    = params.q || '';
  state.category = params.category || '';
  state.brand    = params.brand || '';
  state.priceMin = params.price_min || '';
  state.priceMax = params.price_max || '';
  state.rating   = params.rating || '';
  state.sort     = params.sort || '';
  state.page     = parseInt(params.page) || 1;

  // Pre-fill search bar
  const searchInput = document.getElementById('search-query-input');
  const navSearchInput = document.getElementById('nav-search-input');
  if (searchInput) searchInput.value = state.query;
  if (navSearchInput) navSearchInput.value = state.query;

  // Update display label
  updateQueryDisplay(state.query);
  updatePageTitle(state.query);

  // Load categories and brands for filter sidebars
  await Promise.all([loadCategoryFilters(), loadBrandFilters()]);

  // Sync filter UI state from URL params
  syncFilterUI();

  // Run initial search
  await doSearch();

  // Wire up all interactions
  initSearchPageForm();
  initSortSelector();
  initViewToggle();
  initFilterGroups();
  initPriceFilter();
  initRatingFilter();
  initBrandFilter();
  initDiscountFilter();
  initInStockFilter();
  initClearFilters();
  initProductActions();
});

// ── Core Search Function ──────────────────────────────────────
async function doSearch() {
  const grid = document.getElementById('search-results-grid');
  const countLabel = document.getElementById('search-count-label');
  if (!grid) return;

  grid.innerHTML = renderSkeletonCards(state.limit > 8 ? 8 : state.limit);

  const apiParams = {
    q: state.query,
    category: state.category,
    brand: state.brand,
    price_min: state.priceMin,
    price_max: state.priceMax,
    rating: state.rating,
    discount_min: state.discount,
    in_stock: state.inStock || undefined,
    sort: state.sort,
    page: state.page,
    limit: state.limit,
  };

  // Strip empty values
  Object.keys(apiParams).forEach(k => {
    if (!apiParams[k] && apiParams[k] !== 0) delete apiParams[k];
  });

  try {
    const data = await fetchProducts(apiParams);
    const products = data.data || [];
    state.total = data.pagination?.total || products.length;

    if (countLabel) {
      if (state.query) {
        countLabel.textContent = `${state.total} result${state.total !== 1 ? 's' : ''} for "${state.query}"`;
      } else {
        countLabel.textContent = `${state.total} product${state.total !== 1 ? 's' : ''} found`;
      }
    }

    if (!products.length) {
      grid.innerHTML = renderNoResults(state.query);
    } else {
      grid.innerHTML = products.map(renderProductCard).join('');
      lazyLoadImages();
    }

    renderPagination();
    updateActiveFiltersDisplay();
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:var(--space-12);color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:var(--space-4)">⚠️</div>
        <p>Search failed. Please try again.</p>
        <button class="btn btn-primary btn-sm" onclick="doSearch()" style="margin-top:var(--space-4)">Retry</button>
      </div>
    `;
    showToast(err.message || 'Search failed.', 'error');
  }
}

// ── Render No Results ─────────────────────────────────────────
function renderNoResults(query) {
  return `
    <div style="grid-column:1/-1;text-align:center;padding:var(--space-16);color:var(--text-muted)" role="status">
      <div style="font-size:4rem;margin-bottom:var(--space-5)">🔍</div>
      <h3 style="font-size:var(--font-size-2xl);font-weight:900;color:var(--text-primary);margin-bottom:var(--space-3)">
        No results found${query ? ` for "${escapeHTML(query)}"` : ''}
      </h3>
      <p style="max-width:400px;margin:0 auto var(--space-6)">
        Try different keywords, remove some filters, or browse our categories.
      </p>
      <div style="display:flex;gap:var(--space-3);justify-content:center;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" id="clear-filters-btn-inline">Clear Filters</button>
        <a href="products.html" class="btn btn-primary btn-sm">Browse All Products</a>
      </div>
    </div>
  `;
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination() {
  const container = document.getElementById('search-pagination');
  if (!container) return;

  const totalPages = Math.ceil(state.total / state.limit);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const maxButtons = 7;
  let html = '';

  // Prev button
  if (state.page > 1) {
    html += `<button class="btn btn-ghost btn-sm" data-page="${state.page - 1}" aria-label="Previous page">← Prev</button>`;
  }

  // Page number buttons
  let start = Math.max(1, state.page - 2);
  let end = Math.min(totalPages, state.page + 2);

  if (start > 1) html += `<button class="btn btn-ghost btn-sm" data-page="1">1</button>${start > 2 ? '<span style="padding:0 4px;color:var(--text-muted)">…</span>' : ''}`;

  for (let i = start; i <= end; i++) {
    html += `<button class="btn ${i === state.page ? 'btn-primary' : 'btn-ghost'} btn-sm" data-page="${i}" ${i === state.page ? 'aria-current="page"' : ''}>${i}</button>`;
  }

  if (end < totalPages) {
    html += `${end < totalPages - 1 ? '<span style="padding:0 4px;color:var(--text-muted)">…</span>' : ''}<button class="btn btn-ghost btn-sm" data-page="${totalPages}">${totalPages}</button>`;
  }

  // Next button
  if (state.page < totalPages) {
    html += `<button class="btn btn-ghost btn-sm" data-page="${state.page + 1}" aria-label="Next page">Next →</button>`;
  }

  container.innerHTML = html;
  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.page = parseInt(btn.dataset.page);
      setParams({ page: state.page });
      doSearch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ── Search Form ───────────────────────────────────────────────
function initSearchPageForm() {
  const form = document.getElementById('search-page-form');
  const input = document.getElementById('search-query-input');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.query = input?.value.trim() || '';
    state.page = 1;
    setParams({ q: state.query, page: null });
    updateQueryDisplay(state.query);
    updatePageTitle(state.query);
    doSearch();
  });
}

// ── Sort ──────────────────────────────────────────────────────
function initSortSelector() {
  const select = document.getElementById('sort-select');
  if (!select) return;
  if (state.sort) select.value = state.sort;

  select.addEventListener('change', () => {
    state.sort = select.value;
    state.page = 1;
    setParams({ sort: state.sort, page: null });
    doSearch();
  });
}

// ── View Toggle (Grid / List) ─────────────────────────────────
function initViewToggle() {
  const gridBtn = document.getElementById('view-grid');
  const listBtn = document.getElementById('view-list');
  const grid = document.getElementById('search-results-grid');

  gridBtn?.addEventListener('click', () => {
    grid?.classList.remove('products-list-view');
    gridBtn.style.background = 'var(--bg-card)';
    listBtn.style.background = 'transparent';
    gridBtn.setAttribute('aria-pressed', 'true');
    listBtn.setAttribute('aria-pressed', 'false');
  });

  listBtn?.addEventListener('click', () => {
    grid?.classList.add('products-list-view');
    listBtn.style.background = 'var(--bg-card)';
    gridBtn.style.background = 'transparent';
    listBtn.setAttribute('aria-pressed', 'true');
    gridBtn.setAttribute('aria-pressed', 'false');
  });
}

// ── Filter Groups (accordion) ─────────────────────────────────
function initFilterGroups() {
  document.querySelectorAll('.filter-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      const icon = header.querySelector('.filter-toggle-icon');
      const isOpen = header.getAttribute('aria-expanded') === 'true';

      header.setAttribute('aria-expanded', !isOpen);
      if (body) body.style.display = isOpen ? 'none' : 'block';
      if (icon) icon.textContent = isOpen ? '▾' : '▴';
    });
  });
}

// ── Category Filters ──────────────────────────────────────────
async function loadCategoryFilters() {
  const list = document.getElementById('category-filter-list');
  if (!list) return;

  try {
    const data = await apiFetch('/categories');
    const categories = (data.data || []).filter(c => !c.parent_id);

    list.innerHTML = categories.map(cat => `
      <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--font-size-sm)">
        <input
          type="radio"
          name="category-filter"
          value="${escapeHTML(cat.slug)}"
          style="accent-color:var(--color-primary)"
          ${state.category === cat.slug ? 'checked' : ''}
          aria-label="Filter by ${escapeHTML(cat.name)}"
        >
        ${escapeHTML(cat.name)}
      </label>
    `).join('');

    list.querySelectorAll('input[name="category-filter"]').forEach(radio => {
      radio.addEventListener('change', () => {
        state.category = radio.checked ? radio.value : '';
        state.page = 1;
        setParams({ category: state.category, page: null });
        doSearch();
      });
    });
  } catch {
    list.innerHTML = '<p style="font-size:var(--font-size-xs);color:var(--text-muted)">Failed to load</p>';
  }
}

// ── Brand Filters ─────────────────────────────────────────────
async function loadBrandFilters() {
  const list = document.getElementById('brand-filter-list');
  const searchInput = document.getElementById('brand-search');
  if (!list) return;

  let allBrands = [];

  try {
    const data = await apiFetch('/brands');
    allBrands = data.data || [];
  } catch {
    // Fallback brands
    allBrands = ['Apple', 'Samsung', 'Sony', 'Nike', 'Adidas', 'OnePlus', 'Dell', 'HP', 'Boat', 'Puma']
      .map(name => ({ id: name.toLowerCase(), name, slug: name.toLowerCase() }));
  }

  const renderBrands = (brands) => {
    list.innerHTML = brands.slice(0, 15).map(brand => `
      <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--font-size-sm)">
        <input
          type="radio"
          name="brand-filter"
          value="${escapeHTML(brand.slug || brand.name)}"
          style="accent-color:var(--color-primary)"
          ${state.brand === (brand.slug || brand.name) ? 'checked' : ''}
          aria-label="Filter by ${escapeHTML(brand.name)}"
        >
        ${escapeHTML(brand.name)}
      </label>
    `).join('');

    list.querySelectorAll('input[name="brand-filter"]').forEach(radio => {
      radio.addEventListener('change', () => {
        state.brand = radio.value;
        state.page = 1;
        setParams({ brand: state.brand, page: null });
        doSearch();
      });
    });
  };

  renderBrands(allBrands);

  // Brand search
  searchInput?.addEventListener('input', debounce((e) => {
    const q = e.target.value.toLowerCase();
    renderBrands(allBrands.filter(b => b.name.toLowerCase().includes(q)));
  }, 300));
}

// ── Price Filter ──────────────────────────────────────────────
function initPriceFilter() {
  const minInput = document.getElementById('price-min');
  const maxInput = document.getElementById('price-max');
  const applyBtn = document.getElementById('apply-price-btn');

  if (minInput) minInput.value = state.priceMin;
  if (maxInput) maxInput.value = state.priceMax;

  // Preset radio buttons
  document.querySelectorAll('input[name="price-preset"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const [min, max] = radio.value.split('-');
      state.priceMin = min || '';
      state.priceMax = max || '';
      if (minInput) minInput.value = state.priceMin;
      if (maxInput) maxInput.value = state.priceMax;
      state.page = 1;
      setParams({ price_min: state.priceMin, price_max: state.priceMax, page: null });
      doSearch();
    });
  });

  applyBtn?.addEventListener('click', () => {
    state.priceMin = minInput?.value || '';
    state.priceMax = maxInput?.value || '';
    state.page = 1;
    setParams({ price_min: state.priceMin, price_max: state.priceMax, page: null });
    doSearch();
  });
}

// ── Rating Filter ─────────────────────────────────────────────
function initRatingFilter() {
  document.querySelectorAll('input[name="rating-filter"]').forEach(radio => {
    if (radio.value === state.rating) radio.checked = true;
    radio.addEventListener('change', () => {
      state.rating = radio.value;
      state.page = 1;
      setParams({ rating: state.rating, page: null });
      doSearch();
    });
  });
}

// ── Brand Search / Filter Wiring ─────────────────────────────
function initBrandFilter() {
  // Already handled inside loadBrandFilters()
}

// ── Discount Filter ───────────────────────────────────────────
function initDiscountFilter() {
  document.querySelectorAll('input[name="discount-filter"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.discount = radio.value;
      state.page = 1;
      setParams({ discount_min: state.discount, page: null });
      doSearch();
    });
  });
}

// ── In Stock ──────────────────────────────────────────────────
function initInStockFilter() {
  const checkbox = document.getElementById('in-stock-filter');
  if (!checkbox) return;
  checkbox.checked = state.inStock;
  checkbox.addEventListener('change', () => {
    state.inStock = checkbox.checked;
    state.page = 1;
    doSearch();
  });
}

// ── Clear Filters ─────────────────────────────────────────────
function initClearFilters() {
  document.getElementById('clear-filters-btn')?.addEventListener('click', clearAll);
  document.addEventListener('click', (e) => {
    if (e.target.id === 'clear-filters-btn-inline') clearAll();
  });
}

function clearAll() {
  state.category = ''; state.brand = ''; state.priceMin = '';
  state.priceMax = ''; state.rating = ''; state.discount = '';
  state.inStock = false; state.sort = ''; state.page = 1;

  // Reset form elements
  document.querySelectorAll('input[type="radio"][name]').forEach(r => r.checked = false);
  document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
  const minInput = document.getElementById('price-min');
  const maxInput = document.getElementById('price-max');
  if (minInput) minInput.value = '';
  if (maxInput) maxInput.value = '';
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = '';

  // Clear URL params
  const url = new URL(window.location.href);
  ['category', 'brand', 'price_min', 'price_max', 'rating', 'discount_min', 'sort', 'page'].forEach(k => url.searchParams.delete(k));
  history.pushState({}, '', url);

  doSearch();
}

// ── Active Filter Tags ────────────────────────────────────────
function updateActiveFiltersDisplay() {
  const container = document.getElementById('active-filters');
  const tagsEl = document.getElementById('active-filter-tags');
  if (!container || !tagsEl) return;

  const active = [];
  if (state.category) active.push({ key: 'category', label: `Category: ${state.category}` });
  if (state.brand) active.push({ key: 'brand', label: `Brand: ${state.brand}` });
  if (state.priceMin || state.priceMax) active.push({ key: 'price', label: `Price: ₹${state.priceMin || 0}–₹${state.priceMax || '∞'}` });
  if (state.rating) active.push({ key: 'rating', label: `${state.rating}+ Stars` });
  if (state.discount) active.push({ key: 'discount', label: `${state.discount}%+ Off` });

  if (!active.length) { container.style.display = 'none'; return; }

  container.style.display = 'block';
  tagsEl.innerHTML = active.map(f => `
    <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(108,99,255,0.1);color:var(--color-primary);border-radius:var(--border-radius-pill);font-size:var(--font-size-xs);font-weight:600">
      ${escapeHTML(f.label)}
      <button data-filter-key="${f.key}" style="background:none;border:none;cursor:pointer;color:inherit;font-size:0.85rem;line-height:1" aria-label="Remove ${f.label} filter">✕</button>
    </span>
  `).join('');

  tagsEl.querySelectorAll('button[data-filter-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.filterKey;
      if (key === 'category') state.category = '';
      if (key === 'brand') state.brand = '';
      if (key === 'price') { state.priceMin = ''; state.priceMax = ''; }
      if (key === 'rating') state.rating = '';
      if (key === 'discount') state.discount = '';
      state.page = 1;
      doSearch();
    });
  });
}

// ── Sync Filter UI ────────────────────────────────────────────
function syncFilterUI() {
  if (state.sort) {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = state.sort;
  }
  if (state.priceMin) {
    const minInput = document.getElementById('price-min');
    if (minInput) minInput.value = state.priceMin;
  }
  if (state.priceMax) {
    const maxInput = document.getElementById('price-max');
    if (maxInput) maxInput.value = state.priceMax;
  }
}

// ── Product Action Events ─────────────────────────────────────
function initProductActions() {
  document.addEventListener('click', async (e) => {
    // Add to Cart
    const cartBtn = e.target.closest('[data-product-id].product-card-add-btn');
    if (cartBtn && !cartBtn.disabled) {
      const productId = cartBtn.dataset.productId;
      cartBtn.classList.add('loading');
      try {
        await Cart.addItem(productId);
        cartBtn.classList.add('added');
        cartBtn.textContent = '✓ Added!';
        setTimeout(() => {
          cartBtn.classList.remove('added');
          cartBtn.innerHTML = '🛒 Add to Cart';
        }, 2000);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        cartBtn.classList.remove('loading');
      }
      return;
    }

    // Wishlist toggle
    const wishBtn = e.target.closest('.product-card-wishlist, [data-action="wishlist"]');
    if (wishBtn) {
      const productId = wishBtn.dataset.productId;
      if (!productId) return;
      try {
        const isIn = await Wishlist.toggle(productId);
        wishBtn.classList.toggle('active', isIn);
        wishBtn.textContent = isIn ? '💜' : '🤍';
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────
function updateQueryDisplay(query) {
  const el = document.getElementById('search-query-display');
  if (el) el.textContent = query ? `"${escapeHTML(query)}"` : 'All Products';
}

function updatePageTitle(query) {
  document.title = query
    ? `Search: "${query}" — ShopVerse`
    : 'Search Products — ShopVerse';

  const metaTitle = document.getElementById('search-page-title');
  if (metaTitle) metaTitle.textContent = document.title;
}
