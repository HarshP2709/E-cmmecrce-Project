const express = require('express');
const router = express.Router();
const { getWishlist, toggleWishlist, removeFromWishlist, moveToCart } = require('../controllers/wishlist.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getWishlist);
router.post('/', toggleWishlist);
router.delete('/:productId', removeFromWishlist);
router.post('/move-to-cart', moveToCart);

module.exports = router;
