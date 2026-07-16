/**
 * ShopVerse - Wishlist Module
 */

import { apiFetch, storage, showToast } from './utils.js';
import { Auth } from './auth.js';

export class Wishlist {
  static STORAGE_KEY = 'sv_wishlist_local';

  static getLocalWishlist() {
    return storage.get(this.STORAGE_KEY) || [];
  }

  static isInWishlist(productId) {
    if (!Auth.isLoggedIn()) {
      return this.getLocalWishlist().includes(productId);
    }
    return false; // server-side check needed
  }

  static async toggle(productId) {
    if (Auth.isLoggedIn()) {
      const data = await apiFetch('/wishlist', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
      });
      await this.updateBadge();
      showToast(
        data.in_wishlist ? 'Added to wishlist 💜' : 'Removed from wishlist',
        data.in_wishlist ? 'success' : 'info'
      );
      return data.in_wishlist;
    } else {
      const list = this.getLocalWishlist();
      const idx = list.indexOf(productId);
      if (idx > -1) {
        list.splice(idx, 1);
        storage.set(this.STORAGE_KEY, list);
        this.updateBadge();
        showToast('Removed from wishlist', 'info');
        return false;
      } else {
        list.push(productId);
        storage.set(this.STORAGE_KEY, list);
        this.updateBadge();
        showToast('Added to wishlist 💜', 'success');
        return true;
      }
    }
  }

  static async getCount() {
    if (!Auth.isLoggedIn()) return this.getLocalWishlist().length;
    try {
      const data = await apiFetch('/wishlist');
      return data.data?.length || 0;
    } catch { return 0; }
  }

  static async updateBadge() {
    const count = await this.getCount();
    const badges = document.querySelectorAll('#wishlist-count');
    badges.forEach(badge => {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }
}
