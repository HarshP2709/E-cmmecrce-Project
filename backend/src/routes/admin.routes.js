const express = require('express');
const router = express.Router();
const {
  getDashboard, getUsers, toggleUserStatus, getAllOrders, getRevenueAnalytics,
  getCategories, createCategory, updateCategory, deleteCategory,
} = require('../controllers/admin.controller');
const { protect, requireAdmin } = require('../middleware/auth.middleware');

router.use(protect, requireAdmin);

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.patch('/users/:id/toggle', toggleUserStatus);
router.get('/orders', getAllOrders);
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

module.exports = router;
