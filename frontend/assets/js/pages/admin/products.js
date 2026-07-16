/**
 * ShopVerse Admin — Products Management
 * Load, search, paginate, add, edit, delete products and upload images.
 */

import { initPage, apiFetch, showToast, formatPrice, debounce } from '../../modules/utils.js';
import { Auth, requireAdmin } from '../../modules/auth.js';

/* ── Guard ─────────────────────────────────────────────────── */
if (!requireAdmin()) throw new Error('Unauthorised');

/* ── State ─────────────────────────────────────────────────── */
const state = {
  page:        1,
  limit:       15,
  total:       0,
  search:      '',
  category:    '',
  statusFilter: '',
  categories:  [],
  brands:      [],
  deleteTargetId:   null,
  deleteTargetName: '',
  pendingImages: [],   // File objects staged for upload
};

/* ── DOM refs ───────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  initPage();
  populateUserInfo();
  initAdminSidebar();
  initThemeToggle();

  await Promise.all([loadCategories(), loadBrands()]);
  await loadProducts();

  initToolbar();
  initProductModal();
  initConfirmModal();
  initImageUpload();
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

/* ── Load Categories & Brands ───────────────────────────────── */
async function loadCategories() {
  try {
    const { data } = await apiFetch('/categories');
    state.categories = data || [];
    const filterSel = $('category-filter');
    const modalSel  = $('p-category');

    state.categories.forEach(cat => {
      if (filterSel) filterSel.innerHTML += `<option value="${cat.id}">${escHTML(cat.name)}</option>`;
      if (modalSel)  modalSel.innerHTML  += `<option value="${cat.id}">${escHTML(cat.name)}</option>`;
    });
  } catch {}
}

async function loadBrands() {
  try {
    // Attempt brands endpoint; fall back silently
    const { data } = await apiFetch('/brands');
    state.brands = data || [];
    const modalSel = $('p-brand');
    state.brands.forEach(b => {
      if (modalSel) modalSel.innerHTML += `<option value="${b.id}">${escHTML(b.name)}</option>`;
    });
  } catch {}
}

/* ── Load Products ──────────────────────────────────────────── */
async function loadProducts() {
  const tbody = $('products-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="admin-table-loading">Loading…</td></tr>`;

  try {
    const params = new URLSearchParams({
      page:  state.page,
      limit: state.limit,
      ...(state.search   && { search: state.search }),
      ...(state.category && { category: state.category }),
    });

    const { data, pagination } = await apiFetch(`/products?${params}`);
    state.total = pagination?.total || 0;

    renderProductsTable(data || []);
    renderPagination();
    updateCountDisplay();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="admin-table-empty">Failed to load products. ${escHTML(err.message)}</td></tr>`;
  }
}

/* ── Render Products Table ──────────────────────────────────── */
function renderProductsTable(products) {
  const tbody = $('products-tbody');
  if (!tbody) return;

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="admin-table-empty">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const img   = p.primary_image
      ? `<img src="${escHTML(p.primary_image)}" alt="${escHTML(p.name)}" class="admin-table-img" loading="lazy">`
      : `<div class="admin-table-img-placeholder" aria-hidden="true">📦</div>`;
    const stock = p.available_quantity ?? p.stock ?? 0;
    const stockBadge = stock === 0
      ? `<span class="product-stock-badge out-of-stock">Out</span>`
      : stock <= 10
        ? `<span class="product-stock-badge low-stock">${stock}</span>`
        : `<span class="product-stock-badge in-stock">${stock}</span>`;

    return `
      <tr>
        <td>${img}</td>
        <td>
          <div class="font-bold text-sm">${escHTML(p.name)}</div>
          <div class="text-xs text-muted">${escHTML(p.sku || p.slug || '')}</div>
        </td>
        <td class="text-sm">${escHTML(p.category_name || '—')}</td>
        <td>
          <div class="font-bold">${formatPrice(p.price)}</div>
          ${p.compare_price ? `<div class="text-xs text-muted" style="text-decoration:line-through">${formatPrice(p.compare_price)}</div>` : ''}
        </td>
        <td>${stockBadge}</td>
        <td>
          <span class="badge ${p.is_active !== false ? 'badge-success' : 'badge-danger'}">
            ${p.is_active !== false ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <div class="admin-table-actions">
            <button
              class="btn btn-sm btn-outline admin-edit-btn"
              data-id="${p.id}"
              aria-label="Edit ${escHTML(p.name)}"
            >✏️</button>
            <button
              class="btn btn-sm btn-danger admin-delete-btn"
              data-id="${p.id}"
              data-name="${escHTML(p.name)}"
              aria-label="Delete ${escHTML(p.name)}"
            >🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind row action buttons
  tbody.querySelectorAll('.admin-edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(btn.dataset.id)));

  tbody.querySelectorAll('.admin-delete-btn').forEach(btn =>
    btn.addEventListener('click', () => openDeleteConfirm(btn.dataset.id, btn.dataset.name)));
}

/* ── Pagination ──────────────────────────────────────────────── */
function renderPagination() {
  const container = $('products-pagination');
  if (!container) return;
  const pages = Math.ceil(state.total / state.limit);
  if (pages <= 1) { container.innerHTML = ''; return; }

  const from = Math.max(1, state.page - 2);
  const to   = Math.min(pages, state.page + 2);
  let html   = `<button class="page-btn" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`;

  if (from > 1)   html += `<button class="page-btn" data-page="1">1</button>${from > 2 ? '<span class="page-btn" aria-hidden="true">…</span>' : ''}`;
  for (let i = from; i <= to; i++)
    html += `<button class="page-btn ${i === state.page ? 'active' : ''}" data-page="${i}" aria-label="Page ${i}" ${i === state.page ? 'aria-current="page"' : ''}>${i}</button>`;
  if (to < pages) html += `${to < pages - 1 ? '<span class="page-btn" aria-hidden="true">…</span>' : ''}<button class="page-btn" data-page="${pages}">${pages}</button>`;
  html += `<button class="page-btn" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''} aria-label="Next page">›</button>`;

  container.innerHTML = html;
  container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (p !== state.page && p >= 1 && p <= pages) {
        state.page = p;
        loadProducts();
      }
    });
  });
}

function updateCountDisplay() {
  const el = $('total-count');
  if (el) el.textContent = state.total;

  const range = $('products-range');
  if (range) {
    const from = (state.page - 1) * state.limit + 1;
    const to   = Math.min(state.page * state.limit, state.total);
    range.textContent = state.total ? `${from}–${to} of ${state.total}` : '';
  }
}

/* ── Toolbar (search + filters) ─────────────────────────────── */
function initToolbar() {
  const searchInput  = $('product-search');
  const catFilter    = $('category-filter');
  const statusFilter = $('status-filter');
  const addBtn       = $('add-product-btn');

  searchInput?.addEventListener('input', debounce(e => {
    state.search = e.target.value.trim();
    state.page   = 1;
    loadProducts();
  }, 400));

  catFilter?.addEventListener('change', e => {
    state.category = e.target.value;
    state.page     = 1;
    loadProducts();
  });

  statusFilter?.addEventListener('change', e => {
    state.statusFilter = e.target.value;
    state.page         = 1;
    loadProducts();
  });

  addBtn?.addEventListener('click', openAddModal);
}

/* ── Product Modal ──────────────────────────────────────────── */
function initProductModal() {
  const modal     = $('product-modal');
  const closeBtn  = $('modal-close');
  const cancelBtn = $('modal-cancel');
  const saveBtn   = $('save-product-btn');
  const nameInput = $('p-name');
  const slugInput = $('p-slug');

  const close = () => modal?.classList.remove('active');
  closeBtn?.addEventListener('click',  close);
  cancelBtn?.addEventListener('click', close);
  modal?.addEventListener('click', e => { if (e.target === modal) close(); });

  // Auto-generate slug from name
  nameInput?.addEventListener('input', () => {
    if (slugInput && !slugInput.dataset.manual) {
      slugInput.value = toSlug(nameInput.value);
    }
  });
  slugInput?.addEventListener('input', () => {
    if (slugInput.value) slugInput.dataset.manual = '1';
    else delete slugInput.dataset.manual;
  });

  saveBtn?.addEventListener('click', saveProduct);
}

function openAddModal() {
  resetProductForm();
  $('modal-title').textContent = 'Add Product';
  $('edit-product-id').value   = '';
  const imgSection = $('image-upload-section');
  if (imgSection) imgSection.hidden = true; // No product id yet; upload after save
  $('product-modal')?.classList.add('active');
}

async function openEditModal(productId) {
  resetProductForm();
  $('modal-title').textContent = 'Edit Product';
  $('edit-product-id').value   = productId;

  // Show image upload section for existing products
  const imgSection = $('image-upload-section');
  if (imgSection) imgSection.hidden = false;

  try {
    const { data } = await apiFetch(`/products/${productId}`);
    fillProductForm(data);
  } catch (err) {
    showToast('Failed to load product: ' + err.message, 'error');
  }

  $('product-modal')?.classList.add('active');
}

function fillProductForm(p) {
  const setVal = (id, val) => { const el = $(id); if (el) el.value = val ?? ''; };

  setVal('p-name',          p.name);
  setVal('p-slug',          p.slug);
  setVal('p-price',         p.price);
  setVal('p-compare-price', p.compare_price);
  setVal('p-category',      p.category_id);
  setVal('p-brand',         p.brand_id);
  setVal('p-stock',         p.available_quantity ?? p.stock ?? 0);
  setVal('p-sku',           p.sku);
  setVal('p-desc',          p.description);

  const setChk = (id, val) => { const el = $(id); if (el) el.checked = !!val; };
  setChk('p-featured',   p.is_featured);
  setChk('p-bestseller', p.is_best_seller);
  setChk('p-flash',      p.is_flash_sale);
  setChk('p-new',        p.is_new_arrival);
  setChk('p-active',     p.is_active !== false);
}

function resetProductForm() {
  const form = $('product-form');
  if (form) form.reset();
  state.pendingImages = [];
  const previews = $('image-previews');
  if (previews) previews.innerHTML = '';
  const slugInput = $('p-slug');
  if (slugInput) delete slugInput.dataset.manual;
}

function collectFormData() {
  const g = id => $(id)?.value?.trim() ?? '';
  const c = id => $(id)?.checked ?? false;

  return {
    name:            g('p-name'),
    slug:            g('p-slug') || toSlug(g('p-name')),
    price:           parseFloat(g('p-price')) || 0,
    compare_price:   parseFloat(g('p-compare-price')) || null,
    category_id:     g('p-category') || null,
    brand_id:        g('p-brand') || null,
    stock:           parseInt(g('p-stock')) || 0,
    sku:             g('p-sku') || null,
    description:     g('p-desc') || null,
    is_featured:     c('p-featured'),
    is_best_seller:  c('p-bestseller'),
    is_flash_sale:   c('p-flash'),
    is_new_arrival:  c('p-new'),
    is_active:       c('p-active'),
  };
}

async function saveProduct() {
  const saveBtn   = $('save-product-btn');
  const productId = $('edit-product-id')?.value;
  const payload   = collectFormData();

  if (!payload.name) { showToast('Product name is required.', 'warning'); return; }
  if (!payload.price) { showToast('Price is required.', 'warning'); return; }

  saveBtn?.classList.add('loading');
  try {
    let savedId = productId;

    if (productId) {
      // Update existing
      await apiFetch(`/products/${productId}`, {
        method: 'PUT',
        body:   JSON.stringify(payload),
      });
      showToast('Product updated successfully! ✅', 'success', 'Products');
    } else {
      // Create new
      const { data } = await apiFetch('/products', {
        method: 'POST',
        body:   JSON.stringify(payload),
      });
      savedId = data?.id;
      showToast('Product created! ✅', 'success', 'Products');

      // If images are staged and we now have an id, upload them
      if (savedId && state.pendingImages.length) {
        await uploadImages(savedId, state.pendingImages);
      }
    }

    $('product-modal')?.classList.remove('active');
    await loadProducts();
  } catch (err) {
    showToast(err.message || 'Save failed.', 'error', 'Products');
  } finally {
    saveBtn?.classList.remove('loading');
  }
}

/* ── Image Upload ────────────────────────────────────────────── */
function initImageUpload() {
  const dropZone   = $('image-drop-zone');
  const fileInput  = $('image-files');

  dropZone?.addEventListener('click',   () => fileInput?.click());
  dropZone?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput?.click(); });

  dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone?.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(Array.from(e.dataTransfer.files));
  });

  fileInput?.addEventListener('change', e => handleFiles(Array.from(e.target.files)));
}

function handleFiles(files) {
  const valid = files.filter(f => f.type.startsWith('image/') && f.size < 5 * 1024 * 1024);
  if (valid.length !== files.length)
    showToast('Some files were skipped (non-image or > 5 MB).', 'warning');

  state.pendingImages.push(...valid);

  const previews = $('image-previews');
  if (!previews) return;

  valid.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const div = document.createElement('div');
      div.className = 'admin-img-preview';
      div.innerHTML = `<img src="${e.target.result}" alt="${escHTML(file.name)}" loading="lazy"><button class="admin-img-remove" aria-label="Remove image" type="button">✕</button>`;
      div.querySelector('.admin-img-remove').addEventListener('click', () => {
        const idx = state.pendingImages.indexOf(file);
        if (idx !== -1) state.pendingImages.splice(idx, 1);
        div.remove();
      });
      previews.appendChild(div);
    };
    reader.readAsDataURL(file);
  });

  // If editing existing product, upload right away
  const productId = $('edit-product-id')?.value;
  if (productId && valid.length) {
    uploadImages(productId, valid).then(() => {
      state.pendingImages = [];
      const previews2 = $('image-previews');
      if (previews2) previews2.innerHTML = '';
    });
  }
}

async function uploadImages(productId, files) {
  const formData = new FormData();
  files.forEach(f => formData.append('images', f));

  try {
    await fetch(`${(await import('../../modules/utils.js')).API_BASE}/products/${productId}/images`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('token') || 'null')}` },
      body:    formData,
    });
    showToast('Images uploaded ✅', 'success');
  } catch {
    showToast('Image upload failed.', 'error');
  }
}

/* ── Confirm Delete Modal ────────────────────────────────────── */
function initConfirmModal() {
  const modal     = $('confirm-modal');
  const closeBtn  = $('confirm-modal-close');
  const cancelBtn = $('confirm-cancel');
  const deleteBtn = $('confirm-delete-btn');

  const close = () => modal?.classList.remove('active');
  closeBtn?.addEventListener('click',  close);
  cancelBtn?.addEventListener('click', close);
  modal?.addEventListener('click', e => { if (e.target === modal) close(); });

  deleteBtn?.addEventListener('click', async () => {
    if (!state.deleteTargetId) return;
    deleteBtn.classList.add('loading');
    try {
      await apiFetch(`/products/${state.deleteTargetId}`, { method: 'DELETE' });
      showToast('Product deleted.', 'success', 'Products');
      close();
      await loadProducts();
    } catch (err) {
      showToast(err.message || 'Delete failed.', 'error', 'Products');
    } finally {
      deleteBtn.classList.remove('loading');
    }
  });
}

function openDeleteConfirm(id, name) {
  state.deleteTargetId   = id;
  state.deleteTargetName = name;
  const el = $('confirm-product-name');
  if (el) el.textContent = name;
  $('confirm-modal')?.classList.add('active');
}

/* ── Helpers ─────────────────────────────────────────────────── */
function toSlug(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function escHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str ?? '')));
  return d.innerHTML;
}
