import { clerkClient } from '@clerk/clerk-sdk-node';
import { requireAuth } from '../config/clerk.js';
import { models } from '../db/client.js';

/**
 * Authentication middleware
 * Validates Clerk JWT and extracts user information
 */
export const authenticate = [
  requireAuth,
  async (req, res, next) => {
    try {
      // Get user ID from Clerk auth
      const clerkUserId = req.auth.userId;

      if (!clerkUserId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - No user ID found',
        });
      }

      // Get or create user in database
      let user = await models.User.findOne({
        where: { clerkUserId },
        include: [
          { model: models.FeatureUnlock, as: 'features' },
        ],
      });

      if (!user) {
        // Fetch user details from Clerk
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        
        // Create user in database
        user = await models.User.create({
          clerkUserId,
          email: clerkUser.emailAddresses[0]?.emailAddress,
        });

        // Create default features
        await models.FeatureUnlock.create({
          userId: user.id,
          customAIProvider: false,
        });

        // Reload with features
        user = await models.User.findByPk(user.id, {
          include: [{ model: models.FeatureUnlock, as: 'features' }],
        });
      }

      // Attach user info to request
      req.user = {
        id: user.id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        isPaidUser: user.isPaidUser,
        features: user.features,
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
      });
    }
  },
];

/**
 * Optional authentication (doesn't fail if no auth)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    if (req.auth?.userId) {
      await authenticate[1](req, res, next);
    } else {
      next();
    }
  } catch (error) {
    next();
  }
};

export default authenticate;
