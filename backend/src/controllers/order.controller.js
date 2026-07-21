const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/orders
const getOrders = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [], pagination: { total: 0, page: 1, totalPages: 0 } });
});

// GET /api/v1/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  throw new AppError('Order mock not found', 404);
});

// POST /api/v1/orders
const createOrder = asyncHandler(async (req, res) => {
  const mockOrder = {
    id: 'mock_order_' + Date.now(),
    user_id: req.user.id,
    status: 'pending',
    total_amount: req.body.total_amount || 0,
    created_at: new Date().toISOString()
  };
  res.status(201).json({ success: true, message: 'Order created successfully (Mock)', data: mockOrder });
});

// PATCH /api/v1/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Order cancelled (Mock)', data: { id: req.params.id, status: 'cancelled' } });
});

// PATCH /api/v1/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Order status updated (Mock)', data: { id: req.params.id, status: req.body.status } });
});

module.exports = {
  getOrders, getOrderById, createOrder, cancelOrder, updateOrderStatus
};
