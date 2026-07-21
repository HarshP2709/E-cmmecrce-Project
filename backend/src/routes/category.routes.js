const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/error.middleware');

const localCsvService = require('../services/localCsv.service');

router.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, data: localCsvService.getCategories() });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const category = localCsvService.getCategories().find(c => c.slug === req.params.slug);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  category.subcategories = [];
  res.json({ success: true, data: category });
}));

module.exports = router;
