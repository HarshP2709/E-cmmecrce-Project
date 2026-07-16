const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/cart
const getCart = asyncHandler(async (req, res) => {
  const { data: cart, error } = await supabaseAdmin
    .from('carts')
    .select(`
      *,
      cart_items (
        *,
        products:product_id (id, name, slug, price, compare_price, is_active,
          product_images!inner (url, is_primary)
        )
      )
    `)
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw new AppError(error.message, 500);

  const items = cart?.cart_items?.filter(i => i.products?.is_active) || [];
  const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const total = subtotal; // coupon discount applied separately

  res.json({ success: true, data: { ...cart, cart_items: items, subtotal, total } });
});

// POST /api/v1/cart/items
const addToCart = asyncHandler(async (req, res) => {
  const { product_id, quantity = 1, variant_id } = req.body;

  // Validate product
  const { data: product } = await supabaseAdmin
    .from('product_summary').select('id, price, available_quantity').eq('id', product_id).single();
  if (!product) throw new AppError('Product not found.', 404);
  if (product.available_quantity < quantity) throw new AppError('Insufficient stock.', 400);

  // Get or create cart
  let { data: cart } = await supabaseAdmin.from('carts').select('id').eq('user_id', req.user.id).single();
  if (!cart) {
    const { data: newCart } = await supabaseAdmin.from('carts').insert({ user_id: req.user.id }).select().single();
    cart = newCart;
  }

  // Check existing item
  const { data: existing } = await supabaseAdmin
    .from('cart_items').select('*').eq('cart_id', cart.id).eq('product_id', product_id)
    .eq('variant_id', variant_id || null).maybeSingle();

  if (existing) {
    const newQty = existing.quantity + parseInt(quantity);
    if (newQty > product.available_quantity) throw new AppError('Insufficient stock.', 400);
    await supabaseAdmin.from('cart_items').update({ quantity: newQty }).eq('id', existing.id);
  } else {
    await supabaseAdmin.from('cart_items').insert({
      cart_id: cart.id, product_id, variant_id: variant_id || null,
      quantity: parseInt(quantity), price: product.price,
    });
  }

  res.json({ success: true, message: 'Added to cart' });
});

// PATCH /api/v1/cart/items/:id
const updateCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (quantity < 1) throw new AppError('Quantity must be at least 1.', 400);

  const { data: cart } = await supabaseAdmin.from('carts').select('id').eq('user_id', req.user.id).single();
  const { error } = await supabaseAdmin.from('cart_items')
    .update({ quantity: parseInt(quantity) }).eq('id', id).eq('cart_id', cart.id);

  if (error) throw new AppError('Cart item not found.', 404);
  res.json({ success: true, message: 'Cart updated' });
});

// DELETE /api/v1/cart/items/:id
const removeCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: cart } = await supabaseAdmin.from('carts').select('id').eq('user_id', req.user.id).single();
  await supabaseAdmin.from('cart_items').delete().eq('id', id).eq('cart_id', cart.id);
  res.json({ success: true, message: 'Item removed from cart' });
});

// DELETE /api/v1/cart/clear
const clearCart = asyncHandler(async (req, res) => {
  const { data: cart } = await supabaseAdmin.from('carts').select('id').eq('user_id', req.user.id).single();
  await supabaseAdmin.from('cart_items').delete().eq('cart_id', cart.id);
  res.json({ success: true, message: 'Cart cleared' });
});

// POST /api/v1/cart/coupon
const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  const { data: coupon } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (!coupon) throw new AppError('Invalid or expired coupon code.', 404);

  const now = new Date();
  if (coupon.valid_until && new Date(coupon.valid_until) < now) throw new AppError('Coupon expired.', 400);
  if (coupon.valid_from && new Date(coupon.valid_from) > now) throw new AppError('Coupon not yet active.', 400);
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) throw new AppError('Coupon usage limit reached.', 400);

  const { data: cart } = await supabaseAdmin.from('carts').select('id').eq('user_id', req.user.id).single();
  await supabaseAdmin.from('carts').update({ coupon_id: coupon.id }).eq('id', cart.id);

  res.json({
    success: true,
    message: 'Coupon applied!',
    data: {
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_discount_amount: coupon.max_discount_amount,
    },
  });
});

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart, applyCoupon };
