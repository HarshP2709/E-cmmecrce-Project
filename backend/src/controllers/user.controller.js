const localData = require('../services/localData.service.js');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// GET /api/v1/users/profile
const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

// PUT /api/v1/users/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, display_name, phone, date_of_birth, gender } = req.body;
  const updates = { full_name, display_name, phone, date_of_birth, gender };
  const { data, error } = localData.updateUser(req.user.id, updates);
  if (error) throw new AppError(error.message, 400);
  res.json({ success: true, message: 'Profile updated', data });
});

// POST /api/v1/users/avatar
const updateAvatar = asyncHandler(async (req, res) => {
  throw new AppError('Avatar uploads not supported in local offline mode', 400);
});

// GET /api/v1/users/addresses
const getAddresses = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
});

// POST /api/v1/users/addresses
const createAddress = asyncHandler(async (req, res) => {
  const addressData = { ...req.body, id: Date.now().toString(), user_id: req.user.id };
  res.status(201).json({ success: true, message: 'Address mocked locally', data: addressData });
});

// PUT /api/v1/users/addresses/:id
const updateAddress = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Address mocked updated', data: { id: req.params.id, ...req.body } });
});

// DELETE /api/v1/users/addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Address mocked deleted' });
});

// GET /api/v1/users/notifications
const getNotifications = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
});

// PATCH /api/v1/users/notifications/read-all
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'All notifications marked as read' });
});

module.exports = {
  getProfile, updateProfile, updateAvatar,
  getAddresses, createAddress, updateAddress, deleteAddress,
  getNotifications, markAllNotificationsRead,
};
