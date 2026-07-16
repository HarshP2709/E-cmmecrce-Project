const stripe = require('../config/stripe');
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

// POST /api/v1/payments/create-intent
const createPaymentIntent = asyncHandler(async (req, res) => {
  const { order_id } = req.body;

  const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', order_id).eq('user_id', req.user.id).single();
  if (!order) throw new AppError('Order not found.', 404);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.total_amount * 100),
    currency: 'inr',
    metadata: { order_id, user_id: req.user.id, order_number: order.order_number },
  });

  // Create payment record
  await supabaseAdmin.from('payments').insert({
    order_id, user_id: req.user.id, payment_method: 'stripe',
    amount: order.total_amount, stripe_payment_intent: paymentIntent.id,
  });

  res.json({ success: true, client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id });
});

// POST /api/v1/payments/confirm
const confirmPayment = asyncHandler(async (req, res) => {
  const { payment_intent_id, order_id } = req.body;

  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

  if (paymentIntent.status === 'succeeded') {
    await supabaseAdmin.from('payments').update({
      payment_status: 'completed', paid_at: new Date().toISOString(),
      transaction_id: paymentIntent.id, gateway_response: paymentIntent,
    }).eq('stripe_payment_intent', payment_intent_id);

    await supabaseAdmin.from('orders').update({ status: 'confirmed' }).eq('id', order_id);

    await supabaseAdmin.from('order_status_history').insert({
      order_id, status: 'confirmed', note: 'Payment successful via Stripe',
    });

    res.json({ success: true, message: 'Payment confirmed!' });
  } else {
    throw new AppError('Payment not completed.', 400);
  }
});

// POST /api/v1/payments/webhook (Stripe webhook)
const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ message: 'Webhook signature failed' });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    await supabaseAdmin.from('payments').update({ payment_status: 'completed', paid_at: new Date() })
      .eq('stripe_payment_intent', pi.id);
    await supabaseAdmin.from('orders').update({ status: 'confirmed' }).eq('id', pi.metadata.order_id);
  }

  res.json({ received: true });
});

module.exports = { createPaymentIntent, confirmPayment, stripeWebhook };
