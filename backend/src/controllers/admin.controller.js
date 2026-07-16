const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/admin/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const [
    { count: totalOrders },
    { count: totalCustomers },
    { count: totalProducts },
    { data: revenueData },
    { data: recentOrders },
    { data: lowStock },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('orders').select('total_amount').eq('status', 'delivered'),
    supabaseAdmin.from('order_summary').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('inventory').select('*, products(name, slug)').lte('quantity', 10),
  ]);

  const totalRevenue = revenueData?.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0) || 0;

  res.json({
    success: true,
    data: { totalOrders, totalCustomers, totalProducts, totalRevenue, recentOrders, lowStock },
  });
});

// GET /api/v1/admin/users
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' })
    .order('created_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);

  if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500);
  res.json({ success: true, data: data || [], pagination: { page: parseInt(page), total: count } });
});

// PATCH /api/v1/admin/users/:id/toggle
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: user } = await supabaseAdmin.from('profiles').select('is_active').eq('id', id).single();
  if (!user) throw new AppError('User not found.', 404);
  await supabaseAdmin.from('profiles').update({ is_active: !user.is_active }).eq('id', id);
  res.json({ success: true, message: `User ${user.is_active ? 'blocked' : 'unblocked'} successfully` });
});

// GET /api/v1/admin/orders
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabaseAdmin.from('order_summary').select('*', { count: 'exact' })
    .order('created_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw new AppError(error.message, 500);
  res.json({ success: true, data: data || [], pagination: { page: parseInt(page), total: count } });
});

// GET /api/v1/admin/analytics/revenue
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const days = parseInt(period);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('total_amount, created_at, status')
    .gte('created_at', since)
    .in('status', ['confirmed', 'packed', 'shipped', 'delivered']);

  // Group by day
  const byDay = {};
  orders?.forEach(o => {
    const day = o.created_at.substring(0, 10);
    byDay[day] = (byDay[day] || 0) + parseFloat(o.total_amount);
  });

  const chartData = Object.entries(byDay).map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ success: true, data: chartData });
});

// GET /api/v1/admin/categories
const getCategories = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('categories').select('*, subcategories:categories(id, name)').is('parent_id', null).order('sort_order');
  if (error) throw new AppError(error.message, 500);
  res.json({ success: true, data: data || [] });
});

// POST /api/v1/admin/categories
const createCategory = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('categories').insert(req.body).select().single();
  if (error) throw new AppError(error.message, 400);
  res.status(201).json({ success: true, data });
});

// PUT /api/v1/admin/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('categories').update(req.body).eq('id', id).select().single();
  if (error || !data) throw new AppError('Category not found.', 404);
  res.json({ success: true, data });
});

// DELETE /api/v1/admin/categories/:id
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await supabaseAdmin.from('categories').delete().eq('id', id);
  res.json({ success: true, message: 'Category deleted' });
});

module.exports = {
  getDashboard, getUsers, toggleUserStatus, getAllOrders, getRevenueAnalytics,
  getCategories, createCategory, updateCategory, deleteCategory,
};
