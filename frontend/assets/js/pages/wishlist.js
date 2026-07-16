/**
 * ShopVerse - Wishlist Page
 * Loads wishlist items, renders cards, handles remove & move-to-cart
 */

import {
  initPage, apiFetch, showToast, formatPrice, escapeHTML,
  renderStars, calcDiscount, lazyLoadImages
} from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';
import { Auth, requireAuth } from '../modules/auth.js';
import { Cart } from '../modules/cart.js';
import { Wishlist } from '../modules/wishlist.js';

// ── Entry Point ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  initPage();
  await initNavbar();

  await loadWishlist();
  initMoveAllToCart();
  initClearWishlist();
});

// ── Load Wishlist ─────────────────────────────────────────────
async function loadWishlist() {
  const grid = document.getElementById('wishlist-grid');
  const countLabel = document.getElementById('wishlist-count-label');
  const moveAllBtn = document.getElementById('move-all-to-cart-btn');
  const clearBtn = document.getElementById('clear-wishlist-btn');

  if (!grid) return;

  // Skeleton
  grid.innerHTML = [1, 2, 3, 4].map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-text skeleton-title" style="margin-top:var(--space-3)"></div>
      <div class="skeleton skeleton-text w-3-4"></div>
      <div class="skeleton skeleton-btn" style="margin-top:var(--space-3)"></div>
    </div>
  `).join('');

  try {
    const data = await apiFetch('/wishlist');
    const items = data.data || [];

    if (countLabel) {
      countLabel.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} in your wishlist`;
    }

    if (!items.length) {
      grid.innerHTML = renderEmptyWishlist();
      if (moveAllBtn) moveAllBtn.style.display = 'none';
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }

    // Show action buttons
    if (moveAllBtn) moveAllBtn.style.display = 'inline-flex';
    if (clearBtn) clearBtn.style.display = 'inline-flex';

    grid.innerHTML = items.map(renderWishlistCard).join('');
    lazyLoadImages();
    attachCardEvents();
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:var(--space-12);color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:var(--space-4)">⚠️</div>
        <p>Failed to load wishlist.</p>
        <button class="btn btn-primary btn-sm" onclick="window.location.reload()" style="margin-top:var(--space-4)">Retry</button>
      </div>
    `;
    showToast(err.message || 'Failed to load wishlist.', 'error');
  }
}

// ── Render Wishlist Card ──────────────────────────────────────
function renderWishlistCard(item) {
  const product = item.products || item;
  const img = product.primary_image || product.product_images?.[0]?.url || '../assets/images/placeholder.webp';
  const discount = calcDiscount(product.price, product.compare_price);
  const inStock = (product.available_quantity || product.stock_quantity || 1) > 0;

  return `
    <article class="product-card wishlist-card" data-product-id="${product.id}" data-wishlist-item-id="${item.id}" aria-label="${escapeHTML(product.name)}">
      <div class="product-card-img-wrap">
        <img
          data-src="${escapeHTML(img)}"
          src="../assets/images/placeholder.webp"
          alt="${escapeHTML(product.name)}"
          class="product-card-img"
          loading="lazy"
          onerror="this.src='../assets/images/placeholder.webp'"
        >
        ${discount > 0 ? `<div class="product-card-badges"><span class="card-badge card-badge-sale">${discount}% Off</span></div>` : ''}
        ${!inStock ? `<div class="product-card-badges"><span class="card-badge card-badge-out">Out of Stock</span></div>` : ''}

        <!-- Remove from wishlist -->
        <button
          class="product-card-wishlist active"
          data-action="remove-wishlist"
          data-product-id="${product.id}"
          title="Remove from wishlist"
          aria-label="Remove ${escapeHTML(product.name)} from wishlist"
        >💜</button>
      </div>

      <div class="product-card-body"
        role="button" tabindex="0"
        onclick="window.location.href='/pages/product-detail.html?slug=${escapeHTML(product.slug)}'"
        onkeydown="if(event.key==='Enter')window.location.href='/pages/product-detail.html?slug=${escapeHTML(product.slug)}'"
      >
        ${product.brand_name ? `<div class="product-card-brand">${escapeHTML(product.brand_name)}</div>` : ''}
        <h3 class="product-card-name">${escapeHTML(product.name)}</h3>
        <div class="product-card-rating">
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
          class="btn btn-primary product-card-add-btn w-full"
          data-action="move-to-cart"
          data-product-id="${product.id}"
          ${!inStock ? 'disabled' : ''}
          aria-label="Move ${escapeHTML(product.name)} to cart"
        >
          ${inStock ? '🛒 Move to Cart' : 'Out of Stock'}
        </button>
      </div>
    </article>
  `;
}

// ── Empty Wishlist ────────────────────────────────────────────
function renderEmptyWishlist() {
  return `
    <div style="grid-column:1/-1;text-align:center;padding:var(--space-20) var(--space-8);color:var(--text-muted)" role="status">
      <div style="font-size:5rem;margin-bottom:var(--space-6);animation:bounce-in 0.6s">🤍</div>
      <h2 style="font-size:var(--font-size-2xl);font-weight:900;color:var(--text-primary);margin-bottom:var(--space-3)">Your wishlist is empty</h2>
      <p style="max-width:400px;margin:0 auto var(--space-8);font-size:var(--font-size-base);line-height:1.7">
        Save your favourite products by clicking the <strong>🤍</strong> heart icon on any product.
      </p>
      <div style="display:flex;gap:var(--space-4);justify-content:center;flex-wrap:wrap">
        <a href="products.html" class="btn btn-primary btn-lg">🛍️ Explore Products</a>
        <a href="../index.html" class="btn btn-ghost btn-lg">🏠 Go Home</a>
      </div>
    </div>
  `;
}

// ── Attach Card Click Events ──────────────────────────────────
function attachCardEvents() {
  const grid = document.getElementById('wishlist-grid');
  if (!grid) return;

  grid.addEventListener('click', async (e) => {
    // Remove from wishlist
    const removeBtn = e.target.closest('[data-action="remove-wishlist"]');
    if (removeBtn) {
      const productId = removeBtn.dataset.productId;
      const card = removeBtn.closest('.wishlist-card');
      removeBtn.textContent = '⏳';
      removeBtn.disabled = true;

      try {
        await Wishlist.toggle(productId); // toggles off
        // Animate card removal
        if (card) {
          card.style.transition = 'all 0.3s ease';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.8)';
          card.addEventListener('transitionend', () => {
            card.remove();
            // Refresh counts & empty state check
            const remaining = grid.querySelectorAll('.wishlist-card').length;
            if (remaining === 0) {
              grid.innerHTML = renderEmptyWishlist();
              const countLabel = document.getElementById('wishlist-count-label');
              if (countLabel) countLabel.textContent = '0 items in your wishlist';
              const moveAllBtn = document.getElementById('move-all-to-cart-btn');
              const clearBtn = document.getElementById('clear-wishlist-btn');
              if (moveAllBtn) moveAllBtn.style.display = 'none';
              if (clearBtn) clearBtn.style.display = 'none';
            } else {
              const countLabel = document.getElementById('wishlist-count-label');
              if (countLabel) countLabel.textContent = `${remaining} item${remaining !== 1 ? 's' : ''} in your wishlist`;
            }
          }, { once: true });
        }
      } catch (err) {
        removeBtn.textContent = '💜';
        removeBtn.disabled = false;
        showToast(err.message || 'Failed to remove.', 'error');
      }
      return;
    }

    // Move to cart
    const moveBtn = e.target.closest('[data-action="move-to-cart"]');
    if (moveBtn && !moveBtn.disabled) {
      const productId = moveBtn.dataset.productId;
      const originalText = moveBtn.textContent;
      moveBtn.classList.add('loading');
      moveBtn.disabled = true;

      try {
        await Cart.addItem(productId, 1);
        moveBtn.textContent = '✓ Added to Cart!';
        moveBtn.style.background = 'var(--color-success)';
        setTimeout(async () => {
          // Remove from wishlist after moving
          try {
            await Wishlist.toggle(productId);
            const card = moveBtn.closest('.wishlist-card');
            if (card) {
              card.style.transition = 'all 0.3s ease';
              card.style.opacity = '0';
              card.style.transform = 'scale(0.95)';
              card.addEventListener('transitionend', () => {
                card.remove();
                const remaining = grid.querySelectorAll('.wishlist-card').length;
                if (remaining === 0) {
                  grid.innerHTML = renderEmptyWishlist();
                }
                const countLabel = document.getElementById('wishlist-count-label');
                if (countLabel) countLabel.textContent = `${remaining} item${remaining !== 1 ? 's' : ''} in your wishlist`;
              }, { once: true });
            }
          } catch {}
        }, 1200);
      } catch (err) {
        moveBtn.classList.remove('loading');
        moveBtn.disabled = false;
        moveBtn.textContent = originalText;
        moveBtn.style.background = '';
        showToast(err.message || 'Failed to add to cart.', 'error');
      }
    }
  });
}

// ── Move All to Cart ──────────────────────────────────────────
function initMoveAllToCart() {
  const btn = document.getElementById('move-all-to-cart-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const cards = document.querySelectorAll('.wishlist-card');
    if (!cards.length) return;

    btn.classList.add('loading');
    btn.textContent = '⏳ Moving…';

    let successCount = 0;
    const productIds = [...cards].map(c => c.dataset.productId).filter(Boolean);

    for (const productId of productIds) {
      try {
        await Cart.addItem(productId, 1);
        successCount++;
      } catch {}
    }

    // Clear wishlist
    try {
      await apiFetch('/wishlist/clear', { method: 'DELETE' });
    } catch {}

    btn.classList.remove('loading');
    btn.textContent = '🛒 Move All to Cart';

    showToast(`${successCount} item${successCount !== 1 ? 's' : ''} moved to cart! 🛒`, 'success');
    await loadWishlist();
  });
}

// ── Clear Wishlist ────────────────────────────────────────────
function initClearWishlist() {
  const btn = document.getElementById('clear-wishlist-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!confirm('Clear your entire wishlist? This cannot be undone.')) return;

    btn.classList.add('loading');
    try {
      await apiFetch('/wishlist/clear', { method: 'DELETE' });
      showToast('Wishlist cleared.', 'info');
      await loadWishlist();
    } catch (err) {
      showToast(err.message || 'Failed to clear wishlist.', 'error');
    } finally {
      btn.classList.remove('loading');
    }
  });
}
