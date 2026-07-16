const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('full_name').trim().isLength({ min: 2, max: 100 }).withMessage('Full name is required (2-100 chars)'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const validateProduct = [
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Product name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
  handleValidationErrors,
];

const validateOrder = [
  body('shipping_address').notEmpty().withMessage('Shipping address required'),
  body('payment_method').notEmpty().withMessage('Payment method required'),
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  handleValidationErrors,
];

const validateReview = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('product_id').isUUID().withMessage('Valid product ID required'),
  handleValidationErrors,
];

const validateAddress = [
  body('full_name').trim().notEmpty().withMessage('Full name required'),
  body('phone').trim().notEmpty().withMessage('Phone required'),
  body('address_line1').trim().notEmpty().withMessage('Address line 1 required'),
  body('city').trim().notEmpty().withMessage('City required'),
  body('state').trim().notEmpty().withMessage('State required'),
  body('postal_code').trim().notEmpty().withMessage('Postal code required'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateProduct,
  validateOrder,
  validateReview,
  validateAddress,
};
