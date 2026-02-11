import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireCustomAIProvider } from '../middleware/paidFeature.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { models } from '../db/client.js';
import encryptionService from '../services/encryptionService.js';
import ProviderFactory from '../ai/providerFactory.js';

const router = express.Router();
/**
 * GET /api/ai-settings
 * Get user's AI provider settings
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const settings = await models.AIProviderSetting.findAll({
      where: { userId: req.user.id },
      // ✅ Added 'model' to attributes
      attributes: ['id', 'provider', 'model', 'isUserProvided', 'isActive', 'createdAt'],
    });

    res.json({
      success: true,
      settings: settings.map(s => ({
        id: s.id,
        provider: s.provider,
        model: s.model, // ✅ Return the model to frontend
        isUserProvided: s.isUserProvided,
        isActive: s.isActive,
        createdAt: s.createdAt,
      })),
      hasCustomProviderFeature: req.user.features?.customAIProvider || false,
    });
  })
);

/**
 * POST /api/ai-settings
 * Set AI provider settings (requires paid feature)
 */
router.post(
  '/',
  authenticate,
  requireCustomAIProvider,
  [
    body('provider').isIn(['gemini', 'claude']).withMessage('Invalid provider'),
    body('model').optional().isString(), // ✅ Allow model field
    body('apiKey').optional().isString().trim().withMessage('API key must be a string'),
    body('useOwnKey').optional().isBoolean().withMessage('useOwnKey must be boolean'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    // ✅ Extract 'model' from body
    const { provider, apiKey, useOwnKey = false, model } = req.body;

    // If user wants to use their own key, validate it
    if (useOwnKey) {
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'API key is required when using own key',
        });
      }

      // Validate API key
      const isValid = await ProviderFactory.validateApiKey(provider, apiKey);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid API key',
        });
      }
    }

    // Deactivate all existing settings for this user (Single active provider logic)
    await models.AIProviderSetting.update(
      { isActive: false },
      {
        where: { userId: req.user.id }
      }
    );

    // Create new setting
    const encryptedKey = useOwnKey && apiKey 
      ? encryptionService.encrypt(apiKey)
      : null;

    // Check if record exists to update or create new
    const [setting, created] = await models.AIProviderSetting.findOrCreate({
      where: { userId: req.user.id, provider },
      defaults: {
        isActive: true,
        isUserProvided: useOwnKey,
        encryptedApiKey: encryptedKey,
        model: model // ✅ Save model on create
      }
    });

    if (!created) {
      await setting.update({
        isActive: true,
        isUserProvided: useOwnKey,
        encryptedApiKey: encryptedKey || (useOwnKey ? setting.encryptedApiKey : null),
        model: model // ✅ Update model on update
      });
    }

    res.json({
      success: true,
      message: 'AI provider settings updated successfully',
      setting: {
        id: setting.id,
        provider: setting.provider,
        model: setting.model, // ✅ Return updated model
        isUserProvided: setting.isUserProvided,
        isActive: setting.isActive,
      },
    });
  })
);

/**
 * PUT /api/ai-settings/:settingId
 * Update AI provider setting
 */
router.put(
  '/:settingId',
  authenticate,
  requireCustomAIProvider,
  [
    body('apiKey').optional().isString().trim(),
    body('isActive').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { settingId } = req.params;
    const { apiKey, isActive } = req.body;

    // Get setting
    const setting = await models.AIProviderSetting.findOne({
      where: {
        id: settingId,
        userId: req.user.id,
      },
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found',
      });
    }

    // Update fields
    const updates = {};

    if (apiKey !== undefined && setting.isUserProvided) {
      // Validate new key
      const isValid = await ProviderFactory.validateApiKey(setting.provider, apiKey);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid API key',
        });
      }
      updates.encryptedApiKey = encryptionService.encrypt(apiKey);
    }

    if (isActive !== undefined) {
      if (isActive) {
        // Deactivate other settings for this provider
        await models.AIProviderSetting.update(
          { isActive: false },
          {
            where: {
              userId: req.user.id,
              provider: setting.provider,
              id: { [models.Sequelize.Op.ne]: settingId },
            },
          }
        );
      }
      updates.isActive = isActive;
    }

    await setting.update(updates);

    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting: {
        id: setting.id,
        provider: setting.provider,
        isUserProvided: setting.isUserProvided,
        isActive: setting.isActive,
      },
    });
  })
);

/**
 * DELETE /api/ai-settings/:settingId
 * Delete AI provider setting
 */
router.delete(
  '/:settingId',
  authenticate,
  requireCustomAIProvider,
  asyncHandler(async (req, res) => {
    const { settingId } = req.params;

    const setting = await models.AIProviderSetting.findOne({
      where: {
        id: settingId,
        userId: req.user.id,
      },
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found',
      });
    }

    await setting.destroy();

    res.json({
      success: true,
      message: 'Setting deleted successfully',
    });
  })
);

/**
 * GET /api/ai-settings/providers
 * Get available AI providers
 */
router.get(
  '/providers',
  authenticate,
  asyncHandler(async (req, res) => {
    const providers = ProviderFactory.getAvailableProviders();

    res.json({
      success: true,
      providers: providers.map(name => ({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
      })),
    });
  })
);

export default router;
