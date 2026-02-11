import billingService from '../services/billingService.js';
import config from '../config/env.js'; // Import your config

/**
 * Middleware to require paid user status
 */
export const requirePaidUser = async (req, res, next) => {
  // ✅ BYPASS IN DEVELOPMENT
  if (config.nodeEnv === 'development') {
    return next();
  }

  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const isPaid = await billingService.checkPaidStatus(req.user.id);

    if (!isPaid) {
      return res.status(403).json({
        success: false,
        error: 'This feature requires a paid subscription',
        code: 'PAYMENT_REQUIRED',
      });
    }

    next();
  } catch (error) {
    console.error('Paid user check error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify paid status',
    });
  }
};

/**
 * Middleware to require specific feature unlock
 * @param {string} featureName - Feature to check
 */
export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    // ✅ BYPASS IN DEVELOPMENT
    if (config.nodeEnv === 'development') {
      return next();
    }

    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const hasFeature = await billingService.checkFeatureUnlock(req.user.id, featureName);

      if (!hasFeature) {
        return res.status(403).json({
          success: false,
          error: `This feature (${featureName}) is not unlocked for your account`,
          code: 'FEATURE_LOCKED',
          feature: featureName,
        });
      }

      next();
    } catch (error) {
      console.error('Feature check error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify feature access',
      });
    }
  };
};

/**
 * Middleware to check custom AI provider access
 */
export const requireCustomAIProvider = requireFeature('customAIProvider');

export default {
  requirePaidUser,
  requireFeature,
  requireCustomAIProvider,
};