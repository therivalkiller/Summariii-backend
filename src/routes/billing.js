import express from 'express';
import { body, validationResult } from 'express-validator';
import stripe, { stripeConfig } from '../config/stripe.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import billingService from '../services/billingService.js';
import config from '../config/env.js';

const router = express.Router();

/**
 * POST /api/billing/create-checkout-session
 * Create Stripe checkout session
 */
router.post(
  '/create-checkout-session',
  authenticate,
  asyncHandler(async (req, res) => {
    const session = await billingService.createCheckoutSession({
      userId: req.user.id,
      clerkUserId: req.user.clerkUserId,
      email: req.user.email,
    });

    res.json({
      success: true,
      sessionId: session.sessionId,
      url: session.url,
    });
  })
);

/**
 * POST /api/billing/webhook
 * Stripe webhook handler
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        stripeConfig.webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle event
    await billingService.handleWebhook(event);

    res.json({ received: true });
  })
);

/**
 * GET /api/billing/success
 * Payment success redirect
 */
router.get(
  '/success',
  asyncHandler(async (req, res) => {
    const { session_id } = req.query;

    if (!session_id) {
      return res.redirect('/api/billing/cancel');
    }

    try {
      await billingService.handleSuccessfulPayment(session_id);
      
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Successful</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 3rem;
                border-radius: 1rem;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 500px;
              }
              h1 { color: #2d3748; margin-bottom: 1rem; }
              p { color: #4a5568; line-height: 1.6; }
              .success-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
              }
              .button {
                display: inline-block;
                margin-top: 2rem;
                padding: 0.75rem 2rem;
                background: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 0.5rem;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✅</div>
              <h1>Payment Successful!</h1>
              <p>Your payment has been processed successfully.</p>
              <p>The Custom AI Provider feature has been unlocked for your account.</p>
              <a href="${config.frontendUrl}?payment_success=true" class="button">Return to Dashboard</a>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Payment success handling error:', error);
      res.redirect('/api/billing/cancel');
    }
  })
);

/**
 * GET /api/billing/cancel
 * Payment canceled redirect
 */
router.get('/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Canceled</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
          }
          h1 { color: #2d3748; margin-bottom: 1rem; }
          p { color: #4a5568; line-height: 1.6; }
          .cancel-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          .button {
            display: inline-block;
            margin-top: 2rem;
            padding: 0.75rem 2rem;
            background: #f5576c;
            color: white;
            text-decoration: none;
            border-radius: 0.5rem;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="cancel-icon">❌</div>
          <h1>Payment Canceled</h1>
          <p>Your payment was canceled. No charges were made.</p>
          <a href="${config.frontendUrl}" class="button">Return to Dashboard</a>
        </div>
      </body>
    </html>
  `);
});

/**
 * GET /api/billing/status
 * Get user's billing status
 */
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const isPaid = await billingService.checkPaidStatus(req.user.id);
    const hasCustomProvider = await billingService.checkFeatureUnlock(
      req.user.id,
      'customAIProvider'
    );

    res.json({
      success: true,
      isPaidUser: isPaid,
      features: {
        customAIProvider: hasCustomProvider,
      },
    });
  })
);

/**
 * GET /api/billing/history
 * Get payment history
 */
router.get(
  '/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const payments = await billingService.getPaymentHistory(req.user.id);

    res.json({
      success: true,
      payments,
    });
  })
);

export default router;