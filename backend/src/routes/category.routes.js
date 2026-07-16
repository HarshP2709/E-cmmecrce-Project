const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/error.middleware');

router.get('/', asyncHandler(async (req, res) => {
  const { data } = await supabaseAdmin.from('categories').select('*').eq('is_active', true).order('sort_order');
  res.json({ success: true, data: data || [] });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const { data } = await supabaseAdmin.from('categories').select('*, subcategories:categories(*)').eq('slug', req.params.slug).single();
  if (!data) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, data });
}));

module.exports = router;
