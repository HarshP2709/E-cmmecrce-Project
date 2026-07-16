const express = require('express');
const router = express.Router();
const {
  getProducts, getProductBySlug, createProduct, updateProduct,
  deleteProduct, uploadProductImages,
} = require('../controllers/product.controller');
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

router.get('/', getProducts);
router.get('/:slug', getProductBySlug);

// Admin routes
router.post('/', protect, requireAdmin, createProduct);
router.put('/:id', protect, requireAdmin, updateProduct);
router.delete('/:id', protect, requireAdmin, deleteProduct);
router.post('/:id/images', protect, requireAdmin, upload.array('images', 10), uploadProductImages);

module.exports = router;
