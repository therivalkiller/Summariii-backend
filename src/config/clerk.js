import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import config from './env.js';

/**
 * Clerk configuration for authentication
 */
export const clerkConfig = {
  publishableKey: config.clerk.publishableKey,
  secretKey: config.clerk.secretKey,
};

/**
 * Middleware to require authentication on routes
 * Usage: app.get('/protected', requireAuth, handler)
 */
export const requireAuth = ClerkExpressRequireAuth({
  secretKey: config.clerk.secretKey,
});

export default clerkConfig;
