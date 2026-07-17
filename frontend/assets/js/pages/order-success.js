/**
 * ShopVerse - Order Success Page
 * Fetches and displays the confirmed order, launches confetti
 */

import {
  initPage, apiFetch, showToast, formatPrice, formatDate,
  escapeHTML, getParams, launchConfetti
} from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';

// ── Entry Point ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  await initNavbar();

  const { order_id } = getParams();

  if (!order_id) {
    // No order ID — still show the page but with generic content
    renderGenericSuccess();
    launchConfetti(80);
    return;
  }

  await loadOrderDetails(order_id);
  // Launch confetti after a short delay for drama
  setTimeout(() => launchConfetti(80), 400);
});

// ── Load Order Details ────────────────────────────────────────
async function loadOrderDetails(orderId) {
  try {
    const data = await apiFetch(`/orders/${orderId}`);
    const order = data.data || data;
    renderOrderDetails(order);
    updatePageTitle(order.order_number);
  } catch (err) {
    // Silently fail — show generic success content rather than error page
    renderGenericSuccess();
    console.warn('Order fetch failed:', err.message);
  }
}

// ── Render Order Details ──────────────────────────────────────
function renderOrderDetails(order) {
  // Order number
  const numEl = document.getElementById('detail-order-num');
  if (numEl) numEl.textContent = `#${order.order_number || order.id?.slice(0, 8).toUpperCase()}`;

  // Date
  const dateEl = document.getElementById('detail-order-date');
  if (dateEl && order.created_at) dateEl.textContent = formatDate(order.created_at);

  // Payment method
  const paymentEl = document.getElementById('detail-payment');
  if (paymentEl) {
    const method = order.payment_method || 'Online Payment';
    const labels = {
      upi: '📱 UPI', card: '💳 Card', cod: '💵 Cash on Delivery',
      net_banking: '🏦 Net Banking', wallet: '👛 Wallet',
    };
    paymentEl.textContent = labels[method?.toLowerCase()] || `💳 ${method}`;
  }

  // Total
  const totalEl = document.getElementById('detail-total');
  if (totalEl) totalEl.textContent = formatPrice(order.total_amount || 0);

  // Estimated delivery (3–7 business days from order date)
  const deliveryEl = document.getElementById('detail-delivery');
  if (deliveryEl) {
    const orderDate = order.estimated_delivery
      ? new Date(order.estimated_delivery)
      : addBusinessDays(new Date(order.created_at || Date.now()), 5);
    deliveryEl.textContent = formatDate(orderDate.toISOString());
  }

  // Address
  const addressEl = document.getElementById('detail-address');
  if (addressEl && order.shipping_address) {
    const addr = order.shipping_address;
    const parts = [addr.full_name, addr.address_line1, addr.city, addr.state].filter(Boolean);
    addressEl.textContent = parts.join(', ');
  }

  // Update tracker based on status
  updateTracker(order.status);

  // Render items preview
  const items = order.order_items || [];
  if (items.length) renderItemsPreview(items);
}

// ── Update Order Tracker ──────────────────────────────────────
function updateTracker(status) {
  const steps = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
  const stepEls = {
    confirmed: document.getElementById('step-confirmed'),
    packed: document.getElementById('step-packed'),
    shipped: document.getElementById('step-shipped'),
    delivered: document.getElementById('step-delivered'),
  };

  const currentIdx = steps.indexOf(status?.toLowerCase()) ?? 0;

  Object.entries(stepEls).forEach(([stepName, el]) => {
    if (!el) return;
    const stepIdx = steps.indexOf(stepName);
    if (stepIdx <= currentIdx) {
      el.classList.add('active');
      const dot = el.querySelector('.step-dot');
      if (dot && stepIdx < currentIdx) dot.style.background = 'var(--color-success)';
    }
  });
}

// ── Items Preview ─────────────────────────────────────────────
function renderItemsPreview(items) {
  const container = document.getElementById('order-items-preview');
  const list = document.getElementById('items-list');
  if (!container || !list) return;

  list.innerHTML = items.slice(0, 4).map(item => {
    const product = item.products || item;
    // Extract image either from product_images array or legacy primary_image
    const imgObj = Array.isArray(product.product_images) ? product.product_images.find(img => img.is_primary) || product.product_images[0] : null;
    const img = imgObj?.url || product.primary_image || '../assets/images/placeholder.webp';
    return `
      <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--bg-secondary);border-radius:var(--border-radius)">
        <img
          src="${escapeHTML(img)}"
          alt="${escapeHTML(product.name || 'Product')}"
          style="width:52px;height:52px;object-fit:contain;background:white;border-radius:var(--border-radius-sm);padding:4px;border:1px solid var(--border-color)"
          onerror="this.src='../assets/images/placeholder.webp'"
        >
        <div style="flex:1">
          <div style="font-weight:700;font-size:var(--font-size-sm);color:var(--text-primary)">${escapeHTML(product.name || 'Product')}</div>
          <div style="font-size:var(--font-size-xs);color:var(--text-muted)">Qty: ${item.quantity} × ${formatPrice(item.price || item.unit_price)}</div>
        </div>
        <div style="font-weight:800;font-size:var(--font-size-sm)">${formatPrice((item.price || item.unit_price) * item.quantity)}</div>
      </div>
    `;
  }).join('');

  if (items.length > 4) {
    list.innerHTML += `<div style="text-align:center;font-size:var(--font-size-xs);color:var(--text-muted);padding:var(--space-2)">+${items.length - 4} more items</div>`;
  }

  container.style.display = 'block';
}

// ── Generic Success (no order ID) ─────────────────────────────
function renderGenericSuccess() {
  const numEl = document.getElementById('detail-order-num');
  if (numEl) numEl.textContent = `#SV${Math.floor(Math.random() * 900000 + 100000)}`;

  const dateEl = document.getElementById('detail-order-date');
  if (dateEl) dateEl.textContent = formatDate(new Date().toISOString());

  const deliveryEl = document.getElementById('detail-delivery');
  if (deliveryEl) {
    deliveryEl.textContent = formatDate(addBusinessDays(new Date(), 5).toISOString());
  }

  const totalEl = document.getElementById('detail-total');
  if (totalEl) totalEl.textContent = '—';

  const paymentEl = document.getElementById('detail-payment');
  if (paymentEl) paymentEl.textContent = '💳 Paid';
}

// ── Update Page Title ─────────────────────────────────────────
function updatePageTitle(orderNumber) {
  if (orderNumber) document.title = `Order #${orderNumber} Confirmed! 🎉 — ShopVerse`;
}

// ── Add Business Days ─────────────────────────────────────────
function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++; // skip weekends
  }
  return result;
}
