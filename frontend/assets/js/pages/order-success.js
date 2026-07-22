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

  const params = getParams();
  const orderId = params.order_id || params.id;

  if (!orderId) {
    // No order ID — still show the page but with generic content
    renderGenericSuccess();
    launchConfetti(80);
    return;
  }

  await loadOrderDetails(orderId);
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

  // Total & Breakdown Calculation
  const itemsList = order.order_items || [];
  const subtotal = itemsList.reduce((sum, item) => sum + ((item.price || item.unit_price || item.products?.price || 0) * item.quantity), 0);
  const shippingAmt = subtotal >= 499 ? 0 : 49;
  const totalAmt = order.total_amount || (subtotal + shippingAmt);
  const taxAmt = totalAmt - subtotal - shippingAmt > 0 ? totalAmt - subtotal - shippingAmt : Math.round(subtotal * 0.18);

  const subtotalEl = document.getElementById('detail-subtotal');
  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);

  const taxEl = document.getElementById('detail-tax');
  if (taxEl) taxEl.textContent = formatPrice(taxAmt);

  const shipEl = document.getElementById('detail-shipping');
  if (shipEl) shipEl.innerHTML = shippingAmt === 0 ? '<span style="color:var(--color-success)">FREE</span>' : formatPrice(shippingAmt);

  // Total
  const totalEl = document.getElementById('detail-total');
  if (totalEl) totalEl.textContent = formatPrice(totalAmt);

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

  // Initialize Invoice button
  initInvoiceDownload(order);
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

  list.innerHTML = items.map(item => {
    const product = item.products || {};
    const name = product.name || item.name || item.product_id || 'Product';
    // Extract image either from product_images array or legacy primary_image
    const imgObj = Array.isArray(product.product_images) ? product.product_images.find(img => img.is_primary) || product.product_images[0] : null;
    const img = imgObj?.url || product.primary_image || item.primary_image || '../assets/images/placeholder.webp';
    const price = item.price || item.unit_price || product.price || 0;
    return `
      <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--bg-secondary);border-radius:var(--border-radius)">
        <img
          src="${escapeHTML(img)}"
          alt="${escapeHTML(name)}"
          style="width:52px;height:52px;object-fit:contain;background:white;border-radius:var(--border-radius-sm);padding:4px;border:1px solid var(--border-color)"
          onerror="this.src='../assets/images/placeholder.webp'"
        >
        <div style="flex:1">
          <div style="font-weight:700;font-size:var(--font-size-sm);color:var(--text-primary)">${escapeHTML(name)}</div>
          <div style="font-size:var(--font-size-xs);color:var(--text-muted)">Qty: ${item.quantity} × ${formatPrice(price)}</div>
        </div>
        <div style="font-weight:800;font-size:var(--font-size-sm)">${formatPrice(price * item.quantity)}</div>
      </div>
    `;
  }).join('');

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
  let count = 0;
  while (count < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return result;
}

// ── Invoice Download ─────────────────────────────────────────
function initInvoiceDownload(order) {
  const downloadBtn = document.getElementById('download-invoice-btn');
  if (!downloadBtn) return;

  downloadBtn.addEventListener('click', () => {
    const orderNum = order.order_number || order.id?.slice(0, 8).toUpperCase() || 'SV-ORDER';
    const dateStr = order.created_at ? formatDate(order.created_at) : formatDate(new Date().toISOString());
    const paymentMethodLabel = (order.payment_method || 'Paid').toUpperCase();
    const addr = order.shipping_address || {};

    const items = order.order_items || [];
    let subtotal = 0;
    const itemsHtml = items.map(item => {
      const product = item.products || {};
      const name = product.name || item.name || item.product_id || 'Product';
      const price = item.price || item.unit_price || product.price || 0;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: #111;">${escapeHTML(name)}</div>
            <div style="font-size: 12px; color: #666;">ID: ${escapeHTML(item.product_id)}</div>
          </td>
          <td class="num">${item.quantity}</td>
          <td class="num">${formatPrice(price)}</td>
          <td class="num">${formatPrice(itemTotal)}</td>
        </tr>
      `;
    }).join('');

    const shipping = subtotal >= 499 ? 0 : 49;
    const total = order.total_amount || (subtotal + shipping);
    const tax = total - subtotal - shipping > 0 ? total - subtotal - shipping : Math.round(subtotal * 0.18);

    const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${orderNum}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #333;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #eaeaea;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo-container {
      display: flex;
      flex-direction: column;
    }
    .logo {
      font-size: 26px;
      font-weight: 850;
      color: #7c3aed;
      letter-spacing: -0.5px;
    }
    .tagline {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    .invoice-title-box {
      text-align: right;
    }
    .invoice-title {
      font-size: 28px;
      font-weight: 800;
      color: #111;
      margin: 0;
    }
    .invoice-number {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
      font-weight: 600;
    }
    .details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      gap: 20px;
    }
    .address-col {
      width: 45%;
    }
    .details-col {
      width: 45%;
      text-align: right;
    }
    .section-title {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      color: #888;
      margin-bottom: 8px;
      letter-spacing: 0.8px;
    }
    .address-box {
      font-size: 14px;
      line-height: 1.5;
      color: #444;
    }
    .meta-value {
      font-size: 14px;
      line-height: 1.6;
      color: #111;
    }
    .meta-value span {
      color: #666;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .table th {
      background: #f9fafb;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      color: #666;
      border-bottom: 2px solid #eaeaea;
      padding: 12px 10px;
      text-align: left;
      letter-spacing: 0.5px;
    }
    .table th.num { text-align: right; }
    .table td {
      padding: 12px 10px;
      font-size: 14px;
      border-bottom: 1px solid #eaeaea;
      color: #444;
    }
    .table td.num { text-align: right; }
    .summary-container {
      display: flex;
      justify-content: flex-end;
    }
    .summary-table {
      width: 300px;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 8px 12px;
      font-size: 14px;
      color: #444;
    }
    .summary-table td.label {
      color: #666;
      text-align: right;
    }
    .summary-table td.value {
      font-weight: 600;
      text-align: right;
      color: #111;
    }
    .summary-table tr.total td {
      font-size: 18px;
      font-weight: 800;
      border-top: 2px solid #ea580c;
      padding-top: 12px;
      color: #ea580c;
    }
    .footer {
      margin-top: 60px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eaeaea;
      padding-top: 20px;
    }
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      <div class="logo">ShopVerse</div>
      <div class="tagline">Your Premium Marketplace</div>
    </div>
    <div class="invoice-title-box">
      <h1 class="invoice-title">INVOICE</h1>
      <div class="invoice-number">#INV-${orderNum}</div>
    </div>
  </div>

  <div class="details">
    <div class="address-col">
      <div class="section-title">Shipping Address</div>
      <div class="address-box">
        <strong>${escapeHTML(addr.full_name || 'Customer')}</strong><br>
        ${escapeHTML(addr.address_line1 || '')}<br>
        ${escapeHTML(addr.city || '')}, ${escapeHTML(addr.state || '')} - ${escapeHTML(addr.postal_code || '')}<br>
        Phone: ${escapeHTML(addr.phone || 'N/A')}
      </div>
    </div>
    <div class="details-col">
      <div class="section-title">Order Details</div>
      <div class="meta-value"><span>Invoice Date:</span> ${dateStr}</div>
      <div class="meta-value"><span>Payment Method:</span> ${paymentMethodLabel}</div>
      <div class="meta-value"><span>Order Status:</span> Confirmed</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th style="width: 50%;">Product Name</th>
        <th class="num" style="width: 10%;">Qty</th>
        <th class="num" style="width: 20%;">Unit Price</th>
        <th class="num" style="width: 20%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="summary-container">
    <table class="summary-table">
      <tr>
        <td class="label">Subtotal</td>
        <td class="value">${formatPrice(subtotal)}</td>
      </tr>
      <tr>
        <td class="label">Tax (18% GST)</td>
        <td class="value">${formatPrice(tax)}</td>
      </tr>
      <tr>
        <td class="label">Shipping</td>
        <td class="value">${shipping === 0 ? 'FREE' : formatPrice(shipping)}</td>
      </tr>
      <tr class="total">
        <td class="label" style="color: #ea580c;">Grand Total</td>
        <td class="value">${formatPrice(total)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>Thank you for shopping at ShopVerse!</p>
    <p style="font-size: 11px;">If you have any questions about this invoice, please contact support@shopverse.com</p>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
    } else {
      showToast('Popup blocked! Please allow popups to download invoice.', 'warning');
    }
  });
}
