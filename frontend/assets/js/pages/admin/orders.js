/**
 * ShopVerse Admin — Orders Management
 * Load, filter, paginate orders; open detail modal; update status.
 */

import { initPage, apiFetch, showToast, formatPrice, formatDate, debounce } from '../../modules/utils.js';
import { Auth, requireAdmin } from '../../modules/auth.js';

/* ── Guard ─────────────────────────────────────────────────── */
if (!requireAdmin()) throw new Error('Unauthorised');

/* ── State ─────────────────────────────────────────────────── */
const state = {
  page:         1,
  limit:        15,
  total:        0,
  status:       '',    // active status filter tab
  search:       '',
  activeOrderId: null,
};

/* ── DOM refs ─────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  populateUserInfo();
  initAdminSidebar();
  initThemeToggle();

  await loadOrders();

  initStatusTabs();
  initOrderSearch();
  initOrderModal();
});

/* ── User Info ──────────────────────────────────────────────── */
function populateUserInfo() {
  const user = Auth.getUser();
  if (!user) return;
  const name = user.full_name || user.email || 'Admin';
  ['topbar-name', 'sidebar-name'].forEach(id => {
    const el = $(id); if (el) el.textContent = name.split(' ')[0];
  });
  ['topbar-avatar', 'sidebar-avatar'].forEach(id => {
    const el = $(id); if (!el) return;
    el.textContent = (name[0] || 'A').toUpperCase();
  });
}

/* ── Admin Sidebar Toggle ───────────────────────────────────── */
function initAdminSidebar() {
  const hamburger = $('admin-hamburger');
  const sidebar   = $('admin-sidebar');
  const overlay   = $('sidebar-overlay');
  const toggle = (open) => {
    sidebar?.classList.toggle('open', open);
    overlay?.classList.toggle('active', open);
    hamburger?.setAttribute('aria-expanded', String(open));
  };
  hamburger?.addEventListener('click', () => toggle(!sidebar.classList.contains('open')));
  overlay?.addEventListener('click',   () => toggle(false));
}

function initThemeToggle() {
  const btn = $('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', JSON.stringify(next));
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

/* ── Load Orders ─────────────────────────────────────────────── */
async function loadOrders() {
  const tbody = $('orders-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="admin-table-loading">Loading orders…</td></tr>`;

  try {
    const params = new URLSearchParams({
      page:  state.page,
      limit: state.limit,
      ...(state.status && { status: state.status }),
    });

    const { data, pagination } = await apiFetch(`/admin/orders?${params}`);
    state.total = pagination?.total || 0;

    renderOrdersTable(data || []);
    renderPagination();

    const countEl = $('orders-total-count');
    if (countEl) countEl.textContent = state.total;

  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="admin-table-empty">Failed to load orders. ${escHTML(err.message)}</td></tr>`;
    showToast(err.message || 'Failed to load orders', 'error');
  }
}

/* ── Render Orders Table ─────────────────────────────────────── */
function renderOrdersTable(orders) {
  const tbody = $('orders-tbody');
  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="admin-table-empty">No orders found for this filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const statusClass = `status-${escHTML(o.status)}`;
    const payment     = o.payment_method ? o.payment_method.toUpperCase() : '—';
    const items       = o.total_items ?? o.item_count ?? '—';

    return `
      <tr>
        <td>
          <span class="text-primary font-bold">#${escHTML(o.order_number || o.id?.slice(0, 8))}</span>
        </td>
        <td>
          <div class="font-bold text-sm">${escHTML(o.customer_name || o.full_name || '—')}</div>
          <div class="text-xs text-muted">${escHTML(o.customer_email || o.email || '')}</div>
        </td>
        <td class="text-sm text-muted">${formatDate(o.created_at)}</td>
        <td class="text-sm">${items}</td>
        <td class="font-bold">${formatPrice(o.total_amount)}</td>
        <td>
          <span class="badge badge-info text-xs">${escHTML(payment)}</span>
        </td>
        <td>
          <span class="order-status-badge ${statusClass}">${statusLabel(o.status)}</span>
        </td>
        <td>
          <button
            class="btn btn-sm btn-outline open-order-btn"
            data-id="${escHTML(o.id)}"
            aria-label="View order ${escHTML(o.order_number || o.id)}"
          >View</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.open-order-btn').forEach(btn =>
    btn.addEventListener('click', () => openOrderDetail(btn.dataset.id)));
}

/* ── Status Filter Tabs ─────────────────────────────────────── */
function initStatusTabs() {
  document.querySelectorAll('.admin-status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-status-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      state.status = tab.dataset.status || '';
      state.page   = 1;
      loadOrders();
    });
  });
}

/* ── Order Search ────────────────────────────────────────────── */
function initOrderSearch() {
  const input = $('order-search');
  input?.addEventListener('input', debounce(e => {
    state.search = e.target.value.trim();
    state.page   = 1;
    loadOrders();
  }, 400));
}

/* ── Pagination ──────────────────────────────────────────────── */
function renderPagination() {
  const container = $('orders-pagination');
  if (!container) return;
  const pages = Math.ceil(state.total / state.limit);
  if (pages <= 1) { container.innerHTML = ''; return; }

  const from = Math.max(1, state.page - 2);
  const to   = Math.min(pages, state.page + 2);
  let html   = `<button class="page-btn" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="Previous">‹</button>`;
  if (from > 1)   html += `<button class="page-btn" data-page="1">1</button>${from > 2 ? '<span class="page-btn" aria-hidden="true">…</span>' : ''}`;
  for (let i = from; i <= to; i++)
    html += `<button class="page-btn ${i === state.page ? 'active' : ''}" data-page="${i}" ${i === state.page ? 'aria-current="page"' : ''}>${i}</button>`;
  if (to < pages) html += `${to < pages - 1 ? '<span class="page-btn" aria-hidden="true">…</span>' : ''}<button class="page-btn" data-page="${pages}">${pages}</button>`;
  html += `<button class="page-btn" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''} aria-label="Next">›</button>`;

  container.innerHTML = html;
  container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (p !== state.page && p >= 1 && p <= pages) { state.page = p; loadOrders(); }
    });
  });
}

/* ── Order Detail Modal ─────────────────────────────────────── */
function initOrderModal() {
  const modal    = $('order-modal');
  const closeBtn = $('order-modal-close');

  const close = () => {
    modal?.classList.remove('active');
    state.activeOrderId = null;
  };

  closeBtn?.addEventListener('click', close);
  modal?.addEventListener('click', e => { if (e.target === modal) close(); });

  $('update-status-btn')?.addEventListener('click', updateOrderStatus);
}

async function openOrderDetail(orderId) {
  state.activeOrderId = orderId;
  const modal = $('order-modal');
  if (!modal) return;

  // Clear previous content with skeletons
  $('order-detail-meta').innerHTML   = `<div class="skeleton skeleton-text" style="height:60px"></div>`;
  $('order-timeline').innerHTML      = `<div class="skeleton skeleton-text"></div>`;
  $('order-detail-items').innerHTML  = `<div class="skeleton skeleton-card"></div>`;
  $('order-shipping-address').textContent = 'Loading…';
  $('order-price-breakdown').innerHTML    = `<div class="skeleton skeleton-text"></div>`;

  modal.classList.add('active');

  try {
    // Use admin orders endpoint + order id via the general order endpoint
    const { data: order } = await apiFetch(`/orders/${orderId}`);
    renderOrderDetail(order);
    // Pre-select current status in dropdown
    const sel = $('new-status-select');
    if (sel) sel.value = order.status;
  } catch (err) {
    showToast('Failed to load order details: ' + err.message, 'error');
  }
}

function renderOrderDetail(order) {
  const titleEl = $('order-modal-title');
  if (titleEl) titleEl.textContent = `Order #${order.order_number || order.id?.slice(0, 8)}`;

  /* Meta card */
  const metaEl = $('order-detail-meta');
  if (metaEl) {
    metaEl.innerHTML = `
      <div class="order-detail-meta-grid">
        <div><span class="text-xs text-muted">Placed</span><div class="font-bold">${formatDate(order.created_at)}</div></div>
        <div><span class="text-xs text-muted">Payment</span><div class="font-bold">${(order.payment_method || '—').toUpperCase()}</div></div>
        <div><span class="text-xs text-muted">Status</span><div><span class="order-status-badge status-${escHTML(order.status)}">${statusLabel(order.status)}</span></div></div>
        <div><span class="text-xs text-muted">Total</span><div class="font-bold" style="color:var(--color-primary)">${formatPrice(order.total_amount)}</div></div>
      </div>
    `;
  }

  /* Timeline */
  const timelineEl = $('order-timeline');
  if (timelineEl) {
    const allStatuses = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
    const currentIdx  = allStatuses.indexOf(order.status);
    timelineEl.innerHTML = allStatuses.map((s, i) => {
      const done    = i < currentIdx || order.status === 'delivered';
      const current = s === order.status;
      const cls     = done ? 'done' : current ? 'current' : '';
      return `
        <div class="tracker-step ${cls}">
          <div class="tracker-dot">${done ? '✓' : (current ? '•' : '')}</div>
          <div class="tracker-label">${statusShortLabel(s)}</div>
        </div>
      `;
    }).join('');
  }

  /* Items */
  const itemsEl = $('order-detail-items');
  if (itemsEl) {
    const items = order.order_items || [];
    if (!items.length) {
      itemsEl.innerHTML = '<p class="text-muted text-sm">No items.</p>';
    } else {
      itemsEl.innerHTML = items.map(item => `
        <div class="order-item-row">
          <div class="order-item-img" style="background:var(--bg-secondary);border-radius:var(--border-radius-sm);overflow:hidden;flex-shrink:0;width:48px;height:48px">
            ${item.image_url
              ? `<img src="${escHTML(item.image_url)}" alt="${escHTML(item.product_name)}" style="width:100%;height:100%;object-fit:contain;padding:4px" loading="lazy">`
              : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.3rem">📦</div>`
            }
          </div>
          <div style="flex:1">
            <div class="font-bold text-sm">${escHTML(item.product_name)}</div>
            <div class="text-xs text-muted">Qty: ${item.quantity}</div>
          </div>
          <div class="font-bold text-sm">${formatPrice(item.total || item.price * item.quantity)}</div>
        </div>
      `).join('');
    }
  }

  /* Shipping Address */
  const addrEl = $('order-shipping-address');
  if (addrEl) {
    const a = order.shipping_address || {};
    addrEl.innerHTML = [
      escHTML(a.full_name || a.name || ''),
      escHTML(a.address_line1 || a.line1 || ''),
      escHTML(a.address_line2 || a.line2 || ''),
      [escHTML(a.city || ''), escHTML(a.state || ''), escHTML(a.postal_code || a.zip || '')].filter(Boolean).join(', '),
      escHTML(a.country || ''),
      a.phone ? `📞 ${escHTML(a.phone)}` : '',
    ].filter(Boolean).join('<br>') || '—';
  }

  /* Price breakdown */
  const priceEl = $('order-price-breakdown');
  if (priceEl) {
    priceEl.innerHTML = `
      <div class="summary-row"><span>Subtotal</span><span>${formatPrice(order.subtotal)}</span></div>
      ${order.discount_amount > 0 ? `<div class="summary-row discount"><span>Discount</span><span>−${formatPrice(order.discount_amount)}</span></div>` : ''}
      <div class="summary-row"><span>Shipping</span><span>${order.shipping_amount === 0 ? 'Free' : formatPrice(order.shipping_amount)}</span></div>
      <div class="summary-row"><span>Tax (18% GST)</span><span>${formatPrice(order.tax_amount)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatPrice(order.total_amount)}</span></div>
    `;
  }
}

/* ── Update Order Status ─────────────────────────────────────── */
async function updateOrderStatus() {
  if (!state.activeOrderId) return;
  const newStatus = $('new-status-select')?.value;
  const note      = $('status-note')?.value?.trim() || '';
  const btn       = $('update-status-btn');

  if (!newStatus) return;

  btn?.classList.add('loading');
  try {
    await apiFetch(`/orders/${state.activeOrderId}/status`, {
      method: 'PATCH',
      body:   JSON.stringify({ status: newStatus, note }),
    });

    showToast(`Status updated to "${statusLabel(newStatus)}" ✅`, 'success', 'Orders');

    // Refresh the modal
    await openOrderDetail(state.activeOrderId);

    // Refresh table in background
    loadOrders();
  } catch (err) {
    showToast(err.message || 'Status update failed.', 'error', 'Orders');
  } finally {
    btn?.classList.remove('loading');
  }
}

/* ── Helpers ─────────────────────────────────────────────────── */
function escHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str ?? '')));
  return d.innerHTML;
}

function statusLabel(s) {
  const map = {
    pending:          '⏳ Pending',
    confirmed:        '✅ Confirmed',
    packed:           '📦 Packed',
    shipped:          '🚚 Shipped',
    out_for_delivery: '🛵 Out for Delivery',
    delivered:        '🎉 Delivered',
    cancelled:        '❌ Cancelled',
    refunded:         '↩️ Refunded',
  };
  return map[s] || s;
}

function statusShortLabel(s) {
  const map = {
    pending:   'Placed',
    confirmed: 'Confirmed',
    packed:    'Packed',
    shipped:   'Shipped',
    delivered: 'Delivered',
  };
  return map[s] || s;
}
