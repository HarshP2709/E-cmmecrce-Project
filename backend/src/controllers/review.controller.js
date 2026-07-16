const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/reviews/product/:productId
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, rating } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabaseAdmin
    .from('reviews').select('*, profiles(full_name, avatar_url)', { count: 'exact' })
    .eq('product_id', productId).eq('is_approved', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (rating) query = query.eq('rating', parseInt(rating));

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500);
  res.json({ success: true, data: data || [], total: count });
});

// POST /api/v1/reviews
const createReview = asyncHandler(async (req, res) => {
  const { product_id, rating, title, body, order_id } = req.body;

  const { data: existing } = await supabaseAdmin
    .from('reviews').select('id').eq('product_id', product_id).eq('user_id', req.user.id).maybeSingle();
  if (existing) throw new AppError('You have already reviewed this product.', 409);

  const { data, error } = await supabaseAdmin.from('reviews').insert({
    product_id, rating, title, body, order_id: order_id || null,
    user_id: req.user.id, is_verified: !!order_id,
  }).select('*, profiles(full_name, avatar_url)').single();

  if (error) throw new AppError(error.message, 400);
  res.status(201).json({ success: true, message: 'Review submitted!', data });
});

// DELETE /api/v1/reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await supabaseAdmin.from('reviews').delete().eq('id', id).eq('user_id', req.user.id);
  res.json({ success: true, message: 'Review deleted' });
});

module.exports = { getProductReviews, createReview, deleteReview };
