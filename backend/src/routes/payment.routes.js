const express = require('express');
const router = express.Router();
const { createPaymentIntent, confirmPayment, stripeWebhook } = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
router.use(protect);
router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);

module.exports = router;
