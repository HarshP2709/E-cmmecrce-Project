const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeCartItem, clearCart, applyCoupon } = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getCart);
router.post('/items', addToCart);
router.patch('/items/:id', updateCartItem);
router.delete('/items/:id', removeCartItem);
router.delete('/clear', clearCart);
router.post('/coupon', applyCoupon);

module.exports = router;
