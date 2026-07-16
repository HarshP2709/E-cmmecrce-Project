const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('wishlists')
    .select('*, product:product_id(*, product_images(url, is_primary))')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(error.message, 500);
  res.json({ success: true, data: data || [] });
});

// POST /api/v1/wishlist
const toggleWishlist = asyncHandler(async (req, res) => {
  const { product_id } = req.body;

  const { data: existing } = await supabaseAdmin
    .from('wishlists').select('id').eq('user_id', req.user.id).eq('product_id', product_id).maybeSingle();

  if (existing) {
    await supabaseAdmin.from('wishlists').delete().eq('id', existing.id);
    return res.json({ success: true, message: 'Removed from wishlist', in_wishlist: false });
  } else {
    await supabaseAdmin.from('wishlists').insert({ user_id: req.user.id, product_id });
    return res.json({ success: true, message: 'Added to wishlist', in_wishlist: true });
  }
});

// DELETE /api/v1/wishlist/:productId
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  await supabaseAdmin.from('wishlists').delete().eq('user_id', req.user.id).eq('product_id', productId);
  res.json({ success: true, message: 'Removed from wishlist' });
});

// POST /api/v1/wishlist/move-to-cart
const moveToCart = asyncHandler(async (req, res) => {
  const { product_id } = req.body;

  // Add to cart
  const { data: product } = await supabaseAdmin.from('product_summary').select('id, price').eq('id', product_id).single();
  if (!product) throw new AppError('Product not found.', 404);

  let { data: cart } = await supabaseAdmin.from('carts').select('id').eq('user_id', req.user.id).single();
  if (!cart) {
    const { data: newCart } = await supabaseAdmin.from('carts').insert({ user_id: req.user.id }).select().single();
    cart = newCart;
  }

  await supabaseAdmin.from('cart_items').upsert({
    cart_id: cart.id, product_id, quantity: 1, price: product.price,
  }, { onConflict: 'cart_id,product_id,variant_id' });

  // Remove from wishlist
  await supabaseAdmin.from('wishlists').delete().eq('user_id', req.user.id).eq('product_id', product_id);

  res.json({ success: true, message: 'Moved to cart' });
});

module.exports = { getWishlist, toggleWishlist, removeFromWishlist, moveToCart };
