const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/error.middleware');
const { protect } = require('../middleware/auth.middleware');

// GET /api/v1/coupons/validate/:code
router.get('/validate/:code', protect, asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { data: coupon } = await supabaseAdmin
    .from('coupons').select('*').eq('code', code.toUpperCase()).eq('is_active', true).single();

  if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });

  const now = new Date();
  if (coupon.valid_until && new Date(coupon.valid_until) < now)
    return res.status(400).json({ success: false, message: 'Coupon expired' });
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit)
    return res.status(400).json({ success: false, message: 'Coupon limit reached' });

  res.json({ success: true, data: coupon });
}));

module.exports = router;
