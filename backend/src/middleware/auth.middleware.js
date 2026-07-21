const jwt = require('jsonwebtoken');
const localData = require('../services/localData.service.js');
const { AppError } = require('./error.middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_local_mock_token_key_12345';

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

    // Verify with local JWT Secret
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = localData.getUserById(decoded.id);

    if (!user) {
      return next(new AppError('Invalid or expired token.', 401));
    }

    if (user.is_active === false) {
      return next(new AppError('Your account has been deactivated.', 403));
    }

    req.user = user;
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
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = localData.getUserById(decoded.id);
      if (user) {
        req.user = user;
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
