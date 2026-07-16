/**
 * ShopVerse - Checkout Page
 * Multi-step checkout: Shipping → Payment → Review → Place Order
 */

import { initPage, apiFetch, showToast, formatPrice, hidePageLoader } from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';
import { requireAuth, Auth } from '../modules/auth.js';
import { Cart } from '../modules/cart.js';

// ── State ─────────────────────────────────────────────────────
let currentStep  = 1;
let cartData     = null;
let addresses    = [];
let selectedAddr = null;    // selected address object
let paymentMethod = 'cod';  // 'cod' | 'card' | 'upi'
let summaryTotals = {};     // { subtotal, shipping, tax, couponDiscount, total }

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  await initNavbar();

  if (!requireAuth('/pages/checkout.html')) return;

  await Promise.all([loadCart(), loadAddresses()]);
  initStepNavigation();
  initPaymentMethodSelector();
  initNewAddressForm();
  initCheckboxUI();
  initTermsCheckbox();
  initPlaceOrderButton();
  initCardFormatting();
});

// ── Load Cart ─────────────────────────────────────────────────
async function loadCart() {
  try {
    cartData = await Cart.getCart();
    if (!cartData?.cart_items?.length) {
      showToast('Your cart is empty. Redirecting…', 'warning');
      setTimeout(() => { window.location.href = '/pages/cart.html'; }, 1500);
      return;
    }
    renderCheckoutItems();
    computeTotals();
    renderSummaryTotals();
  } catch {
    showToast('Failed to load cart', 'error');
  }
}

// ── Load Addresses ────────────────────────────────────────────
async function loadAddresses() {
  try {
    const data = await apiFetch('/users/addresses');
    addresses = data.data || [];
    renderSavedAddresses();
  } catch {
    // Not fatal – user can add a new address
    addresses = [];
    renderSavedAddresses();
  }
}

// ── Render Saved Addresses ────────────────────────────────────
function renderSavedAddresses() {
  const container = document.getElementById('saved-addresses');
  if (!container) return;

  if (!addresses.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:var(--space-6);background:var(--bg-secondary);border-radius:var(--border-radius-lg);color:var(--text-muted)">
        <div style="font-size:2.5rem;margin-bottom:var(--space-3)">📍</div>
        <p style="font-size:var(--font-size-sm)">No saved addresses. Add one below.</p>
      </div>
    `;
    // Auto-open form if no addresses
    toggleNewAddressForm(true);
    return;
  }

  container.innerHTML = `
    <div class="address-select-cards">
      ${addresses.map(addr => `
        <div
          class="address-select-card ${addr.is_default ? 'selected' : ''}"
          data-addr-id="${addr.id}"
          role="radio"
          aria-checked="${addr.is_default ? 'true' : 'false'}"
          tabindex="0"
        >
          <div class="address-select-name">${escHTML(addr.full_name || Auth.getUser()?.full_name || 'User')}</div>
          <div style="font-size:var(--font-size-xs);color:var(--text-secondary);line-height:1.7">
            ${escHTML(addr.address_line1)}${addr.address_line2 ? ', ' + escHTML(addr.address_line2) : ''}<br>
            ${escHTML(addr.city)}, ${escHTML(addr.state)} — ${escHTML(addr.pincode)}<br>
            📞 ${escHTML(addr.phone)}
          </div>
          <div style="margin-top:var(--space-2);display:flex;gap:var(--space-2)">
            <span style="font-size:0.65rem;background:var(--bg-tertiary);padding:3px 8px;border-radius:4px;font-weight:600;text-transform:capitalize">
              ${addr.address_type || 'home'}
            </span>
            ${addr.is_default ? '<span style="font-size:0.65rem;background:rgba(108,99,255,0.1);color:var(--color-primary);padding:3px 8px;border-radius:4px;font-weight:600">Default</span>' : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Pre-select default or first address
  selectedAddr = addresses.find(a => a.is_default) || addresses[0];

  // Bind click events
  container.querySelectorAll('.address-select-card').forEach(card => {
    card.addEventListener('click', () => selectAddress(card.dataset.addrId));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') selectAddress(card.dataset.addrId); });
  });
}

function selectAddress(id) {
  selectedAddr = addresses.find(a => a.id === id);
  document.querySelectorAll('.address-select-card').forEach(card => {
    const selected = card.dataset.addrId === id;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-checked', selected);
  });
}

// ── Render Checkout Items (sidebar) ──────────────────────────
function renderCheckoutItems() {
  const container = document.getElementById('checkout-order-items');
  if (!container || !cartData?.cart_items?.length) return;

  container.innerHTML = cartData.cart_items.map(item => {
    const product = item.products || item;
    const img     = product.product_images?.[0]?.url || product.primary_image || '../assets/images/placeholder.webp';
    const price   = item.price || product.price || 0;
    return `
      <div class="order-summary-item">
        <img src="${escHTML(img)}" alt="${escHTML(product.name)}" class="order-summary-img"
          onerror="this.src='../assets/images/placeholder.webp'" loading="lazy">
        <div class="order-summary-details">
          <div class="order-summary-name">${escHTML(product.name)}</div>
          <div class="order-summary-qty">Qty: ${item.quantity}</div>
        </div>
        <div class="order-summary-price">${formatPrice(price * item.quantity)}</div>
      </div>
    `;
  }).join('');
}

// ── Compute Totals ────────────────────────────────────────────
function computeTotals() {
  if (!cartData?.cart_items?.length) return;

  const subtotal = cartData.cart_items.reduce((s, item) => {
    return s + (item.price || item.products?.price || 0) * item.quantity;
  }, 0);
  const couponDiscount = cartData.coupon_discount || 0;
  const shipping       = subtotal >= 499 ? 0 : 49;
  const tax            = Math.round((subtotal - couponDiscount) * 0.18);
  const total          = subtotal - couponDiscount + shipping + tax;

  summaryTotals = { subtotal, couponDiscount, shipping, tax, total };
}

// ── Render Summary Totals (sidebar) ──────────────────────────
function renderSummaryTotals() {
  const { subtotal, couponDiscount, shipping, tax, total } = summaryTotals;
  setText('co-subtotal', formatPrice(subtotal));
  const shippingEl = document.getElementById('co-shipping');
  if (shippingEl) shippingEl.innerHTML = shipping === 0
    ? '<span style="color:var(--color-success);font-weight:600">FREE</span>'
    : formatPrice(shipping);
  setText('co-tax', formatPrice(tax));
  setText('co-total', formatPrice(total));
  const couponRow = document.getElementById('co-coupon-row');
  if (couponRow) {
    couponRow.style.display = couponDiscount > 0 ? 'flex' : 'none';
    setText('co-coupon', `−${formatPrice(couponDiscount)}`);
  }
}

// ── Step Navigation ───────────────────────────────────────────
function initStepNavigation() {
  document.getElementById('step1-next-btn')?.addEventListener('click', () => {
    if (!validateStep1()) return;
    goToStep(2);
  });

  document.getElementById('step2-back-btn')?.addEventListener('click', () => goToStep(1));
  document.getElementById('step2-next-btn')?.addEventListener('click', () => {
    if (!validateStep2()) return;
    populateReviewStep();
    goToStep(3);
  });

  document.getElementById('step3-back-btn')?.addEventListener('click', () => goToStep(2));

  document.getElementById('edit-address-btn')?.addEventListener('click',  () => goToStep(1));
  document.getElementById('edit-payment-btn')?.addEventListener('click',  () => goToStep(2));
}

function goToStep(n) {
  // Hide all panels
  for (let i = 1; i <= 3; i++) {
    const panel = document.getElementById(`step-panel-${i}`);
    const indicator = document.getElementById(`step-indicator-${i}`);
    if (panel) panel.classList.remove('active');
    if (indicator) {
      indicator.classList.remove('active');
      if (i < n) indicator.classList.add('done');
      else indicator.classList.remove('done');
    }
  }

  currentStep = n;
  const activePanel = document.getElementById(`step-panel-${n}`);
  const activeIndicator = document.getElementById(`step-indicator-${n}`);
  if (activePanel) activePanel.classList.add('active');
  if (activeIndicator) activeIndicator.classList.add('active');

  // Scroll to top of content
  window.scrollTo({ top: document.getElementById('main-content')?.offsetTop || 0, behavior: 'smooth' });
}

// ── Step 1 Validation ─────────────────────────────────────────
function validateStep1() {
  if (!selectedAddr) {
    showToast('Please select or add a delivery address', 'warning');
    return false;
  }
  return true;
}

// ── Step 2 Validation ─────────────────────────────────────────
function validateStep2() {
  if (paymentMethod === 'card') {
    const name   = document.getElementById('card-holder-name')?.value.trim();
    const number = document.getElementById('card-number')?.value.replace(/\s/g, '');
    const expiry = document.getElementById('card-expiry')?.value.trim();
    const cvv    = document.getElementById('card-cvv')?.value.trim();

    if (!name)            { showToast('Enter cardholder name',           'warning'); return false; }
    if (number.length < 16) { showToast('Enter a valid 16-digit card number', 'warning'); return false; }
    if (!expiry)          { showToast('Enter card expiry date',          'warning'); return false; }
    if (!cvv || cvv.length < 3) { showToast('Enter a valid CVV', 'warning'); return false; }
  }
  if (paymentMethod === 'upi') {
    const upiId = document.getElementById('upi-id')?.value.trim();
    if (!upiId || !upiId.includes('@')) {
      showToast('Enter a valid UPI ID (e.g. name@upi)', 'warning');
      return false;
    }
  }
  return true;
}

// ── Payment Method Selector ───────────────────────────────────
function initPaymentMethodSelector() {
  const methods = document.querySelectorAll('.payment-method-item');
  methods.forEach(item => {
    item.addEventListener('click', () => selectPaymentMethod(item.dataset.method));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') selectPaymentMethod(item.dataset.method);
    });
  });
}

function selectPaymentMethod(method) {
  paymentMethod = method;

  document.querySelectorAll('.payment-method-item').forEach(item => {
    const selected = item.dataset.method === method;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-checked', selected);
    const dot = item.querySelector('.radio-dot');
    if (dot) dot.style.borderColor = selected ? 'var(--color-primary)' : '';
  });

  // Toggle sub-forms
  const stripeForm = document.getElementById('stripe-form');
  const upiForm    = document.getElementById('upi-form');
  if (stripeForm) { stripeForm.style.display = method === 'card' ? 'block' : 'none'; stripeForm.setAttribute('aria-hidden', method !== 'card'); }
  if (upiForm)    { upiForm.style.display    = method === 'upi'  ? 'block' : 'none'; upiForm.setAttribute('aria-hidden', method !== 'upi'); }
}

// ── Card Number Formatting ────────────────────────────────────
function initCardFormatting() {
  const numInput = document.getElementById('card-number');
  numInput?.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    e.target.value = val.replace(/(.{4})/g, '$1 ').trim();
  });

  const expiryInput = document.getElementById('card-expiry');
  expiryInput?.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) val = val.slice(0, 2) + ' / ' + val.slice(2);
    e.target.value = val;
  });
}

// ── New Address Form ──────────────────────────────────────────
function initNewAddressForm() {
  const toggleBtn    = document.getElementById('toggle-new-address-btn');
  const cancelBtn    = document.getElementById('cancel-address-btn');
  const form         = document.getElementById('new-address-form-el');
  const defaultCheck = document.getElementById('addr-default-check');
  const defaultInput = document.getElementById('addr-default-input');

  toggleBtn?.addEventListener('click', () => {
    const isOpen = document.getElementById('new-address-form').classList.contains('open');
    toggleNewAddressForm(!isOpen);
  });

  cancelBtn?.addEventListener('click', () => toggleNewAddressForm(false));

  defaultCheck?.addEventListener('click', () => {
    defaultCheck.classList.toggle('checked');
    if (defaultInput) defaultInput.checked = defaultCheck.classList.contains('checked');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-address-btn');
    btn.classList.add('loading');

    const payload = {
      full_name:     document.getElementById('addr-full-name')?.value.trim(),
      phone:         document.getElementById('addr-phone')?.value.trim(),
      address_line1: document.getElementById('addr-line1')?.value.trim(),
      address_line2: document.getElementById('addr-line2')?.value.trim(),
      city:          document.getElementById('addr-city')?.value.trim(),
      state:         document.getElementById('addr-state')?.value.trim(),
      pincode:       document.getElementById('addr-pincode')?.value.trim(),
      address_type:  document.getElementById('addr-type')?.value,
      is_default:    document.getElementById('addr-default-input')?.checked || false,
    };

    // Basic validation
    if (!payload.full_name || !payload.address_line1 || !payload.city || !payload.pincode || !payload.phone) {
      showToast('Please fill all required fields', 'warning');
      btn.classList.remove('loading');
      return;
    }
    if (!/^\d{10}$/.test(payload.phone)) {
      showToast('Enter a valid 10-digit phone number', 'warning');
      btn.classList.remove('loading');
      return;
    }
    if (!/^\d{6}$/.test(payload.pincode)) {
      showToast('Enter a valid 6-digit PIN code', 'warning');
      btn.classList.remove('loading');
      return;
    }

    try {
      const data = await apiFetch('/users/addresses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const newAddr = data.data;
      addresses.push(newAddr);
      selectedAddr = newAddr;
      showToast('Address saved successfully ✅', 'success');
      toggleNewAddressForm(false);
      form.reset();
      renderSavedAddresses();
      // Re-select the newly added address
      setTimeout(() => selectAddress(newAddr.id), 50);
    } catch (err) {
      showToast(err.message || 'Failed to save address', 'error');
    } finally {
      btn.classList.remove('loading');
    }
  });
}

function toggleNewAddressForm(open) {
  const form    = document.getElementById('new-address-form');
  const btn     = document.getElementById('toggle-new-address-btn');
  if (!form) return;
  form.classList.toggle('open', open);
  form.setAttribute('aria-hidden', !open);
  if (btn) {
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? '✕ Close Form' : '＋ Add New Address';
  }
}

// ── Populate Review Step ──────────────────────────────────────
function populateReviewStep() {
  // Address
  const addrEl = document.getElementById('review-address');
  if (addrEl && selectedAddr) {
    const a = selectedAddr;
    addrEl.innerHTML = `
      <strong>${escHTML(a.full_name || Auth.getUser()?.full_name || 'User')}</strong><br>
      ${escHTML(a.address_line1)}${a.address_line2 ? ', ' + escHTML(a.address_line2) : ''}<br>
      ${escHTML(a.city)}, ${escHTML(a.state)} — ${escHTML(a.pincode)}<br>
      📞 ${escHTML(a.phone)}
    `;
  }

  // Payment
  const payEl  = document.getElementById('review-payment');
  const labels = { cod: '💵 Cash on Delivery', card: '💳 Credit/Debit Card', upi: '📱 UPI' };
  if (payEl) payEl.innerHTML = `<strong>${labels[paymentMethod] || paymentMethod}</strong>`;

  // Totals
  const { subtotal, couponDiscount, shipping, tax, total } = summaryTotals;
  setText('review-subtotal', formatPrice(subtotal));
  const reviewShipping = document.getElementById('review-shipping');
  if (reviewShipping) reviewShipping.innerHTML = shipping === 0
    ? '<span style="color:var(--color-success);font-weight:600">FREE</span>'
    : formatPrice(shipping);
  setText('review-tax', formatPrice(tax));
  setText('review-total', formatPrice(total));
  const couponRow = document.getElementById('review-coupon-row');
  if (couponRow) {
    couponRow.style.display = couponDiscount > 0 ? 'flex' : 'none';
    setText('review-coupon', `−${formatPrice(couponDiscount)}`);
  }
}

// ── Terms Checkbox ────────────────────────────────────────────
function initTermsCheckbox() {
  const visual = document.getElementById('terms-check-box');
  const hidden = document.getElementById('terms-checkbox');
  visual?.addEventListener('click', () => {
    visual.classList.toggle('checked');
    if (hidden) hidden.checked = visual.classList.contains('checked');
  });
}

// ── Checkbox UI (custom styled checkboxes) ───────────────────
function initCheckboxUI() {
  // Already handled inline per form — nothing extra needed globally
}

// ── Place Order ───────────────────────────────────────────────
function initPlaceOrderButton() {
  const btn = document.getElementById('place-order-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const termsChecked = document.getElementById('terms-checkbox')?.checked;
    if (!termsChecked) {
      showToast('Please accept the Terms of Service to continue', 'warning');
      return;
    }

    if (!selectedAddr) {
      showToast('No delivery address selected', 'error');
      return;
    }

    btn.classList.add('loading');

    const payload = {
      address_id:     selectedAddr.id,
      payment_method: paymentMethod,
      // Include card/upi details for non-COD methods (backend tokenises)
      ...(paymentMethod === 'card' && {
        card_last4:   document.getElementById('card-number')?.value.replace(/\s/g, '').slice(-4),
        card_name:    document.getElementById('card-holder-name')?.value.trim(),
      }),
      ...(paymentMethod === 'upi' && {
        upi_id: document.getElementById('upi-id')?.value.trim(),
      }),
    };

    try {
      const data = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const orderId = data.data?.id || data.order_id;
      showToast('Order placed successfully! 🎉', 'success', 'Order Confirmed');
      setTimeout(() => {
        window.location.href = `/pages/order-success.html?id=${orderId}`;
      }, 600);
    } catch (err) {
      showToast(err.message || 'Failed to place order. Please try again.', 'error');
      btn.classList.remove('loading');
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(text ?? '');
}

function escHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str ?? '')));
  return d.innerHTML;
}
