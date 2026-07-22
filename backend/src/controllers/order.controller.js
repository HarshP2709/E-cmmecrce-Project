const localData = require('../services/localData.service.js');
const localCsv = require('../services/localCsv.service.js');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

const populateOrder = (order) => {
  const items = (order.items || order.order_items || []).map(i => {
    const product = localCsv.getProductById(i.product_id);
    return {
      ...i,
      price: i.price || (product ? product.price : 0),
      products: product
    };
  });
  return { ...order, order_items: items };
};

// GET /api/v1/orders
const getOrders = asyncHandler(async (req, res) => {
  const { data } = localData.getOrders(req.user.id);
  const limit = parseInt(req.query.limit) || 5;
  const page = parseInt(req.query.page) || 1;
  const search = req.query.search;

  let orders = data.map(populateOrder);
  if (req.query.status) {
    orders = orders.filter(o => o.status === req.query.status);
  }
  if (search) {
    orders = orders.filter(o => o.order_number?.toLowerCase().includes(search.toLowerCase()));
  }

  const startIndex = (page - 1) * limit;
  const paginated = orders.slice(startIndex, startIndex + limit);

  res.json({
    success: true,
    data: paginated,
    pagination: { total: orders.length, page, totalPages: Math.ceil(orders.length / limit) }
  });
});

// GET /api/v1/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  const { data, error } = localData.getOrderById(req.params.id);
  if (error) throw new AppError(error.message, 404);
  if (data.user_id !== req.user.id) throw new AppError('Unauthorized', 403);

  res.json({ success: true, data: populateOrder(data) });
});

// POST /api/v1/orders
const createOrder = asyncHandler(async (req, res) => {
  const reqItems = req.body.items || [];
  let total = 0;

  const items = reqItems.map(i => {
    const product = localCsv.getProductById(i.product_id);
    const price = product ? product.price : 0;
    total += price * i.quantity;
    return {
      product_id: i.product_id,
      quantity: i.quantity,
      price: price
    };
  });

  const shipping = total >= 499 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const finalTotal = total + shipping + tax;

  const newOrder = {
    id: 'mock_order_' + Date.now(),
    order_number: 'SV' + Math.floor(Math.random() * 900000 + 100000),
    user_id: req.user.id,
    status: 'confirmed',
    total_amount: finalTotal,
    items: items,
    shipping_address: req.body.shipping_address,
    payment_method: req.body.payment_method,
    created_at: new Date().toISOString(),
    estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  };

  const { data } = localData.createOrder(newOrder);
  if (!req.body.is_buy_now) {
    localData.updateCartItems(req.user.id, []);
  }

  res.status(201).json({ success: true, message: 'Order placed', data: data });
});

// PATCH /api/v1/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const { data, error } = localData.updateOrder(req.params.id, { status: 'cancelled' });
  if (error) throw new AppError(error.message, 404);
  res.json({ success: true, message: 'Order cancelled', data });
});

// PATCH /api/v1/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { data, error } = localData.updateOrder(req.params.id, { status: req.body.status });
  if (error) throw new AppError(error.message, 404);
  res.json({ success: true, message: 'Order status updated', data });
});

module.exports = {
  getOrders, getOrderById, createOrder, cancelOrder, updateOrderStatus
};
