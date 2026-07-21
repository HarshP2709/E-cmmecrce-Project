/**
 * ShopVerse - Categories Page
 */

import { initPage, apiFetch, showToast } from '../modules/utils.js';
import { initNavbar } from '../modules/navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    initPage();
    await initNavbar();
    await loadAllCategories();
});

async function loadAllCategories() {
    const container = document.getElementById('full-categories-grid');
    if (!container) return;

    container.innerHTML = Array(8).fill().map(() => `
    <div class="category-block skeleton-card" style="height:220px;border-radius:var(--border-radius-lg)"></div>
  `).join('');

    try {
        const data = await apiFetch('/categories');
        const categories = data.data?.filter(c => !c.parent_id) || [];

        const icons = { electronics: '💻', fashion: '👗', 'home-living': '🏠', 'sports-fitness': '⚽', 'beauty-personal-care': '💄', 'books-education': '📚', 'toys-games': '🎮', groceries: '🛒' };
        const desc = {
            electronics: 'Latest gadgets, laptops, and smart devices.',
            fashion: 'Trendy apparel and accessories for everyone.',
            'home-living': 'Decor, furniture, and kitchen essentials.',
            'sports-fitness': 'Equipment and apparel for your active lifestyle.',
            'beauty-personal-care': 'Skincare, makeup, and grooming products.',
            'books-education': 'Bestsellers, textbooks, and learning materials.',
            'toys-games': 'Fun and learning for kids of all ages.',
            groceries: 'Fresh produce and daily household items.'
        };

        container.innerHTML = categories.map(cat => `
      <a href="products.html?category=${cat.slug}" class="category-block reveal">
        <div class="category-block-icon">${icons[cat.slug] || cat.icon || '🛍️'}</div>
        <div class="category-block-name">${cat.name}</div>
        <p class="category-block-desc">${desc[cat.slug] || 'Explore the best products in this category tailored for you.'}</p>
      </a>
    `).join('');

        // Manually trigger reveal animation cascade
        requestAnimationFrame(() => {
            container.querySelectorAll('.reveal').forEach((el, idx) => {
                setTimeout(() => el.classList.add('revealed'), idx * 75);
            });
        });

    } catch (err) {
        container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:var(--space-12);color:var(--text-muted)">
        <p style="font-size:3rem;margin-bottom:var(--space-4)">⚠️</p>
        <p>Failed to load categories.</p>
        <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top:var(--space-4)">Retry</button>
      </div>
    `;
        showToast(err.message || 'Cannot fetch categories.', 'error');
    }
}
