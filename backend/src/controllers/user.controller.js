const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/users/profile
const getProfile = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', req.user.id).single();
  if (error) throw new AppError('Profile not found.', 404);
  res.json({ success: true, data });
});

// PUT /api/v1/users/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, display_name, phone, date_of_birth, gender } = req.body;
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ full_name, display_name, phone, date_of_birth, gender })
    .eq('id', req.user.id).select().single();
  if (error) throw new AppError(error.message, 400);
  res.json({ success: true, message: 'Profile updated', data });
});

// POST /api/v1/users/avatar
const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No image provided.', 400);
  const sharp = require('sharp');
  const filename = `${req.user.id}/avatar.webp`;
  const resized = await sharp(req.file.buffer).resize(200, 200, { fit: 'cover' }).webp({ quality: 90 }).toBuffer();

  const { error } = await supabaseAdmin.storage.from('avatars').upload(filename, resized, {
    contentType: 'image/webp', upsert: true,
  });
  if (error) throw new AppError('Failed to upload avatar.', 500);

  const { data: urlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(filename);
  await supabaseAdmin.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', req.user.id);

  res.json({ success: true, message: 'Avatar updated', avatar_url: urlData.publicUrl });
});

// GET /api/v1/users/addresses
const getAddresses = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('addresses').select('*').eq('user_id', req.user.id).order('is_default', { ascending: false });
  if (error) throw new AppError(error.message, 500);
  res.json({ success: true, data: data || [] });
});

// POST /api/v1/users/addresses
const createAddress = asyncHandler(async (req, res) => {
  const addressData = { ...req.body, user_id: req.user.id };

  if (addressData.is_default) {
    await supabaseAdmin.from('addresses').update({ is_default: false }).eq('user_id', req.user.id);
  }

  const { data, error } = await supabaseAdmin.from('addresses').insert(addressData).select().single();
  if (error) throw new AppError(error.message, 400);
  res.status(201).json({ success: true, message: 'Address added', data });
});

// PUT /api/v1/users/addresses/:id
const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.body.is_default) {
    await supabaseAdmin.from('addresses').update({ is_default: false }).eq('user_id', req.user.id);
  }
  const { data, error } = await supabaseAdmin
    .from('addresses').update(req.body).eq('id', id).eq('user_id', req.user.id).select().single();
  if (error || !data) throw new AppError('Address not found.', 404);
  res.json({ success: true, message: 'Address updated', data });
});

// DELETE /api/v1/users/addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await supabaseAdmin.from('addresses').delete().eq('id', id).eq('user_id', req.user.id);
  res.json({ success: true, message: 'Address deleted' });
});

// GET /api/v1/users/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const { data } = await supabaseAdmin
    .from('notifications').select('*').eq('user_id', req.user.id)
    .order('created_at', { ascending: false }).limit(50);
  res.json({ success: true, data: data || [] });
});

// PATCH /api/v1/users/notifications/read-all
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await supabaseAdmin.from('notifications').update({ is_read: true }).eq('user_id', req.user.id);
  res.json({ success: true, message: 'All notifications marked as read' });
});

module.exports = {
  getProfile, updateProfile, updateAvatar,
  getAddresses, createAddress, updateAddress, deleteAddress,
  getNotifications, markAllNotificationsRead,
};
