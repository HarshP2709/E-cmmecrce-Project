const express = require('express');
const router = express.Router();
const { getWishlist, toggleWishlist, removeFromWishlist, moveToCart, clearWishlist } = require('../controllers/wishlist.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getWishlist);
router.post('/', toggleWishlist);
router.post('/move-to-cart', moveToCart);
router.delete('/clear', clearWishlist);
router.delete('/:productId', removeFromWishlist);

module.exports = router;
