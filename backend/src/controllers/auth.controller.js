const localData = require('../services/localData.service.js');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const jwt = require('jsonwebtoken');

// Ensure we have a local JWT secret for mock tokens
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_local_mock_token_key_12345';

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const { email, password, full_name, phone } = req.body;

  // Use local mock database
  const { data, error } = localData.createUser(email, password, full_name, phone);

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate')) {
      throw new AppError('Email already registered. Please sign in instead.', 409);
    }
    throw new AppError(`Registration failed: ${error.message}`, 400);
  }

  // Carts and Wishlists automatically initialize lazily on fetch in localData.service, so no upsert needed here

  res.status(201).json({
    success: true,
    message: 'Account created successfully!',
    user: { id: data.user.id, email: data.user.email, full_name: data.user.full_name },
  });
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = localData.authenticateUser(email, password);

  if (error) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Create mock JWT session token
  const token = jwt.sign({ id: data.user.id, email: data.user.email, role: data.user.role }, JWT_SECRET, { expiresIn: '7d' });
  const refresh_token = 'mock_refresh_' + Date.now();

  // Set httpOnly cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: 'Login successful',
    token: token,
    refresh_token: refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.full_name,
      avatar_url: null,
      role: data.user.role,
    },
  });
});

// POST /api/v1/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/v1/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  // Mock success always
  res.json({ success: true, message: 'Password reset link sent to your email (MOCKED IN LOCAL MODE).' });
});

// POST /api/v1/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  // Update the user directly
  localData.updateUser(req.user.id, { password });
  res.json({ success: true, message: 'Password reset successfully.' });
});

// GET /api/v1/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// POST /api/v1/auth/refresh
const refreshToken = asyncHandler(async (req, res) => {
  throw new AppError('Refresh unsupported in Local Mock Mode. Please sign in again.', 401);
});

module.exports = { register, login, logout, forgotPassword, resetPassword, getMe, refreshToken };
