const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const storePath = path.join(dataDir, 'store.json');

// Initialize store if missing
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let store = {
    users: [],
    carts: [],
    wishlists: [],
    orders: []
};

if (fs.existsSync(storePath)) {
    try {
        store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    } catch (e) {
        console.error("Failed to parse store.json, re-initializing empty store");
    }
}

const saveStore = () => {
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
};

module.exports = {
    // === Auth & Users ===
    createUser: (email, password, fullName, phone) => {
        const exists = store.users.find(u => u.email === email);
        if (exists) return { error: { message: 'email already registered' } };

        const newUser = {
            id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            email: email,
            password: password, // In a real app this would be hashed via bcrypt, keeping plaintext for mock! (DANGEROUS)
            full_name: fullName || email.split('@')[0],
            phone: phone || null,
            role: 'customer',
            is_active: true,
            created_at: new Date().toISOString()
        };

        store.users.push(newUser);
        saveStore();
        return { data: { user: newUser } };
    },

    authenticateUser: (email, password) => {
        const user = store.users.find(u => u.email === email && u.password === password);
        if (!user) return { error: { message: 'invalid email or password' } };
        return { data: { user } };
    },

    getUserById: (id) => {
        return store.users.find(u => u.id === id);
    },

    updateUser: (id, updates) => {
        const idx = store.users.findIndex(u => u.id === id);
        if (idx === -1) return { error: { message: 'User not found' } };
        store.users[idx] = { ...store.users[idx], ...updates };
        saveStore();
        return { data: store.users[idx] };
    },

    // === Carts ===
    getCart: (userId) => {
        let cart = store.carts.find(c => c.user_id === userId);
        if (!cart) {
            cart = { user_id: userId, items: [] };
            store.carts.push(cart);
            saveStore();
        }
        return { data: cart };
    },

    updateCartItems: (userId, items) => {
        let cart = store.carts.find(c => c.user_id === userId);
        if (!cart) {
            cart = { user_id: userId, items: items };
            store.carts.push(cart);
        } else {
            cart.items = items;
        }
        saveStore();
        return { data: cart };
    },

    // === Wishlists ===
    getWishlist: (userId) => {
        let wishlist = store.wishlists.find(w => w.user_id === userId);
        if (!wishlist) {
            wishlist = { user_id: userId, items: null };
            // Supabase originally stored items as JSONB object or array, sticking to empty array
            wishlist.items = [];
            store.wishlists.push(wishlist);
            saveStore();
        }
        return { data: wishlist };
    },

    updateWishlistItems: (userId, items) => {
        let wishlist = store.wishlists.find(w => w.user_id === userId);
        if (!wishlist) {
            wishlist = { user_id: userId, items: items };
            store.wishlists.push(wishlist);
        } else {
            wishlist.items = items;
        }
        saveStore();
        return { data: wishlist };
    },

    // === Orders ===
    createOrder: (order) => {
        store.orders = store.orders || [];
        store.orders.unshift(order);
        saveStore();
        return { data: order };
    },

    getOrders: (userId) => {
        store.orders = store.orders || [];
        const userOrders = store.orders.filter(o => o.user_id === userId);
        return { data: userOrders };
    },

    getOrderById: (orderId) => {
        store.orders = store.orders || [];
        const order = store.orders.find(o => o.id === orderId);
        return order ? { data: order } : { error: { message: 'Order not found' } };
    },

    updateOrder: (orderId, updates) => {
        store.orders = store.orders || [];
        const idx = store.orders.findIndex(o => o.id === orderId);
        if (idx === -1) return { error: { message: 'Order not found' } };
        store.orders[idx] = { ...store.orders[idx], ...updates };
        saveStore();
        return { data: store.orders[idx] };
    },
    getAddresses: (userId) => {
        return { data: store.addresses?.filter(a => a.user_id === userId) || [] };
    },
    createAddress: (data) => {
        if (!store.addresses) store.addresses = [];
        if (data.is_default) {
            store.addresses.filter(a => a.user_id === data.user_id).forEach(a => a.is_default = false);
        }
        store.addresses.push(data);
        saveStore();
        return { data };
    },
    updateAddress: (id, updates) => {
        const idx = (store.addresses || []).findIndex(a => a.id === id);
        if (idx !== -1) {
            if (updates.is_default) {
                store.addresses.filter(a => a.user_id === store.addresses[idx].user_id).forEach(a => a.is_default = false);
            }
            store.addresses[idx] = { ...store.addresses[idx], ...updates };
            saveStore();
            return { data: store.addresses[idx] };
        }
        return { error: { message: 'Address not found' } };
    },
    deleteAddress: (id) => {
        if (!store.addresses) return { error: { message: 'Address not found' } };
        const originalLength = store.addresses.length;
        store.addresses = store.addresses.filter(a => a.id !== id);
        if (store.addresses.length === originalLength) return { error: { message: 'Address not found' } };
        saveStore();
        return { success: true };
    }
};
