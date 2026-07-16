const express = require('express');
const router = express.Router();
const { getProductReviews, createReview, deleteReview } = require('../controllers/review.controller');
const { protect } = require('../middleware/auth.middleware');
const { validateReview } = require('../middleware/validation.middleware');

router.get('/product/:productId', getProductReviews);
router.post('/', protect, validateReview, createReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
