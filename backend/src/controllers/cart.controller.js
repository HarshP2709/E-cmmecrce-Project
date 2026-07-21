const localData = require('../services/localData.service.js');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/cart
const getCart = asyncHandler(async (req, res) => {
  const { data, error } = localData.getCart(req.user.id);
  if (error) throw new AppError(error.message, 400);
  res.json({ success: true, cart: data });
});

// POST /api/v1/cart/items
const addToCart = asyncHandler(async (req, res) => {
  const cart = localData.getCart(req.user.id).data;
  cart.items = cart.items || [];
  cart.items.push(req.body);
  const { data } = localData.updateCartItems(req.user.id, cart.items);
  res.json({ success: true, cart: data });
});

// PATCH /api/v1/cart/items/:id
const updateCartItem = asyncHandler(async (req, res) => {
  res.json({ success: true, cart: localData.getCart(req.user.id).data });
});

// DELETE /api/v1/cart/items/:id
const removeCartItem = asyncHandler(async (req, res) => {
  res.json({ success: true, cart: localData.getCart(req.user.id).data });
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
