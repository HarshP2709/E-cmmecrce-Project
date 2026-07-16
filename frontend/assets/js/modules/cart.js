/**
 * ShopVerse - Cart Module
 * Manages shopping cart state and UI
 */

import { apiFetch, storage, showToast, formatPrice } from './utils.js';
import { Auth } from './auth.js';

export class Cart {
  static STORAGE_KEY = 'sv_cart_local';

  // Get cart from server (auth) or local storage (guest)
  static async getCart() {
    if (Auth.isLoggedIn()) {
      const data = await apiFetch('/cart');
      return data.data;
    }
    return this.getLocalCart();
  }

  static getLocalCart() {
    return storage.get(this.STORAGE_KEY) || { cart_items: [], subtotal: 0, total: 0 };
  }

  static async addItem(productId, quantity = 1, variantId = null) {
    if (Auth.isLoggedIn()) {
      await apiFetch('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity, variant_id: variantId }),
      });
    } else {
      this.addLocalItem(productId, quantity);
    }
    await this.updateBadge();
    showToast('Added to cart! 🛒', 'success');
  }

  static addLocalItem(productId, quantity) {
    const cart = this.getLocalCart();
    const existing = cart.cart_items.find(i => i.product_id === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.cart_items.push({ product_id: productId, quantity, price: 0 });
    }
    storage.set(this.STORAGE_KEY, cart);
  }

  static async updateItem(itemId, quantity) {
    await apiFetch(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    await this.updateBadge();
  }

  static async removeItem(itemId) {
    await apiFetch(`/cart/items/${itemId}`, { method: 'DELETE' });
    await this.updateBadge();
    showToast('Item removed from cart', 'info');
  }

  static async clearCart() {
    await apiFetch('/cart/clear', { method: 'DELETE' });
    await this.updateBadge();
  }

  static async applyCoupon(code) {
    return apiFetch('/cart/coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  static async getCount() {
    if (!Auth.isLoggedIn()) {
      const cart = this.getLocalCart();
      return cart.cart_items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0;
    }
    try {
      const data = await apiFetch('/cart');
      return data.data?.cart_items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0;
    } catch { return 0; }
  }

  static async updateBadge() {
    const count = await this.getCount();
    const badges = document.querySelectorAll('#cart-count');
    badges.forEach(badge => {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
    // Pop animation
    badges.forEach(b => {
      b.classList.remove('cart-pop');
      requestAnimationFrame(() => b.classList.add('cart-pop'));
    });
  }

  static async mergeGuestCart() {
    if (!Auth.isLoggedIn()) return;
    const local = this.getLocalCart();
    if (!local.cart_items?.length) return;
    for (const item of local.cart_items) {
      try {
        await apiFetch('/cart/items', {
          method: 'POST',
          body: JSON.stringify({ product_id: item.product_id, quantity: item.quantity }),
        });
      } catch {}
    }
    storage.remove(this.STORAGE_KEY);
  }
}

// ── Cart Badge Initialization ────────────────────────────────
export async function initCartBadge() {
  await Cart.updateBadge();
}

// ── Render Cart Page ─────────────────────────────────────────
export function renderCartItem(item) {
  const product = item.products || item;
  const img = product.product_images?.[0]?.url || product.primary_image || 'assets/images/placeholder.webp';
  const price = item.price || product.price || 0;
  const total = price * item.quantity;
  const originalPrice = product.compare_price;
  const discount = originalPrice > price ? Math.round((originalPrice - price) / originalPrice * 100) : 0;

  return `
    <div class="cart-item" data-item-id="${item.id}" data-product-id="${product.id}">
      <img src="${img}" alt="${product.name}" class="cart-item-img" loading="lazy" onerror="this.src='assets/images/placeholder.webp'">
      <div class="cart-item-body">
        <div class="cart-item-brand">${product.brand_name || ''}</div>
        <a href="/pages/product-detail.html?slug=${product.slug}" class="cart-item-name" style="color:inherit;text-decoration:none">${product.name}</a>
        ${item.variant_id ? `<div class="cart-item-variant">Variant selected</div>` : ''}
        <div class="cart-item-footer">
          <div class="qty-selector">
            <button class="qty-btn" data-action="decrease" aria-label="Decrease quantity">−</button>
            <span class="qty-value" aria-label="${item.quantity} items">${item.quantity}</span>
            <button class="qty-btn" data-action="increase" aria-label="Increase quantity">+</button>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="cart-item-price">${formatPrice(total)}</span>
            ${discount > 0 ? `<span class="price-discount">-${discount}%</span>` : ''}
          </div>
          <button class="cart-item-remove" data-action="remove">🗑 Remove</button>
        </div>
      </div>
    </div>
  `;
}
