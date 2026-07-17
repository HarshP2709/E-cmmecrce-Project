/**
 * ShopVerse - Orders Page
 * Lists user orders with status filter tabs and order tracker
 */

import {
  initPage, apiFetch, showToast, formatPrice, formatDate, escapeHTML
} from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';
import { Auth, requireAuth } from '../modules/auth.js';

// ── Entry Point ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  initPage();
  await initNavbar();

  loadSidebarUser();
  initLogout();
  initStatusTabs();
  initOrderSearch();
  initCancelModal();

  await loadOrders();
});

// ── State ─────────────────────────────────────────────────────
let currentStatus = '';
let currentPage = 1;
let pendingCancelOrderId = null;
const ORDERS_PER_PAGE = 5;

// ── Load Sidebar User ─────────────────────────────────────────
function loadSidebarUser() {
  const user = Auth.getUser();
  if (!user) return;

  const nameEl = document.getElementById('sidebar-name');
  const emailEl = document.getElementById('sidebar-email');
  const avatarEl = document.getElementById('sidebar-avatar');

  if (nameEl) nameEl.textContent = user.full_name || user.email?.split('@')[0] || 'User';
  if (emailEl) emailEl.textContent = user.email || '';
  if (avatarEl) {
    if (user.avatar_url) {
      avatarEl.innerHTML = `<img src="${escapeHTML(user.avatar_url)}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      avatarEl.textContent = (user.full_name?.[0] || user.email?.[0] || '👤').toUpperCase();
    }
  }
}

// ── Load Orders ───────────────────────────────────────────────
async function loadOrders(status = currentStatus, page = 1) {
  const list = document.getElementById('orders-list');
  const countLabel = document.getElementById('orders-count-label');
  if (!list) return;

  // Skeleton
  list.innerHTML = [1, 2, 3].map(() =>
    `<div class="skeleton-card" style="height:160px;border-radius:var(--border-radius-lg);margin-bottom:var(--space-4)"></div>`
  ).join('');

  try {
    const params = new URLSearchParams({ page, limit: ORDERS_PER_PAGE });
    if (status) params.set('status', status);

    const data = await apiFetch(`/orders?${params}`);
    const orders = data.data || [];
    const total = data.pagination?.total || orders.length;

    if (countLabel) {
      countLabel.textContent = `${total} order${total !== 1 ? 's' : ''} found`;
    }

    if (!orders.length) {
      list.innerHTML = renderEmptyState(status);
      renderPagination(0, page, ORDERS_PER_PAGE);
      return;
    }

    list.innerHTML = orders.map(renderOrderCard).join('');

    // Manually trigger the reveal animations since these were dynamically injected
    requestAnimationFrame(() => {
      list.querySelectorAll('.reveal').forEach((el, idx) => {
        setTimeout(() => el.classList.add('revealed'), idx * 75);
      });
    });

    renderPagination(total, page, ORDERS_PER_PAGE);

    // Attach cancel buttons
    list.querySelectorAll('[data-action="cancel-order"]').forEach(btn => {
      btn.addEventListener('click', () => openCancelModal(btn.dataset.orderId, btn.dataset.orderNum));
    });
  } catch (err) {
    list.innerHTML = `
      <div style="text-align:center;padding:var(--space-12);color:var(--text-muted)">
        <div style="font-size:3rem;margin-bottom:var(--space-4)">⚠️</div>
        <p>Failed to load orders. <button class="btn btn-ghost btn-sm" onclick="window.location.reload()">Retry</button></p>
      </div>
    `;
    showToast(err.message || 'Failed to load orders.', 'error');
  }
}

// ── Render Single Order Card ──────────────────────────────────
function renderOrderCard(order) {
  const statusKey = order.status?.toLowerCase().replace(/\s+/g, '_');
  const isCancellable = ['pending', 'confirmed'].includes(statusKey);
  const items = order.order_items || [];

  const steps = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
  const currentStep = steps.indexOf(statusKey);

  return `
    <div class="order-card reveal" role="article" aria-label="Order ${escapeHTML(order.order_number)}">
      <div class="order-card-header">
        <div>
          <div class="order-number">Order #${escapeHTML(order.order_number)}</div>
          <div class="order-date">${formatDate(order.created_at)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-3)">
          <span class="order-status-badge status-${statusKey}">${formatStatus(order.status)}</span>
          ${isCancellable ? `
            <button
              class="btn btn-sm"
              style="font-size:var(--font-size-xs);padding:4px 10px;border:1px solid var(--color-danger);color:var(--color-danger);background:transparent"
              data-action="cancel-order"
              data-order-id="${order.id}"
              data-order-num="${escapeHTML(order.order_number)}"
              aria-label="Cancel order ${escapeHTML(order.order_number)}"
            >Cancel</button>
          ` : ''}
        </div>
      </div>

      <!-- Order Tracker -->
      ${statusKey !== 'cancelled' && statusKey !== 'refunded' ? `
        <div style="padding:var(--space-4) var(--space-6);border-bottom:1px solid var(--border-color)">
          <div class="order-tracker" role="list" aria-label="Order status tracker">
            ${steps.map((step, idx) => `
              <div class="tracker-step ${idx <= currentStep ? (idx < currentStep ? 'done' : 'current') : ''}" role="listitem">
                <div class="tracker-dot">${idx < currentStep ? '✓' : (idx === currentStep ? '●' : '')}</div>
                <span class="tracker-label">${formatStatus(step)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Order Items -->
      <div class="order-card-items">
        ${items.slice(0, 3).map(item => `
          <div class="order-item-row">
            <img
              src="${escapeHTML((Array.isArray(item.products?.product_images) ? (item.products.product_images.find(i => i.is_primary) || item.products.product_images[0])?.url : item.products?.primary_image) || item.primary_image || '../assets/images/placeholder.webp')}"
              alt="${escapeHTML(item.products?.name || item.name || 'Product')}"
              class="order-item-img"
              loading="lazy"
              onerror="this.src='../assets/images/placeholder.webp'"
            >
            <div>
              <div class="order-item-name">${escapeHTML(item.products?.name || item.name || 'Product')}</div>
              <div class="order-item-qty">Qty: ${item.quantity}</div>
            </div>
            <div class="order-item-price">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join('')}
        ${items.length > 3 ? `
          <div style="font-size:var(--font-size-xs);color:var(--text-muted);font-weight:600">
            +${items.length - 3} more item${items.length - 3 !== 1 ? 's' : ''}
          </div>
        ` : ''}
      </div>

      <!-- Footer -->
      <div class="order-card-footer">
        <div>
          <div class="order-total-label">Order Total</div>
          <div class="order-total">${formatPrice(order.total_amount)}</div>
        </div>
        <div style="display:flex;gap:var(--space-2)">
          <a href="order-success.html?order_id=${order.id}" class="btn btn-ghost btn-sm">View Details</a>
          ${order.status === 'delivered' ? `<button class="btn btn-primary btn-sm" onclick="window.location.href='products.html'">Buy Again</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ── Empty State ───────────────────────────────────────────────
function renderEmptyState(status) {
  const messages = {
    '': { icon: '📦', title: 'No orders yet!', desc: 'Start shopping to see your orders here.' },
    pending: { icon: '⏳', title: 'No pending orders', desc: 'All caught up! No orders awaiting confirmation.' },
    confirmed: { icon: '✅', title: 'No confirmed orders', desc: '' },
    shipped: { icon: '🚚', title: 'Nothing shipped yet', desc: '' },
    delivered: { icon: '🎁', title: 'No delivered orders', desc: '' },
    cancelled: { icon: '❌', title: 'No cancelled orders', desc: 'Great news — nothing cancelled!' },
  };
  const { icon, title, desc } = messages[status] || messages[''];
  return `
    <div style="text-align:center;padding:var(--space-16);color:var(--text-muted)">
      <div style="font-size:4rem;margin-bottom:var(--space-5)">${icon}</div>
      <h3 style="font-size:var(--font-size-xl);font-weight:800;color:var(--text-primary);margin-bottom:var(--space-3)">${title}</h3>
      ${desc ? `<p style="margin-bottom:var(--space-6)">${desc}</p>` : ''}
      <a href="products.html" class="btn btn-primary">🛍️ Start Shopping</a>
    </div>
  `;
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination(total, current, perPage) {
  const container = document.getElementById('orders-pagination');
  if (!container) return;

  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button
        class="btn ${i === current ? 'btn-primary' : 'btn-ghost'} btn-sm"
        data-page="${i}"
        aria-label="Page ${i}"
        ${i === current ? 'aria-current="page"' : ''}
      >${i}</button>
    `;
  }
  container.innerHTML = html;
  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      loadOrders(currentStatus, currentPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ── Status Filter Tabs ────────────────────────────────────────
function initStatusTabs() {
  document.querySelectorAll('.order-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.order-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.style.background = 'transparent';
        t.style.color = 'var(--text-secondary)';
        t.style.border = '1px solid transparent';
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.style.background = 'var(--color-primary)';
      tab.style.color = 'white';
      tab.style.border = '1px solid var(--color-primary)';

      currentStatus = tab.dataset.status;
      currentPage = 1;
      loadOrders(currentStatus, 1);
    });
  });

  // Style inactive tabs initially
  document.querySelectorAll('.order-tab:not(.active)').forEach(t => {
    t.style.cssText = `
      padding: 8px 16px; border-radius: var(--border-radius-pill);
      border: 1px solid var(--border-color); background: transparent;
      color: var(--text-secondary); font-size: var(--font-size-sm);
      font-weight: 600; cursor: pointer; transition: all 0.2s;
    `;
  });
  const active = document.querySelector('.order-tab.active');
  if (active) {
    active.style.cssText = `
      padding: 8px 16px; border-radius: var(--border-radius-pill);
      border: 1px solid var(--color-primary); background: var(--color-primary);
      color: white; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
    `;
  }
}

// ── Order Search ──────────────────────────────────────────────
function initOrderSearch() {
  const input = document.getElementById('orders-search');
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const q = input.value.trim();
      if (!q) {
        loadOrders(currentStatus, 1);
        return;
      }

      const list = document.getElementById('orders-list');
      const countLabel = document.getElementById('orders-count-label');
      list.innerHTML = `<div class="skeleton-card" style="height:120px;border-radius:var(--border-radius-lg)"></div>`;

      try {
        const data = await apiFetch(`/orders?search=${encodeURIComponent(q)}&limit=20`);
        const orders = data.data || [];
        if (countLabel) countLabel.textContent = `${orders.length} result${orders.length !== 1 ? 's' : ''} for "${q}"`;
        list.innerHTML = orders.length ? orders.map(renderOrderCard).join('') : renderEmptyState('');

        requestAnimationFrame(() => {
          list.querySelectorAll('.reveal').forEach((el, idx) => {
            setTimeout(() => el.classList.add('revealed'), idx * 75);
          });
        });
      } catch (err) {
        showToast('Search failed.', 'error');
      }
    }, 400);
  });
}

// ── Cancel Modal ──────────────────────────────────────────────
function initCancelModal() {
  const modal = document.getElementById('cancel-modal');
  const closeBtn = document.getElementById('cancel-modal-close');
  const dismissBtn = document.getElementById('cancel-modal-dismiss');
  const confirmBtn = document.getElementById('cancel-modal-confirm');

  const close = () => {
    if (modal) modal.style.display = 'none';
    pendingCancelOrderId = null;
  };

  closeBtn?.addEventListener('click', close);
  dismissBtn?.addEventListener('click', close);
  modal?.addEventListener('click', (e) => { if (e.target === modal) close(); });

  confirmBtn?.addEventListener('click', async () => {
    if (!pendingCancelOrderId) return;

    confirmBtn.classList.add('loading');
    confirmBtn.textContent = 'Cancelling…';

    const reason = document.getElementById('cancel-reason')?.value;

    try {
      await apiFetch(`/orders/${pendingCancelOrderId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      });
      showToast('Order cancelled successfully.', 'success');
      close();
      await loadOrders(currentStatus, currentPage);
    } catch (err) {
      showToast(err.message || 'Failed to cancel order.', 'error');
    } finally {
      confirmBtn.classList.remove('loading');
      confirmBtn.textContent = 'Cancel Order';
    }
  });
}

function openCancelModal(orderId, orderNum) {
  pendingCancelOrderId = orderId;
  const numEl = document.getElementById('cancel-order-num');
  if (numEl) numEl.textContent = `#${orderNum}`;
  const modal = document.getElementById('cancel-modal');
  if (modal) modal.style.display = 'flex';
}

// ── Logout ────────────────────────────────────────────────────
function initLogout() {
  document.getElementById('profile-logout-btn')?.addEventListener('click', async () => {
    await Auth.logout();
  });
}

// ── Format Status Label ───────────────────────────────────────
function formatStatus(status) {
  const labels = {
    pending: 'Pending', confirmed: 'Confirmed', packed: 'Packed',
    shipped: 'Shipped', out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded',
  };
  return labels[status?.toLowerCase()] || status;
}
