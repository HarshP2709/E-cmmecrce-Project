const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/orders
const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products:product_id(name, slug, product_images(url, is_primary)))', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500);

  res.json({ success: true, data: data || [], pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0 } });
});

// GET /api/v1/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        products:product_id(
          id, name, slug, price,
          product_images(url, is_primary)
        )
      ),
      payments(*)
    `)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) throw new AppError('Order not found.', 404);
  res.json({ success: true, data });
});

// POST /api/v1/orders
const createOrder = asyncHandler(async (req, res) => {
  const { shipping_address, billing_address, payment_method, items, coupon_id, notes } = req.body;

  if (!items?.length) throw new AppError('Order must have at least one item.', 400);

  // Validate all items & compute totals
  let subtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    const { data: product } = await supabaseAdmin
      .from('product_summary')
      .select('id, name, slug, price, available_quantity, primary_image')
      .eq('id', item.product_id).single();

    if (!product) throw new AppError(`Product ${item.product_id} not found.`, 404);
    if (product.available_quantity < item.quantity) throw new AppError(`Insufficient stock for ${product.name}.`, 400);

    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;
    validatedItems.push({
      product_id: product.id, product_name: product.name,
      image_url: product.primary_image, quantity: item.quantity,
      price: product.price, total: itemTotal,
    });
  }

  // Calculate coupon discount
  let discountAmount = 0;
  if (coupon_id) {
    const { data: coupon } = await supabaseAdmin.from('coupons').select('*').eq('id', coupon_id).single();
    if (coupon) {
      discountAmount = coupon.discount_type === 'percentage'
        ? Math.min(subtotal * coupon.discount_value / 100, coupon.max_discount_amount || Infinity)
        : Math.min(coupon.discount_value, subtotal);
      await supabaseAdmin.from('coupons').update({ used_count: coupon.used_count + 1 }).eq('id', coupon_id);
    }
  }

  const shippingAmount = subtotal >= 499 ? 0 : 49;
  const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
  const totalAmount = subtotal - discountAmount + shippingAmount + taxAmount;

  // Create order
  const { data: order, error } = await supabaseAdmin.from('orders').insert({
    user_id: req.user.id, shipping_address, billing_address: billing_address || shipping_address,
    subtotal, discount_amount: discountAmount, shipping_amount: shippingAmount,
    tax_amount: taxAmount, total_amount: totalAmount, coupon_id: coupon_id || null, notes,
    status: payment_method === 'cod' ? 'confirmed' : 'pending',
  }).select().single();

  if (error) throw new AppError(error.message, 500);

  // Create order items
  const orderItems = validatedItems.map(i => ({ ...i, order_id: order.id }));
  await supabaseAdmin.from('order_items').insert(orderItems);

  // Create payment record
  await supabaseAdmin.from('payments').insert({
    order_id: order.id,
    user_id: req.user.id,
    payment_method,
    amount: totalAmount,
    payment_status: payment_method === 'cod' ? 'pending' : 'paid',
  });

  // Reserve inventory
  for (const item of validatedItems) {
    await supabaseAdmin.from('inventory')
      .update({ reserved_qty: supabaseAdmin.rpc('increment', { x: item.quantity }) })
      .eq('product_id', item.product_id);
  }

  // Add status history
  await supabaseAdmin.from('order_status_history').insert({
    order_id: order.id, status: order.status, note: 'Order placed', created_by: req.user.id,
  });

  // Clear cart
  const { data: cart } = await supabaseAdmin.from('carts').select('id').eq('user_id', req.user.id).single();
  if (cart) await supabaseAdmin.from('cart_items').delete().eq('cart_id', cart.id);

  // Notification
  await supabaseAdmin.from('notifications').insert({
    user_id: req.user.id, type: 'order', title: 'Order Placed!',
    message: `Your order #${order.order_number} has been placed successfully.`,
    data: { order_id: order.id, order_number: order.order_number },
  });

  res.status(201).json({ success: true, message: 'Order placed successfully!', data: order });
});

// PATCH /api/v1/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', id).eq('user_id', req.user.id).single();
  if (!order) throw new AppError('Order not found.', 404);
  if (!['pending', 'confirmed'].includes(order.status)) throw new AppError('Order cannot be cancelled at this stage.', 400);

  await supabaseAdmin.from('orders').update({
    status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: reason,
  }).eq('id', id);

  await supabaseAdmin.from('order_status_history').insert({
    order_id: id, status: 'cancelled', note: reason || 'Cancelled by customer', created_by: req.user.id,
  });

  res.json({ success: true, message: 'Order cancelled successfully.' });
});

// PATCH /api/v1/orders/:id/status (Admin)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const { data, error } = await supabaseAdmin.from('orders').update({ status }).eq('id', id).select().single();
  if (error || !data) throw new AppError('Order not found.', 404);

  await supabaseAdmin.from('order_status_history').insert({
    order_id: id, status, note: note || `Status updated to ${status}`, created_by: req.user.id,
  });

  // Notify customer
  await supabaseAdmin.from('notifications').insert({
    user_id: data.user_id, type: 'order',
    title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your order #${data.order_number} status is now: ${status}.`,
    data: { order_id: id },
  });

  res.json({ success: true, message: 'Order status updated', data });
});

module.exports = { getOrders, getOrderById, createOrder, cancelOrder, updateOrderStatus };
