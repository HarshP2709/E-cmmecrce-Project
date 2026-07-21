/**
 * ShopVerse - Home Page
 * Handles hero slider, product sections, countdown, newsletter
 */

import { initPage, apiFetch, showToast, startCountdown, lazyLoadImages } from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';
import { fetchProducts, renderProductCard, renderFlashCard, renderSkeletonCards } from '../modules/products.js';
import { Cart } from '../modules/cart.js';
import { Wishlist } from '../modules/wishlist.js';

document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  await initNavbar();
  initHeroSlider();
  initCountdown();

  // Load all sections in parallel
  await Promise.all([
    loadCategories(),
    loadFeaturedProducts(),
    loadFlashSaleProducts(),
    loadBestSellers(),
    loadNewArrivals(),
    loadBrands(),
  ]);

  lazyLoadImages();
  initProductActions();
  initNewsletterForm();
});

// ── Hero Slider ──────────────────────────────────────────────
function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.slider-dot');
  if (!slides.length) return;

  let current = 0;
  let autoPlayTimer;

  const goTo = (idx) => {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    dots[current]?.setAttribute('aria-selected', 'false');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
    dots[current]?.setAttribute('aria-selected', 'true');
  };

  const startAutoPlay = () => { autoPlayTimer = setInterval(() => goTo(current + 1), 5000); };
  const stopAutoPlay = () => clearInterval(autoPlayTimer);

  document.getElementById('slider-prev')?.addEventListener('click', () => { stopAutoPlay(); goTo(current - 1); startAutoPlay(); });
  document.getElementById('slider-next')?.addEventListener('click', () => { stopAutoPlay(); goTo(current + 1); startAutoPlay(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { stopAutoPlay(); goTo(i); startAutoPlay(); }));

  // Touch swipe
  const slider = document.getElementById('hero-slider');
  let startX;
  slider?.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  slider?.addEventListener('touchend', (e) => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { stopAutoPlay(); goTo(current + (diff > 0 ? 1 : -1)); startAutoPlay(); }
  });

  startAutoPlay();
}

// ── Countdown Timer ──────────────────────────────────────────
function initCountdown() {
  // Set sale end to next midnight + 6 hours
  const end = new Date();
  end.setHours(end.getHours() + 6, 0, 0, 0);

  startCountdown(end, (h, m, s) => {
    const fmt = (n) => String(n).padStart(2, '0');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');
    if (hoursEl) hoursEl.textContent = fmt(h);
    if (minsEl) minsEl.textContent = fmt(m);
    if (secsEl) secsEl.textContent = fmt(s);
  }, () => {
    // Reset when timer ends
    initCountdown();
  });
}

// ── Load Categories ──────────────────────────────────────────
async function loadCategories() {
  const container = document.getElementById('categories-scroll');
  if (!container) return;

  try {
    const data = await apiFetch('/categories');
    const categories = data.data?.filter(c => !c.parent_id) || [];
    const icons = { electronics: '💻', fashion: '👗', 'home-living': '🏠', 'sports-fitness': '⚽', 'beauty-personal-care': '💄', 'books-education': '📚', 'toys-games': '🎮', groceries: '🛒' };
    const colors = { electronics: 'cat-electronics', fashion: 'cat-fashion', 'home-living': 'cat-home', 'sports-fitness': 'cat-sports', 'beauty-personal-care': 'cat-beauty', 'books-education': 'cat-books', 'toys-games': 'cat-toys', groceries: 'cat-grocery' };

    container.innerHTML = categories.map(cat => `
      <a href="pages/products.html?category=${cat.slug}" class="category-card" aria-label="${cat.name} category">
        <div class="category-card-icon ${colors[cat.slug] || 'cat-electronics'}">${icons[cat.slug] || cat.icon || '📦'}</div>
        <div class="category-card-name">${cat.name}</div>
      </a>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-muted text-center p-4">Failed to load categories</p>';
  }
}

// ── Load Featured Products ───────────────────────────────────
async function loadFeaturedProducts() {
  const container = document.getElementById('featured-products');
  if (!container) return;
  container.innerHTML = renderSkeletonCards(4);

  try {
    const data = await fetchProducts({ featured: 'true', limit: 8 });
    if (data.data?.length) {
      container.innerHTML = data.data.map(renderProductCard).join('');
    } else {
      container.innerHTML = '<p class="text-muted text-center" style="grid-column:1/-1;padding:2rem">No featured products yet.</p>';
    }
  } catch {
    container.innerHTML = renderSkeletonCards(4);
  }
}

// ── Flash Sale Products ──────────────────────────────────────
async function loadFlashSaleProducts() {
  const container = document.getElementById('flash-products');
  if (!container) return;

  try {
    const data = await fetchProducts({ flash_sale: 'true', limit: 4 });
    if (data.data?.length) {
      container.innerHTML = data.data.map(renderFlashCard).join('');
    }
  } catch {}
}

// ── Best Sellers ─────────────────────────────────────────────
async function loadBestSellers() {
  const container = document.getElementById('bestsellers-products');
  if (!container) return;
  container.innerHTML = renderSkeletonCards(4);

  try {
    const data = await fetchProducts({ best_seller: 'true', limit: 8 });
    if (data.data?.length) {
      container.innerHTML = data.data.map(renderProductCard).join('');
    } else {
      container.innerHTML = '';
    }
  } catch {
    container.innerHTML = '';
  }
}

// ── New Arrivals ─────────────────────────────────────────────
async function loadNewArrivals() {
  const container = document.getElementById('new-arrivals-products');
  if (!container) return;
  container.innerHTML = renderSkeletonCards(4);

  try {
    const data = await fetchProducts({ new_arrival: 'true', limit: 8 });
    if (data.data?.length) {
      container.innerHTML = data.data.map(renderProductCard).join('');
    } else {
      container.innerHTML = '';
    }
  } catch {
    container.innerHTML = '';
  }
}

// ── Brands ───────────────────────────────────────────────────
async function loadBrands() {
  const container = document.getElementById('brands-grid');
  if (!container) return;

  try {
    const data = await apiFetch('/categories'); // reusing for now; can add /brands endpoint
    container.innerHTML = ['Apple', 'Samsung', 'Sony', 'Nike', 'Adidas', 'OnePlus', 'Dell', 'HP', 'Boat', 'Puma']
      .map(brand => `
        <a href="pages/products.html?brand=${brand.toLowerCase()}" class="brand-logo-card" aria-label="${brand} products">
          <div class="brand-logo-text">${brand}</div>
        </a>
      `).join('');
  } catch {}
}

// ── Product Actions (Add to Cart / Wishlist) ─────────────────
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
        wishBtn.classList.add('heartbeat');
        wishBtn.addEventListener('animationend', () => wishBtn.classList.remove('heartbeat'), { once: true });
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    // Quick view
    const quickViewBtn = e.target.closest('[data-action="quick-view"]');
    if (quickViewBtn?.dataset.slug) {
      window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') + `product-detail.html?slug=${quickViewBtn.dataset.slug}`;
    }
  });
}

// ── Newsletter Form ──────────────────────────────────────────
function initNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('[name="email"]').value.trim();
    if (!email) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.classList.add('loading');

    try {
      await apiFetch('/auth/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      showToast('Successfully subscribed! 🎉', 'success', 'Newsletter');
      form.reset();
    } catch {
      showToast('You are already subscribed!', 'info');
    } finally {
      btn.classList.remove('loading');
    }
  });
}
