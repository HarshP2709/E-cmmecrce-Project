const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/search?q=...
const search = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20, category, brand, min_price, max_price, sort = 'newest' } = req.query;
  if (!q?.trim()) return res.json({ success: true, data: [], suggestions: [] });

  const offset = (parseInt(page) - 1) * parseInt(limit);
  let query = supabaseAdmin.from('product_summary').select('*', { count: 'exact' })
    .eq('is_active', true).or(`name.ilike.%${q}%,description.ilike.%${q}%,tags.cs.{${q}}`);

  if (category) query = query.eq('category_slug', category);
  if (brand) query = query.eq('brand_id', brand);
  if (min_price) query = query.gte('price', parseFloat(min_price));
  if (max_price) query = query.lte('price', parseFloat(max_price));

  const sortMap = { newest: ['created_at', false], price_asc: ['price', true], price_desc: ['price', false], rating: ['avg_rating', false] };
  const [sortField, asc] = sortMap[sort] || ['created_at', false];
  query = query.order(sortField, { ascending: asc }).range(offset, offset + parseInt(limit) - 1);

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500);

  // Suggestions
  const { data: suggestions } = await supabaseAdmin
    .from('products').select('name, slug').eq('is_active', true).ilike('name', `${q}%`).limit(6);

  res.json({ success: true, data: data || [], suggestions: suggestions || [], total: count || 0, query: q });
});

// GET /api/v1/search/suggestions?q=...
const getSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ success: true, data: [] });

  const { data } = await supabaseAdmin
    .from('products').select('name, slug, category_id').eq('is_active', true)
    .ilike('name', `${q}%`).limit(8);

  res.json({ success: true, data: data || [] });
});

module.exports = { search, getSuggestions };
