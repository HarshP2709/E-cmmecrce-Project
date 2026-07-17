/**
 * ShopVerse - Products Module
 * Product rendering and API calls
 */

import { apiFetch, formatPrice, renderStars, escapeHTML, calcDiscount } from './utils.js';

// ── Fetch Products ───────────────────────────────────────────
export async function fetchProducts(params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
  return apiFetch(`/products?${query}`);
}

export async function fetchProductBySlug(slug) {
  return apiFetch(`/products/${slug}`);
}

export async function fetchCategories() {
  return apiFetch('/categories');
}

// ── Render Product Card ──────────────────────────────────────
export function renderProductCard(product) {
  const img = product.primary_image || 'assets/images/placeholder.webp';
  const discount = calcDiscount(product.price, product.compare_price);
  const inStock = (product.available_quantity || product.stock_quantity || 0) > 0;
  const isNew = product.is_new_arrival;
  const isSale = discount > 0;
  const isBestSeller = product.is_best_seller;

  return `
    <article class="product-card" data-product-id="${product.id}" data-slug="${product.slug}">
      <div class="product-card-img-wrap">
        <img
          data-src="${escapeHTML(img)}"
          src="/assets/images/placeholder.webp"
          alt="${escapeHTML(product.name)}"
          class="product-card-img"
          loading="lazy"
          onerror="this.onerror=null; this.src='/assets/images/placeholder.webp';"
        >
        ${!inStock ? '<div class="product-card-badges"><span class="card-badge card-badge-out">Out of Stock</span></div>' :
      (isNew || isSale || isBestSeller) ? `
          <div class="product-card-badges">
            ${isNew ? '<span class="card-badge card-badge-new">New</span>' : ''}
            ${isSale ? `<span class="card-badge card-badge-sale">${discount}% Off</span>` : ''}
            ${isBestSeller ? '<span class="card-badge card-badge-bestseller">Bestseller</span>' : ''}
          </div>` : ''}

        <button
          class="product-card-wishlist"
          data-product-id="${product.id}"
          aria-label="Add ${escapeHTML(product.name)} to wishlist"
          title="Add to wishlist"
        >🤍</button>

        <div class="product-card-overlay">
          <button class="product-card-quick-btn" data-action="quick-view" data-slug="${product.slug}" title="Quick view" aria-label="Quick view">👁</button>
          <button class="product-card-quick-btn wishlist" data-action="wishlist" data-product-id="${product.id}" title="Wishlist" aria-label="Add to wishlist">🤍</button>
          <button class="product-card-quick-btn" data-action="compare" title="Compare" aria-label="Compare">⚖</button>
        </div>
      </div>

      <div class="product-card-body" role="button" tabindex="0" onclick="window.location.href='/pages/product-detail.html?slug=${product.slug}'" onkeydown="if(event.key==='Enter')window.location.href='/pages/product-detail.html?slug=${product.slug}'">
        ${product.brand_name ? `<div class="product-card-brand">${escapeHTML(product.brand_name)}</div>` : ''}
        <h3 class="product-card-name">${escapeHTML(product.name)}</h3>
        <div class="product-card-rating" aria-label="${product.avg_rating} out of 5 stars (${product.review_count} reviews)">
          <div class="stars">${renderStars(parseFloat(product.avg_rating) || 0)}</div>
          <span class="count">(${product.review_count || 0})</span>
        </div>
        <div class="product-card-price-row">
          <span class="product-card-price">${formatPrice(product.price)}</span>
          ${product.compare_price > product.price ? `
            <span class="product-card-original">${formatPrice(product.compare_price)}</span>
            <span class="product-card-discount">${discount}% off</span>
          ` : ''}
        </div>
      </div>

      <div class="product-card-footer">
        <button
          class="product-card-add-btn"
          data-product-id="${product.id}"
          ${!inStock ? 'disabled' : ''}
          aria-label="Add ${escapeHTML(product.name)} to cart"
        >
          ${inStock ? '🛒 Add to Cart' : '❌ Out of Stock'}
        </button>
      </div>
    </article>
  `;
}

// ── Render Product Grid ──────────────────────────────────────
export function renderProductGrid(products, container, emptyMessage = 'No products found') {
  if (!container) return;

  if (!products?.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="empty-state-icon">📦</div>
        <h3>${emptyMessage}</h3>
        <p>Try adjusting your filters or search query</p>
        <a href="/pages/products.html" class="btn btn-primary">Browse All Products</a>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(renderProductCard).join('');

  // Enable lazy images
  import('./utils.js').then(({ lazyLoadImages }) => lazyLoadImages());
}

// ── Flash Sale Card ──────────────────────────────────────────
export function renderFlashCard(product) {
  const img = product.primary_image || 'assets/images/placeholder.webp';
  const discount = calcDiscount(product.price, product.compare_price);
  const available = product.available_quantity || 0;
  const total = (product.reserved_quantity || 0) + available;
  const sold = total > 0 ? Math.round((total - available) / total * 100) : 50;

  return `
    <article class="flash-card" data-product-id="${product.id}">
      <div class="product-card-img-wrap">
        <img data-src="${img}" src="/assets/images/placeholder.webp" alt="${escapeHTML(product.name)}" class="product-card-img" loading="lazy" onerror="this.onerror=null; this.src='/assets/images/placeholder.webp';">
        <div class="product-card-badges">
          ${discount > 0 ? `<span class="card-badge card-badge-sale">${discount}% Off</span>` : ''}
        </div>
      </div>
      <div class="product-card-body" onclick="window.location.href='/pages/product-detail.html?slug=${product.slug}'" style="cursor:pointer">
        <div class="product-card-name">${escapeHTML(product.name)}</div>
        <div class="product-card-price-row">
          <span class="product-card-price">${formatPrice(product.price)}</span>
          ${product.compare_price > product.price ? `<span class="product-card-original">${formatPrice(product.compare_price)}</span>` : ''}
        </div>
        <div class="flash-progress" aria-label="${sold}% sold">
          <div class="flash-progress-bar" style="width:${sold}%"></div>
        </div>
        <div class="flash-sold-count">${available} left</div>
      </div>
      <div class="product-card-footer">
        <button class="product-card-add-btn" data-product-id="${product.id}">
          🛒 Add to Cart
        </button>
      </div>
    </article>
  `;
}

// ── Skeleton Cards ───────────────────────────────────────────
export function renderSkeletonCards(count = 4) {
  return Array(count).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-text skeleton-title" style="margin-top:12px"></div>
      <div class="skeleton skeleton-text w-3-4"></div>
      <div class="skeleton skeleton-text w-1-2"></div>
      <div class="skeleton skeleton-btn" style="margin-top:8px"></div>
    </div>
  `).join('');
}
