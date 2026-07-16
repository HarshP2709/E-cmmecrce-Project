const express = require('express');
const router = express.Router();
const { getOrders, getOrderById, createOrder, cancelOrder, updateOrderStatus } = require('../controllers/order.controller');
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const { validateOrder } = require('../middleware/validation.middleware');

router.use(protect);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/status', requireAdmin, updateOrderStatus);

module.exports = router;
