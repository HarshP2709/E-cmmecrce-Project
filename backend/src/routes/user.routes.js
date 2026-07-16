const express = require('express');
const router = express.Router();
const {
  getProfile, updateProfile, updateAvatar, getAddresses, createAddress,
  updateAddress, deleteAddress, getNotifications, markAllNotificationsRead,
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const { validateAddress } = require('../middleware/validation.middleware');

router.use(protect);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/avatar', upload.single('avatar'), updateAvatar);
router.get('/addresses', getAddresses);
router.post('/addresses', validateAddress, createAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);

module.exports = router;
