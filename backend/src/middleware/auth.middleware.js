const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('./error.middleware');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in.', 401));
    }

    // Verify with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return next(new AppError('Invalid or expired token.', 401));
    }

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile && profile.is_active === false) {
      return next(new AppError('Your account has been deactivated.', 403));
    }

    req.user = { ...user, ...profile };
    next();
  } catch (err) {
    next(new AppError('Authentication failed.', 401));
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles').select('*').eq('id', user.id).single();
        req.user = { ...user, ...profile };
      }
    }
    next();
  } catch {
    next();
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Admin access required.', 403));
  }
  next();
};

const requireModerator = (req, res, next) => {
  if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
    return next(new AppError('Moderator access required.', 403));
  }
  next();
};

module.exports = { protect, optionalAuth, requireAdmin, requireModerator };
