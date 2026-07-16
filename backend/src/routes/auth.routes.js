const express = require('express');
const router = express.Router();
const { register, login, logout, forgotPassword, resetPassword, getMe, refreshToken } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validateRegister, validateLogin } = require('../middleware/validation.middleware');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', protect, resetPassword);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);

module.exports = router;
