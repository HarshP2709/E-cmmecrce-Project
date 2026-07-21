/**
 * ShopVerse - Product Detail Page
 * Handles product data fetching, image gallery, variants, cart/wishlist, reviews
 */

import { initPage, getParams, apiFetch, showToast, formatPrice, renderStars, escapeHTML, calcDiscount, lazyLoadImages } from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';
import { Cart } from '../modules/cart.js';
import { Wishlist } from '../modules/wishlist.js';
import { fetchProductBySlug, fetchProducts, renderProductCard, renderSkeletonCards } from '../modules/products.js';
import { Auth } from '../modules/auth.js';

// ── State ─────────────────────────────────────────────────────
let product = null;
let quantity = 1;
let selectedVariantId = null;
let reviewPage = 1;
const REVIEWS_PER_PAGE = 5;

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  await initNavbar();

  const { slug } = getParams();
  if (!slug) {
    showError('No product specified.');
    return;
  }

  await loadProduct(slug);
});

// ── Load Product ──────────────────────────────────────────────
async function loadProduct(slug) {
  try {
    const data = await fetchProductBySlug(slug);
    product = data.data || data.product || data;
    if (!product?.id) throw new Error('Product not found');

    renderProduct();
    showContent();

    // Load reviews and related products in parallel (non-blocking)
    loadReviews();
    loadRelatedProducts();
  } catch (err) {
    showError(err.message === 'Product not found'
      ? 'Product not found. It may have been removed or is no longer available.'
      : 'Failed to load product. Please try again.');
  }
}

// ── Render Product ────────────────────────────────────────────
function renderProduct() {
  // ── Meta / SEO ─────────────────────────────────────────────
  document.getElementById('page-title').textContent = `${product.name} — ShopVerse`;
  document.getElementById('page-description')?.setAttribute('content', product.short_description || product.description?.slice(0, 160) || '');
  document.getElementById('og-title')?.setAttribute('content', `${product.name} — ShopVerse`);
  document.getElementById('og-description')?.setAttribute('content', product.short_description || '');
  const primaryImg = product.product_images?.[0]?.url || product.primary_image || '';
  document.getElementById('og-image')?.setAttribute('content', primaryImg);

  // ── Breadcrumb ─────────────────────────────────────────────
  const bc = document.getElementById('breadcrumb-product');
  if (bc) bc.textContent = product.name;
  if (product.category_name) {
    const catLi = document.createElement('li');
    catLi.innerHTML = `<span style="opacity:0.5">›</span>&nbsp;<a href="products.html?category=${product.category_slug || ''}" style="color:var(--color-primary)">${escapeHTML(product.category_name)}</a>`;
    bc?.parentElement?.insertBefore(catLi, bc);
  }

  // ── Images ─────────────────────────────────────────────────
  const images = product.product_images?.length
    ? product.product_images.map(i => i.url || i)
    : [product.primary_image || '/assets/images/placeholder.webp'];

  renderGallery(images);

  // ── Brand / Name ───────────────────────────────────────────
  const brandEl = document.getElementById('product-brand');
  if (brandEl) {
    if (product.brand_name) {
      brandEl.textContent = product.brand_name.toUpperCase();
      brandEl.style.display = 'block';
    } else {
      brandEl.style.display = 'none';
    }
  }

  const nameEl = document.getElementById('product-name');
  if (nameEl) nameEl.textContent = product.name;

  // ── Rating ─────────────────────────────────────────────────
  const starsEl = document.getElementById('product-stars');
  const ratingLink = document.getElementById('product-rating-link');
  const rating = parseFloat(product.avg_rating) || 0;
  const rCount = product.review_count || 0;
  if (starsEl) starsEl.innerHTML = renderStars(rating);
  if (ratingLink) {
    ratingLink.textContent = `${rating.toFixed(1)} (${rCount} reviews)`;
    ratingLink.href = '#tab-reviews';
    ratingLink.addEventListener('click', () => activateTab('reviews'));
  }
  setText('reviews-tab-count', rCount);

  // ── Stock ──────────────────────────────────────────────────
  const stockBadge = document.getElementById('product-stock-badge');
  const stockCount = product.available_quantity ?? product.stock_quantity ?? 0;
  if (stockBadge) {
    if (stockCount <= 0) {
      stockBadge.textContent = '❌ Out of Stock';
      stockBadge.className = 'product-stock-badge out-of-stock';
    } else if (stockCount <= 10) {
      stockBadge.textContent = `⚠️ Only ${stockCount} left`;
      stockBadge.className = 'product-stock-badge low-stock';
    } else {
      stockBadge.textContent = '✅ In Stock';
      stockBadge.className = 'product-stock-badge in-stock';
    }
  }
  const stockText = document.getElementById('stock-count-text');
  if (stockText && stockCount > 0 && stockCount <= 10) {
    stockText.textContent = `Only ${stockCount} left!`;
  }

  // ── SKU ────────────────────────────────────────────────────
  const sku = document.getElementById('product-sku');
  if (sku && product.sku) sku.textContent = `SKU: ${product.sku}`;

  // ── Price ──────────────────────────────────────────────────
  setText('product-price', formatPrice(product.price));
  const discount = calcDiscount(product.price, product.compare_price);
  const comparePriceEl = document.getElementById('product-compare-price');
  const discountBadge = document.getElementById('product-discount-badge');

  if (product.compare_price > product.price) {
    if (comparePriceEl) { comparePriceEl.textContent = formatPrice(product.compare_price); comparePriceEl.style.display = 'inline'; }
    if (discountBadge) { discountBadge.textContent = `${discount}% OFF`; discountBadge.style.display = 'inline-flex'; }
  }

  // EMI
  if (product.price >= 3000) {
    const emiEl = document.getElementById('product-emi-text');
    const emiAmt = document.getElementById('product-emi-amount');
    if (emiEl) emiEl.style.display = 'block';
    if (emiAmt) emiAmt.textContent = formatPrice(Math.ceil(product.price / 12));
  }

  // ── Variants ───────────────────────────────────────────────
  const variants = product.product_variants || product.variants || [];
  if (variants.length) renderVariants(variants);

  // ── Add to Cart / Buy Now buttons ─────────────────────────
  const addCartBtn = document.getElementById('add-to-cart-btn');
  const buyNowBtn = document.getElementById('buy-now-btn');
  const inStock = stockCount > 0;

  if (!inStock) {
    if (addCartBtn) { addCartBtn.disabled = true; addCartBtn.textContent = '❌ Out of Stock'; }
    if (buyNowBtn) { buyNowBtn.disabled = true; }
  } else {
    addCartBtn?.addEventListener('click', handleAddToCart);
    buyNowBtn?.addEventListener('click', handleBuyNow);
  }

  // ── Wishlist Button ────────────────────────────────────────
  const wishBtn = document.getElementById('wishlist-btn');
  wishBtn?.addEventListener('click', handleWishlistToggle);

  // ── Description ────────────────────────────────────────────
  const descEl = document.getElementById('product-description');
  if (descEl) {
    descEl.innerHTML = product.description
      ? (product.description.trim().startsWith('<') || product.description.includes('</div>') ? product.description : product.description.replace(/\n/g, '<br>'))
      : '<p style="color:var(--text-muted)">No description available for this product.</p>';
  }

  // ── Specifications ─────────────────────────────────────────
  renderSpecifications();
}

// ── Gallery ───────────────────────────────────────────────────
function renderGallery(images) {
  const mainImg = document.getElementById('main-image');
  const thumbsWrap = document.getElementById('thumbnails');
  const mainWrap = document.getElementById('main-image-wrap');
  const zoomOverlay = document.getElementById('zoom-overlay');
  const zoomImg = document.getElementById('zoom-img');
  const zoomClose = document.getElementById('zoom-close');

  if (!mainImg) return;

  // Set first image
  const setMain = (src, alt) => {
    mainImg.src = src;
    mainImg.alt = alt || product.name;
    if (zoomImg) zoomImg.src = src;
    // Update active thumbnail
    document.querySelectorAll('.product-thumb').forEach(t => {
      t.classList.toggle('active', t.dataset.src === src);
    });
  };

  setMain(images[0], product.name);

  // Thumbnails
  if (thumbsWrap && images.length > 1) {
    thumbsWrap.innerHTML = images.map((src, i) => `
      <div
        class="product-thumb ${i === 0 ? 'active' : ''}"
        data-src="${escapeHTML(src)}"
        role="button"
        tabindex="0"
        aria-label="Product image ${i + 1}"
        title="Image ${i + 1}"
      >
        <img src="${escapeHTML(src)}" alt="Product thumbnail ${i + 1}" loading="lazy"
          onerror="this.onerror=null; this.src='/assets/images/placeholder.webp';">
      </div>
    `).join('');

    thumbsWrap.querySelectorAll('.product-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => setMain(thumb.dataset.src));
      thumb.addEventListener('keydown', (e) => { if (e.key === 'Enter') setMain(thumb.dataset.src); });
    });
  } else if (thumbsWrap) {
    thumbsWrap.style.display = 'none';
  }

  // Zoom on main image click
  mainWrap?.addEventListener('click', () => {
    if (zoomOverlay) {
      zoomOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  });
  mainWrap?.addEventListener('keydown', (e) => { if (e.key === 'Enter') mainWrap.click(); });

  // Close zoom
  const closeZoom = () => {
    zoomOverlay?.classList.remove('active');
    document.body.style.overflow = '';
  };
  zoomClose?.addEventListener('click', closeZoom);
  zoomOverlay?.addEventListener('click', (e) => { if (e.target === zoomOverlay) closeZoom(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeZoom(); });
}

// ── Variants ──────────────────────────────────────────────────
function renderVariants(variants) {
  const section = document.getElementById('product-variants-section');
  if (!section) return;
  section.style.display = 'block';

  // Group variants by their option name
  const grouped = variants.reduce((acc, v) => {
    const key = v.option_name || 'Variant';
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  section.innerHTML = Object.entries(grouped).map(([label, items]) => `
    <div class="variant-group" style="margin-bottom:var(--space-4)">
      <div class="variant-group-title">
        ${escapeHTML(label)}:
        <span id="selected-variant-${label.replace(/\s+/g, '-')}" style="color:var(--color-primary);font-weight:700"></span>
      </div>
      <div class="variant-options">
        ${items.map(v => {
    const isColor = label.toLowerCase().includes('color') || label.toLowerCase().includes('colour');
    if (isColor && v.color_hex) {
      return `
              <button
                class="color-swatch ${v.stock_quantity <= 0 ? 'disabled' : ''}"
                data-variant-id="${v.id}"
                data-option="${escapeHTML(v.option_value)}"
                data-group="${escapeHTML(label)}"
                style="background:${v.color_hex}"
                title="${escapeHTML(v.option_value)}"
                aria-label="${escapeHTML(v.option_value)}"
                ${v.stock_quantity <= 0 ? 'disabled aria-disabled="true"' : ''}
              ></button>
            `;
    }
    return `
            <button
              class="variant-btn ${v.stock_quantity <= 0 ? '' : ''}"
              data-variant-id="${v.id}"
              data-option="${escapeHTML(v.option_value)}"
              data-group="${escapeHTML(label)}"
              ${v.stock_quantity <= 0 ? 'disabled aria-disabled="true"' : ''}
              aria-label="${escapeHTML(label)}: ${escapeHTML(v.option_value)}"
            >
              ${escapeHTML(v.option_value)}
            </button>
          `;
  }).join('')}
      </div>
    </div>
  `).join('');

  // Variant click handler
  section.addEventListener('click', (e) => {
    const btn = e.target.closest('.variant-btn, .color-swatch');
    if (!btn || btn.disabled) return;

    const group = btn.dataset.group;
    // Deselect all in same group
    section.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedVariantId = btn.dataset.variantId;

    // Update label
    const labelEl = document.getElementById(`selected-variant-${group.replace(/\s+/g, '-')}`);
    if (labelEl) labelEl.textContent = btn.dataset.option;

    // Update price if variant has price override
    const variant = (product.product_variants || []).find(v => v.id === selectedVariantId);
    if (variant?.price_modifier) {
      const newPrice = product.price + (variant.price_modifier || 0);
      setText('product-price', formatPrice(newPrice));
    }
  });
}

// ── Quantity Selector ─────────────────────────────────────────
function initQtySelector() {
  // Handled in renderProduct via direct IDs; called after DOM ready
}

document.addEventListener('DOMContentLoaded', () => {
  // Init qty buttons after DOM ready (product might not be loaded yet;
  // these just update the local `quantity` variable)
  document.getElementById('qty-increase')?.addEventListener('click', () => {
    const maxQty = product?.available_quantity ?? 99;
    if (quantity < maxQty) {
      quantity++;
      setText('qty-display', quantity);
    } else {
      showToast(`Only ${maxQty} units available`, 'warning');
    }
  });

  document.getElementById('qty-decrease')?.addEventListener('click', () => {
    if (quantity > 1) {
      quantity--;
      setText('qty-display', quantity);
    }
  });
});

// ── Add to Cart ───────────────────────────────────────────────
async function handleAddToCart() {
  const btn = document.getElementById('add-to-cart-btn');
  if (!btn || !product) return;

  btn.classList.add('loading');
  try {
    await Cart.addItem(product.id, quantity, selectedVariantId);
    btn.textContent = '✓ Added to Cart!';
    btn.classList.add('added');
    setTimeout(() => {
      btn.textContent = '🛒 Add to Cart';
      btn.classList.remove('added');
    }, 2000);
  } catch (err) {
    showToast(err.message || 'Failed to add to cart', 'error');
  } finally {
    btn.classList.remove('loading');
  }
}

// ── Buy Now ───────────────────────────────────────────────────
async function handleBuyNow() {
  if (!Auth.isLoggedIn()) {
    window.location.href = `/pages/login.html?redirect=/pages/checkout.html`;
    return;
  }

  const btn = document.getElementById('buy-now-btn');
  if (btn) btn.classList.add('loading');
  try {
    await Cart.addItem(product.id, quantity, selectedVariantId);
    window.location.href = '/pages/checkout.html';
  } catch (err) {
    showToast(err.message || 'Failed to proceed', 'error');
    if (btn) btn.classList.remove('loading');
  }
}

// ── Wishlist Toggle ───────────────────────────────────────────
async function handleWishlistToggle() {
  if (!product) return;
  const btn = document.getElementById('wishlist-btn');
  try {
    const isIn = await Wishlist.toggle(product.id);
    if (btn) {
      btn.textContent = isIn ? '💜' : '🤍';
      btn.classList.toggle('active', isIn);
      btn.classList.add('heartbeat');
      btn.addEventListener('animationend', () => btn.classList.remove('heartbeat'), { once: true });
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Specifications ────────────────────────────────────────────
function renderSpecifications() {
  const tbody = document.getElementById('product-specs-body');
  if (!tbody) return;

  const specs = product.specifications || product.specs || {};
  const entries = typeof specs === 'object' ? Object.entries(specs) : [];

  if (!entries.length) {
    tbody.innerHTML = `
      <tr><td colspan="2" style="text-align:center;color:var(--text-muted);padding:var(--space-6)">
        No specifications available.
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = entries.map(([key, val]) => `
    <tr>
      <td>${escapeHTML(key)}</td>
      <td>${escapeHTML(String(val))}</td>
    </tr>
  `).join('');
}

// ── Tabs ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.product-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
});

function activateTab(tabName) {
  document.querySelectorAll('.product-tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.product-tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
}

// ── Reviews ───────────────────────────────────────────────────
async function loadReviews(append = false) {
  if (!product?.id) return;

  try {
    const data = await apiFetch(`/products/${product.id}/reviews?page=${reviewPage}&limit=${REVIEWS_PER_PAGE}`);
    const reviews = data.data || data.reviews || [];
    const total = data.total || data.count || reviews.length;
    const stats = data.stats || {};

    // Update count badge in tab
    setText('reviews-tab-count', total);

    // Render rating summary
    renderRatingSummary(parseFloat(product.avg_rating) || 0, total, stats);

    // Render review cards
    renderReviewCards(reviews, append);

    // Load more button
    const loadMoreWrap = document.getElementById('reviews-load-more-wrap');
    if (loadMoreWrap) {
      loadMoreWrap.style.display = reviews.length === REVIEWS_PER_PAGE ? 'block' : 'none';
    }
  } catch {
    // Silently fail — reviews are not critical
  }
}

function renderRatingSummary(avgRating, totalCount, stats) {
  setText('reviews-avg-rating', avgRating.toFixed(1));
  const starsEl = document.getElementById('reviews-avg-stars');
  if (starsEl) starsEl.textContent = '★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating));
  setText('reviews-total-count', `${totalCount} ${totalCount === 1 ? 'review' : 'reviews'}`);

  const barsEl = document.getElementById('rating-breakdown-bars');
  if (!barsEl) return;

  barsEl.innerHTML = [5, 4, 3, 2, 1].map(star => {
    const count = stats[`star_${star}`] || stats[star] || 0;
    const pct = totalCount > 0 ? Math.round(count / totalCount * 100) : 0;
    return `
      <div class="rating-bar-row">
        <span class="rating-bar-label">${star} ★</span>
        <div class="rating-bar-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${star} star ratings: ${pct}%">
          <div class="rating-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="rating-bar-count">${count}</span>
      </div>
    `;
  }).join('');
}

function renderReviewCards(reviews, append = false) {
  const list = document.getElementById('reviews-list');
  if (!list) return;

  if (!reviews.length && !append) {
    list.innerHTML = `
      <div style="text-align:center;padding:var(--space-10);color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:var(--space-3)">💬</div>
        <p>No reviews yet. Be the first to review this product!</p>
      </div>
    `;
    return;
  }

  const html = reviews.map(r => {
    const author = r.user_name || r.user?.full_name || 'Anonymous';
    const initial = author[0]?.toUpperCase() || 'A';
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    return `
      <div class="review-item">
        <div class="review-item-header">
          <div class="review-avatar-sm">${escapeHTML(initial)}</div>
          <div class="review-meta">
            <div class="review-author">${escapeHTML(author)}</div>
            <div class="review-stars" aria-label="${r.rating} out of 5 stars">
              <span style="color:var(--color-warning);font-size:0.9rem">${stars}</span>
            </div>
            <div class="review-date">${date}</div>
          </div>
          ${r.is_verified_purchase ? '<span class="review-verified" style="margin-left:auto">✅ Verified Purchase</span>' : ''}
        </div>
        ${r.title ? `<div class="review-title">${escapeHTML(r.title)}</div>` : ''}
        <div class="review-body">${escapeHTML(r.comment || r.body || '')}</div>
        ${r.helpful_count > 0 ? `<div style="font-size:var(--font-size-xs);color:var(--text-muted);margin-top:var(--space-3)">👍 ${r.helpful_count} found this helpful</div>` : ''}
      </div>
    `;
  }).join('');

  if (append) {
    list.insertAdjacentHTML('beforeend', html);
  } else {
    list.innerHTML = html;
  }
}

// ── Write Review ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const writeBtn = document.getElementById('write-review-btn');
  const cancelBtn = document.getElementById('cancel-review-btn');
  const reviewForm = document.getElementById('write-review-form');
  const formEl = document.getElementById('review-form-el');
  const loadMoreBtn = document.getElementById('load-more-reviews-btn');
  const starPicker = document.getElementById('star-picker');

  writeBtn?.addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      showToast('Please sign in to write a review', 'info');
      setTimeout(() => { window.location.href = `/pages/login.html?redirect=${encodeURIComponent(window.location.href)}`; }, 800);
      return;
    }
    if (reviewForm) reviewForm.style.display = 'block';
    writeBtn.style.display = 'none';
    reviewForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  cancelBtn?.addEventListener('click', () => {
    if (reviewForm) reviewForm.style.display = 'none';
    if (writeBtn) writeBtn.style.display = '';
    formEl?.reset();
    resetStarPicker();
  });

  // Star picker
  starPicker?.querySelectorAll('span').forEach((star, i) => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.val);
      document.getElementById('review-rating-input').value = val;
      starPicker.querySelectorAll('span').forEach((s, j) => {
        s.style.opacity = j < val ? '1' : '0.25';
        s.style.color = j < val ? 'var(--color-warning)' : '';
      });
    });
    star.addEventListener('mouseover', () => {
      const val = parseInt(star.dataset.val);
      starPicker.querySelectorAll('span').forEach((s, j) => {
        s.style.opacity = j < val ? '1' : '0.25';
      });
    });
    star.addEventListener('mouseout', () => {
      const current = parseInt(document.getElementById('review-rating-input')?.value || '0');
      starPicker.querySelectorAll('span').forEach((s, j) => {
        s.style.opacity = j < current ? '1' : '0.25';
      });
    });
    star.style.cursor = 'pointer';
  });

  function resetStarPicker() {
    starPicker?.querySelectorAll('span').forEach(s => {
      s.style.opacity = '0.35';
      s.style.color = '';
    });
    const inp = document.getElementById('review-rating-input');
    if (inp) inp.value = '0';
  }

  // Submit review
  formEl?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!product) return;

    const rating = parseInt(document.getElementById('review-rating-input')?.value || '0');
    const title = document.getElementById('review-title-input')?.value.trim();
    const comment = document.getElementById('review-body-input')?.value.trim();

    if (rating === 0) { showToast('Please select a rating', 'warning'); return; }
    if (!title) { showToast('Please enter a review title', 'warning'); return; }
    if (!comment || comment.length < 20) { showToast('Review must be at least 20 characters', 'warning'); return; }

    const submitBtn = document.getElementById('submit-review-btn');
    submitBtn?.classList.add('loading');

    try {
      await apiFetch(`/products/${product.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, title, comment }),
      });
      showToast('Review submitted! Thank you 🎉', 'success');
      if (reviewForm) reviewForm.style.display = 'none';
      if (writeBtn) writeBtn.style.display = '';
      formEl.reset();
      resetStarPicker();
      reviewPage = 1;
      loadReviews(false);
    } catch (err) {
      showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      submitBtn?.classList.remove('loading');
    }
  });

  // Load more reviews
  loadMoreBtn?.addEventListener('click', () => {
    reviewPage++;
    loadReviews(true);
  });
});

// ── Related Products ──────────────────────────────────────────
async function loadRelatedProducts() {
  const container = document.getElementById('related-products');
  if (!container || !product) return;
  container.innerHTML = renderSkeletonCards(4);

  try {
    const data = await fetchProducts({
      category: product.category_slug || product.category_id,
      limit: 8,
      exclude: product.id,
    });
    const related = (data.data || []).filter(p => p.id !== product.id).slice(0, 8);
    if (related.length) {
      container.innerHTML = related.map(renderProductCard).join('');
      lazyLoadImages();
      // Add to cart from related products
      container.addEventListener('click', async (e) => {
        const btn = e.target.closest('.product-card-add-btn');
        if (btn && !btn.disabled) {
          btn.classList.add('loading');
          try {
            await Cart.addItem(btn.dataset.productId);
            btn.textContent = '✓ Added!';
            setTimeout(() => { btn.textContent = '🛒 Add to Cart'; }, 2000);
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            btn.classList.remove('loading');
          }
        }
      });
    } else {
      container.innerHTML = '<p class="text-muted text-center" style="grid-column:1/-1;padding:var(--space-6)">No related products found.</p>';
    }
  } catch {
    container.innerHTML = '';
  }
}

// ── Show Content / Error ──────────────────────────────────────
function showContent() {
  const skeleton = document.getElementById('product-skeleton');
  const content = document.getElementById('product-detail-content');
  if (skeleton) skeleton.classList.add('hidden');
  if (content) content.style.display = 'block';
}

function showError(msg) {
  const skeleton = document.getElementById('product-skeleton');
  if (skeleton) skeleton.classList.add('hidden');

  const main = document.getElementById('main-content');
  const div = document.createElement('div');
  div.className = 'error-page';
  div.innerHTML = `
    <div>
      <div style="font-size:5rem;margin-bottom:var(--space-6)">😕</div>
      <h1 class="error-title">${escapeHTML(msg)}</h1>
      <div style="display:flex;gap:var(--space-4);justify-content:center;flex-wrap:wrap;margin-top:var(--space-8)">
        <a href="products.html" class="btn btn-primary">Browse Products</a>
        <button onclick="history.back()" class="btn btn-secondary">← Go Back</button>
      </div>
    </div>
  `;
  main?.appendChild(div);
}

// ── Helpers ───────────────────────────────────────────────────
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(text ?? '');
}
