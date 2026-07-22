const localData = require('../services/localData.service.js');
const localCsv = require('../services/localCsv.service.js');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// Formats mock inner join for cart items natively mimicking Supabase structures
const populateCartItems = (items) => {
  return items.map(item => ({
    id: item.product_id,
    ...item,
    products: localCsv.getProductById(item.product_id) || null
  }));
};

// GET /api/v1/cart
const getCart = asyncHandler(async (req, res) => {
  const { data, error } = localData.getCart(req.user.id);
  if (error) throw new AppError(error.message, 400);
  res.json({ success: true, data: { cart_items: populateCartItems(data.items || []) } });
});

// POST /api/v1/cart/items
const addToCart = asyncHandler(async (req, res) => {
  const cart = localData.getCart(req.user.id).data;
  cart.items = cart.items || [];

  const existingItemIndex = cart.items.findIndex(i => String(i.product_id) === String(req.body.product_id));
  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += (req.body.quantity || 1);
  } else {
    cart.items.push(req.body);
  }

  const { data } = localData.updateCartItems(req.user.id, cart.items);
  res.json({ success: true, cart: data });
});

// PATCH /api/v1/cart/items/:id
const updateCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  let cart = localData.getCart(req.user.id).data;

  if (cart.items) {
    cart.items = cart.items.map(i =>
      String(i.product_id) === String(id) ? { ...i, quantity } : i
    );
    localData.updateCartItems(req.user.id, cart.items);
  }
  res.json({ success: true, message: 'Item updated locally' });
});

// DELETE /api/v1/cart/items/:id
const removeCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let cart = localData.getCart(req.user.id).data;

  if (cart.items) {
    cart.items = cart.items.filter(i => String(i.product_id) !== String(id));
    localData.updateCartItems(req.user.id, cart.items);
  }
  res.json({ success: true, message: 'Item removed locally' });
});

// DELETE /api/v1/cart/clear
const clearCart = asyncHandler(async (req, res) => {
  const { data, error } = localData.updateCartItems(req.user.id, []);
  if (error) throw new AppError(error.message, 400);
  res.json({ success: true, message: 'Cart cleared successfully' });
});

// POST /api/v1/cart/coupon
const applyCoupon = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Coupon applied (mock)' });
});

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart, applyCoupon };
