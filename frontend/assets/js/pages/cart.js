/**
 * ShopVerse - Cart Page
 * Renders cart items, quantity controls, coupon application, and summary
 */

import { initPage, showToast, formatPrice, hidePageLoader } from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';
import { requireAuth, Auth } from '../modules/auth.js';
import { Cart, renderCartItem } from '../modules/cart.js';

// ── Module-level cart state ──────────────────────────────────
let cartData = null;       // full cart object from server
let appliedCoupon = null;  // { code, discount_amount, discount_percent }

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  await initNavbar();

  // Redirect to login if not authenticated
  if (!requireAuth('/pages/cart.html')) return;

  await loadCart();
  initCartEventListeners();
  initCheckoutButton();
  initCoupon();
  initSelectAll();
});

// ── Load Cart Data ───────────────────────────────────────────
async function loadCart() {
  try {
    cartData = await Cart.getCart();
    renderCart();
  } catch (err) {
    showToast('Failed to load cart. Please refresh.', 'error');
    showEmptyState();
  }
}

// ── Render Cart ──────────────────────────────────────────────
function renderCart() {
  const items = cartData?.cart_items || [];

  if (!items.length) {
    showEmptyState();
    return;
  }

  showCartLayout();

  const container = document.getElementById('cart-items-container');
  if (!container) return;

  // Render each item using the shared renderCartItem helper
  container.innerHTML = items.map(item => `
    <div class="cart-item-wrapper" data-item-id="${item.id}">
      <label class="item-select-wrap" style="display:flex;align-items:center;gap:var(--space-3)">
        <input type="checkbox" class="item-checkbox" data-item-id="${item.id}"
          style="width:16px;height:16px;accent-color:var(--color-primary);cursor:pointer;flex-shrink:0"
          aria-label="Select item">
        ${renderCartItem(item)}
      </label>
    </div>
  `).join('');

  updateSummary();
  updateItemCountLabel();
}

// ── Show / Hide States ───────────────────────────────────────
function showEmptyState() {
  document.getElementById('empty-cart').style.display = 'block';
  document.getElementById('cart-layout').style.display = 'none';
  hidePageLoader();
}

function showCartLayout() {
  document.getElementById('empty-cart').style.display = 'none';
  document.getElementById('cart-layout').style.display = 'grid';
  hidePageLoader();
}

// ── Update Summary Panel ─────────────────────────────────────
function updateSummary() {
  const items = cartData?.cart_items || [];
  if (!items.length) return;

  // Subtotal from line items
  const subtotal = items.reduce((sum, item) => {
    const price = item.price || item.products?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  // Original total (compare price) for discount display
  const originalTotal = items.reduce((sum, item) => {
    const compare = item.products?.compare_price || item.price || 0;
    const price    = item.price || item.products?.price || 0;
    return sum + Math.max(compare, price) * item.quantity;
  }, 0);

  const productDiscount = originalTotal > subtotal ? originalTotal - subtotal : 0;

  // Free shipping above ₹499
  const shipping = subtotal >= 499 ? 0 : 49;
  const TAX_RATE = 0.18;
  const taxBase  = subtotal - (appliedCoupon?.discount_amount || 0);
  const tax      = Math.round(taxBase * TAX_RATE);
  const couponDiscount = appliedCoupon?.discount_amount || 0;
  const total = subtotal - couponDiscount + shipping + tax;
  const totalSavings = productDiscount + couponDiscount;

  // Render
  setText('summary-subtotal', formatPrice(subtotal));
  setText('summary-shipping', shipping === 0
    ? '<span style="color:var(--color-success);font-weight:600">FREE</span>'
    : formatPrice(shipping));
  setText('summary-tax', formatPrice(tax));
  setText('summary-total', formatPrice(total));

  // Product discount row
  const discountRow = document.getElementById('summary-discount-row');
  if (discountRow) {
    discountRow.style.display = productDiscount > 0 ? 'flex' : 'none';
    setText('summary-discount', `−${formatPrice(productDiscount)}`);
  }

  // Coupon discount row
  const couponRow = document.getElementById('coupon-discount-row');
  if (couponRow) {
    couponRow.style.display = couponDiscount > 0 ? 'flex' : 'none';
    setText('coupon-discount-amount', `−${formatPrice(couponDiscount)}`);
  }

  // Savings banner
  const banner = document.getElementById('savings-banner');
  if (banner) {
    banner.style.display = totalSavings > 0 ? 'block' : 'none';
    setText('total-savings', formatPrice(totalSavings));
  }

  // Shipping field uses innerHTML for FREE label
  const shippingEl = document.getElementById('summary-shipping');
  if (shippingEl) {
    shippingEl.innerHTML = shipping === 0
      ? '<span style="color:var(--color-success);font-weight:600">FREE</span>'
      : formatPrice(shipping);
  }
}

// ── Update Item Count Display ────────────────────────────────
function updateItemCountLabel() {
  const items = cartData?.cart_items || [];
  const total = items.reduce((s, i) => s + (i.quantity || 1), 0);
  setText('item-count-label', total);
  setText('cart-item-count-title', `(${total} ${total === 1 ? 'item' : 'items'})`);
}

// ── Event Delegation: qty +/−, remove ───────────────────────
function initCartEventListeners() {
  const container = document.getElementById('cart-items-container');
  if (!container) return;

  container.addEventListener('click', async (e) => {

    // ── Quantity Decrease ──────────────────────────────────
    const qtyBtn = e.target.closest('.qty-btn');
    if (qtyBtn) {
      const action   = qtyBtn.dataset.action;
      const cartItem = qtyBtn.closest('[data-item-id]');
      if (!cartItem) return;

      const itemId    = cartItem.dataset.itemId;
      const qtyEl     = cartItem.querySelector('.qty-value');
      const currentQty = parseInt(qtyEl?.textContent || '1', 10);

      if (action === 'decrease' && currentQty <= 1) {
        // Confirm before removing
        if (confirm('Remove this item from your cart?')) {
          await handleRemoveItem(itemId);
        }
        return;
      }

      const newQty = action === 'increase' ? currentQty + 1 : currentQty - 1;
      qtyBtn.disabled = true;

      try {
        await Cart.updateItem(itemId, newQty);
        // Update local state
        const item = cartData.cart_items.find(i => i.id === itemId);
        if (item) item.quantity = newQty;
        if (qtyEl) qtyEl.textContent = newQty;
        updateSummary();
        updateItemCountLabel();
      } catch (err) {
        showToast(err.message || 'Failed to update quantity', 'error');
      } finally {
        qtyBtn.disabled = false;
      }
      return;
    }

    // ── Remove Item ────────────────────────────────────────
    const removeBtn = e.target.closest('[data-action="remove"], .cart-item-remove');
    if (removeBtn) {
      const cartItem = removeBtn.closest('[data-item-id]');
      if (!cartItem) return;
      await handleRemoveItem(cartItem.dataset.itemId);
      return;
    }

    // ── Item Checkbox change (select all tracking) ─────────
    const checkbox = e.target.closest('.item-checkbox');
    if (checkbox) {
      syncSelectAll();
      toggleRemoveSelectedBtn();
    }
  });
}

// ── Remove a Single Item ─────────────────────────────────────
async function handleRemoveItem(itemId) {
  const wrapper = document.querySelector(`.cart-item-wrapper[data-item-id="${itemId}"]`)
                || document.querySelector(`[data-item-id="${itemId}"]`);
  if (wrapper) {
    wrapper.style.transition = 'opacity 0.25s, transform 0.25s';
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateX(-20px)';
  }

  try {
    await Cart.removeItem(itemId);
    cartData.cart_items = cartData.cart_items.filter(i => i.id !== itemId);

    setTimeout(() => {
      wrapper?.remove();
      if (!cartData.cart_items.length) {
        showEmptyState();
      } else {
        updateSummary();
        updateItemCountLabel();
      }
    }, 280);
  } catch (err) {
    if (wrapper) { wrapper.style.opacity = '1'; wrapper.style.transform = ''; }
    showToast(err.message || 'Failed to remove item', 'error');
  }
}

// ── Select All ───────────────────────────────────────────────
function initSelectAll() {
  const selectAll = document.getElementById('select-all-checkbox');
  if (!selectAll) return;

  selectAll.addEventListener('change', () => {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(cb => { cb.checked = selectAll.checked; });
    toggleRemoveSelectedBtn();
  });
}

function syncSelectAll() {
  const checkboxes = Array.from(document.querySelectorAll('.item-checkbox'));
  const selectAll  = document.getElementById('select-all-checkbox');
  if (!selectAll) return;
  selectAll.checked = checkboxes.length > 0 && checkboxes.every(cb => cb.checked);
  selectAll.indeterminate = checkboxes.some(cb => cb.checked) && !checkboxes.every(cb => cb.checked);
}

function toggleRemoveSelectedBtn() {
  const btn     = document.getElementById('remove-selected-btn');
  const checked = document.querySelectorAll('.item-checkbox:checked');
  if (btn) btn.style.display = checked.length > 0 ? 'inline-flex' : 'none';

  const removeSelected = document.getElementById('remove-selected-btn');
  if (!removeSelected._bound) {
    removeSelected._bound = true;
    removeSelected.addEventListener('click', async () => {
      const ids = Array.from(document.querySelectorAll('.item-checkbox:checked'))
        .map(cb => cb.dataset.itemId);
      if (!ids.length) return;
      if (!confirm(`Remove ${ids.length} selected item(s)?`)) return;
      for (const id of ids) await handleRemoveItem(id);
    });
  }
}

// ── Coupon ───────────────────────────────────────────────────
function initCoupon() {
  const applyBtn  = document.getElementById('apply-coupon-btn');
  const removeBtn = document.getElementById('remove-coupon-btn');

  applyBtn?.addEventListener('click', async () => {
    const input = document.getElementById('coupon-input');
    const code  = input?.value.trim().toUpperCase();
    if (!code) { showToast('Please enter a coupon code', 'warning'); return; }

    applyBtn.classList.add('loading');
    try {
      const data = await Cart.applyCoupon(code);
      appliedCoupon = {
        code,
        discount_amount:  data.discount_amount  || 0,
        discount_percent: data.discount_percent || 0,
      };
      showCouponApplied();
      updateSummary();
      showToast(`Coupon "${code}" applied! You saved ${formatPrice(appliedCoupon.discount_amount)} 🎉`, 'success');
    } catch (err) {
      showToast(err.message || 'Invalid coupon code', 'error');
    } finally {
      applyBtn.classList.remove('loading');
    }
  });

  // Allow Enter key on coupon input
  document.getElementById('coupon-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyBtn?.click();
  });

  removeBtn?.addEventListener('click', () => {
    appliedCoupon = null;
    hideCouponApplied();
    updateSummary();
    const input = document.getElementById('coupon-input');
    if (input) input.value = '';
    showToast('Coupon removed', 'info');
  });
}

function showCouponApplied() {
  const row = document.getElementById('coupon-input-row');
  const msg = document.getElementById('coupon-applied-msg');
  if (row) row.style.display = 'none';
  if (msg) {
    msg.style.display = 'flex';
    setText('coupon-code-display', `${appliedCoupon.code} applied`);
    setText('coupon-savings-display',
      `You saved ${formatPrice(appliedCoupon.discount_amount)}${appliedCoupon.discount_percent ? ` (${appliedCoupon.discount_percent}% off)` : ''}`
    );
  }
}

function hideCouponApplied() {
  const row = document.getElementById('coupon-input-row');
  const msg = document.getElementById('coupon-applied-msg');
  if (row) row.style.display = 'flex';
  if (msg) msg.style.display = 'none';
}

// ── Checkout Button ──────────────────────────────────────────
function initCheckoutButton() {
  const btn = document.getElementById('checkout-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') + 'login.html?redirect=/pages/checkout.html';
      return;
    }
    if (!cartData?.cart_items?.length) {
      showToast('Your cart is empty', 'warning');
      return;
    }
    window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') + 'checkout.html';
  });
}

// ── Helpers ──────────────────────────────────────────────────
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(text);
}
