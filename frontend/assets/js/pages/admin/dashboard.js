/**
 * ShopVerse Admin — Dashboard
 * Fetches stats, renders revenue chart (Canvas 2D), recent orders, low-stock alerts.
 */

import { initPage, apiFetch, showToast, formatPrice, formatDate } from '../../modules/utils.js';
import { Auth, requireAdmin } from '../../modules/auth.js';

/* ── Guard ─────────────────────────────────────────────────── */
if (!requireAdmin()) throw new Error('Unauthorised');

document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  populateUserInfo();
  initAdminSidebar();
  initThemeToggle();

  await loadDashboard();
  await loadRevenueChart(7);

  initChartPeriodBtns();
});

/* ── User Info ──────────────────────────────────────────────── */
function populateUserInfo() {
  const user = Auth.getUser();
  if (!user) return;

  const name     = user.full_name || user.email || 'Admin';
  const initials = (name[0] || 'A').toUpperCase();

  ['topbar-name', 'sidebar-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = name.split(' ')[0];
  });

  ['topbar-avatar', 'sidebar-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (user.avatar_url) {
      el.innerHTML = `<img src="${user.avatar_url}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      el.textContent = initials;
    }
  });
}

/* ── Admin Sidebar Mobile Toggle ────────────────────────────── */
function initAdminSidebar() {
  const hamburger = document.getElementById('admin-hamburger');
  const sidebar   = document.getElementById('admin-sidebar');
  const overlay   = document.getElementById('sidebar-overlay');

  const toggle = (open) => {
    sidebar?.classList.toggle('open', open);
    overlay?.classList.toggle('active', open);
    hamburger?.setAttribute('aria-expanded', open);
  };

  hamburger?.addEventListener('click', () => toggle(!sidebar.classList.contains('open')));
  overlay?.addEventListener('click',   () => toggle(false));
}

/* ── Theme Toggle ───────────────────────────────────────────── */
function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', JSON.stringify(next));
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

/* ── Load Dashboard Stats ───────────────────────────────────── */
async function loadDashboard() {
  try {
    const { data } = await apiFetch('/admin/dashboard');

    animateCount('stat-revenue',   data.totalRevenue,   formatPrice);
    animateCount('stat-orders',    data.totalOrders,    n => n.toLocaleString('en-IN'));
    animateCount('stat-customers', data.totalCustomers, n => n.toLocaleString('en-IN'));
    animateCount('stat-products',  data.totalProducts,  n => n.toLocaleString('en-IN'));

    // Static change labels (would need historical comparison for real deltas)
    setText('stat-revenue-change',   '↑ All time revenue');
    setText('stat-orders-change',    '↑ Total placed');
    setText('stat-customers-change', '↑ Registered users');
    setText('stat-products-change',  '↑ Active listings');

    renderRecentOrders(data.recentOrders || []);
    renderLowStock(data.lowStock || []);

    // Badge for pending orders
    const pendingBadge = document.getElementById('pending-badge');
    if (pendingBadge && data.pendingOrders > 0) {
      pendingBadge.textContent = data.pendingOrders;
      pendingBadge.hidden = false;
    }
  } catch (err) {
    showToast(err.message || 'Failed to load dashboard', 'error', 'Dashboard');
  }
}

/* ── Animated Count-Up ──────────────────────────────────────── */
function animateCount(elId, target, format = n => n) {
  const el = document.getElementById(elId);
  if (!el) return;
  const numTarget = parseFloat(target) || 0;
  const duration  = 1200;
  const start     = performance.now();

  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    el.textContent = format(Math.round(numTarget * eased));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ── Render Recent Orders Table ─────────────────────────────── */
function renderRecentOrders(orders) {
  const tbody = document.getElementById('recent-orders-body');
  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">No recent orders.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>
        <a href="orders.html" class="text-primary font-bold" style="text-decoration:none">
          #${escHTML(o.order_number || o.id?.slice(0, 8))}
        </a>
      </td>
      <td>${escHTML(o.customer_name || o.full_name || '—')}</td>
      <td class="text-muted text-sm">${formatDate(o.created_at)}</td>
      <td class="font-bold">${formatPrice(o.total_amount)}</td>
      <td><span class="order-status-badge status-${escHTML(o.status)}">${statusLabel(o.status)}</span></td>
    </tr>
  `).join('');
}

/* ── Render Low Stock Table ─────────────────────────────────── */
function renderLowStock(items) {
  const tbody = document.getElementById('low-stock-body');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">✅ No low-stock items.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const product = item.products || {};
    const qty     = item.quantity ?? 0;
    const level   = qty === 0 ? 'out-of-stock' : qty <= 5 ? 'low-stock' : 'low-stock';
    const label   = qty === 0 ? 'Out of Stock' : `${qty} left`;

    return `
      <tr>
        <td class="font-bold">${escHTML(product.name || '—')}</td>
        <td class="text-muted text-sm">${escHTML(item.sku || '—')}</td>
        <td>${qty}</td>
        <td><span class="product-stock-badge ${level}">${label}</span></td>
        <td>
          <a href="products.html" class="btn btn-sm btn-outline">Restock</a>
        </td>
      </tr>
    `;
  }).join('');
}

/* ── Revenue Chart (Canvas 2D) ───────────────────────────────── */
let chartData = [];

async function loadRevenueChart(days) {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Show skeleton while loading
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlaceholder(canvas, ctx, 'Loading chart…');

  try {
    const { data } = await apiFetch(`/admin/analytics/revenue?period=${days}`);
    chartData = data || [];
    drawRevenueChart(canvas, ctx, chartData, days);
  } catch {
    drawPlaceholder(canvas, ctx, 'Could not load chart data.');
  }
}

function drawRevenueChart(canvas, ctx, data, days) {
  // Fill missing days with 0
  const filled = fillMissingDays(data, days);
  const width   = canvas.offsetWidth || 600;
  const height  = parseInt(canvas.getAttribute('height')) || 280;
  canvas.width  = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  if (!filled.length) {
    drawPlaceholder(canvas, ctx, 'No revenue data for this period.');
    return;
  }

  const isDark   = document.documentElement.getAttribute('data-theme') === 'dark';
  const PAD_L    = 64;
  const PAD_R    = 16;
  const PAD_T    = 20;
  const PAD_B    = 40;
  const chartW   = width - PAD_L - PAD_R;
  const chartH   = height - PAD_T - PAD_B;

  const values   = filled.map(d => d.revenue);
  const maxVal   = Math.max(...values, 1);
  const stepX    = chartW / (filled.length - 1 || 1);

  const toX = (i) => PAD_L + i * stepX;
  const toY = (v) => PAD_T + chartH - (v / maxVal) * chartH;

  /* Grid lines */
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  ctx.lineWidth   = 1;
  const gridLines = 5;
  for (let g = 0; g <= gridLines; g++) {
    const y = PAD_T + (chartH / gridLines) * g;
    ctx.beginPath();
    ctx.moveTo(PAD_L, y);
    ctx.lineTo(width - PAD_R, y);
    ctx.stroke();

    // Y-axis label
    const val = maxVal - (maxVal / gridLines) * g;
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    ctx.font      = '11px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatPrice(Math.round(val)), PAD_L - 6, y + 4);
  }

  /* Gradient fill */
  const gradient = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + chartH);
  gradient.addColorStop(0,   'rgba(108,99,255,0.35)');
  gradient.addColorStop(1,   'rgba(108,99,255,0)');

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(filled[0].revenue));
  for (let i = 1; i < filled.length; i++) {
    const cpX  = toX(i - 0.5);
    const cpY1 = toY(filled[i - 1].revenue);
    const cpY2 = toY(filled[i].revenue);
    ctx.bezierCurveTo(cpX, cpY1, cpX, cpY2, toX(i), toY(filled[i].revenue));
  }
  ctx.lineTo(toX(filled.length - 1), PAD_T + chartH);
  ctx.lineTo(toX(0), PAD_T + chartH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  /* Line */
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(filled[0].revenue));
  for (let i = 1; i < filled.length; i++) {
    const cpX  = toX(i - 0.5);
    const cpY1 = toY(filled[i - 1].revenue);
    const cpY2 = toY(filled[i].revenue);
    ctx.bezierCurveTo(cpX, cpY1, cpX, cpY2, toX(i), toY(filled[i].revenue));
  }
  ctx.strokeStyle = '#6c63ff';
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  /* Dots + X labels */
  const labelStep = Math.ceil(filled.length / 8); // max 8 labels
  filled.forEach((d, i) => {
    const x = toX(i);
    const y = toY(d.revenue);

    // Dot
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle   = '#6c63ff';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#1a1a2e' : '#fff';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // X label (sparse)
    if (i % labelStep === 0 || i === filled.length - 1) {
      const label = d.date.slice(5); // MM-DD
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
      ctx.font      = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, height - 10);
    }
  });
}

function fillMissingDays(data, days) {
  const map = Object.fromEntries(data.map(d => [d.date, d.revenue]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, revenue: map[key] || 0 });
  }
  return result;
}

function drawPlaceholder(canvas, ctx, text) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  ctx.fillRect(0, 0, canvas.width || 600, canvas.height || 280);
  ctx.fillStyle   = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  ctx.font        = '14px -apple-system, sans-serif';
  ctx.textAlign   = 'center';
  ctx.fillText(text, (canvas.width || 600) / 2, (canvas.height || 280) / 2);
}

/* ── Chart Period Buttons ────────────────────────────────────── */
function initChartPeriodBtns() {
  document.querySelectorAll('.chart-period-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await loadRevenueChart(parseInt(btn.dataset.days));
    });
  });

  // Redraw chart on window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const canvas = document.getElementById('revenue-chart');
      if (!canvas || !chartData.length) return;
      const ctx  = canvas.getContext('2d');
      const days = parseInt(document.querySelector('.chart-period-btn.active')?.dataset.days || '7');
      drawRevenueChart(canvas, ctx, chartData, days);
    }, 200);
  });
}

/* ── Helpers ────────────────────────────────────────────────── */
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
