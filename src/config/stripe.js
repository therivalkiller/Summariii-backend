import Stripe from 'stripe';
import config from './env.js';

/**
 * Stripe client instance
 */
export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Stripe configuration
 */
export const stripeConfig = {
  publishableKey: config.stripe.publishableKey,
  webhookSecret: config.stripe.webhookSecret,
  priceId: config.stripe.priceId,
};

export default stripe;
