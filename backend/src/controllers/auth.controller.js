const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const { email, password, full_name } = req.body;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name },
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already')) {
      throw new AppError('Email already registered.', 409);
    }
    throw new AppError(error.message, 400);
  }

  res.status(201).json({
    success: true,
    message: 'Account created successfully! Please check your email.',
    user: { id: data.user.id, email: data.user.email },
  });
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (error) {
    throw new AppError('Invalid email or password.', 401);
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('*').eq('id', data.user.id).single();

  // Set httpOnly cookie
  res.cookie('token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: 'Login successful',
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: profile?.full_name,
      avatar_url: profile?.avatar_url,
      role: profile?.role,
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
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/pages/reset-password.html`,
  });
  if (error) throw new AppError(error.message, 400);
  res.json({ success: true, message: 'Password reset link sent to your email.' });
});

// POST /api/v1/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password });
  if (error) throw new AppError(error.message, 400);
  res.json({ success: true, message: 'Password reset successfully.' });
});

// GET /api/v1/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// POST /api/v1/auth/refresh
const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });
  if (error) throw new AppError('Invalid refresh token.', 401);
  res.json({
    success: true,
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

module.exports = { register, login, logout, forgotPassword, resetPassword, getMe, refreshToken };
