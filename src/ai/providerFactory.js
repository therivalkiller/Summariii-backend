import GeminiProvider from './providers/geminiProvider.js';
import ClaudeProvider from './providers/claudeProvider.js';
import config from '../config/env.js';
import encryptionService from '../services/encryptionService.js';
import { models } from '../db/client.js';

/**
 * AI Provider Factory
 * Creates and manages AI provider instances
 */
class ProviderFactory {
  /**
   * Get AI provider for a user
   * @param {string} userId - User ID
   * @param {string} providerType - Provider type ('gemini' or 'claude')
   * @returns {Promise<AIProvider>} - AI provider instance
   */
  static async getProvider(userId, providerType = 'gemini') {
    try {
      // Get user's AI settings
      const settings = await models.AIProviderSetting.findOne({
        where: {
          userId,
          provider: providerType,
          isActive: true,
        },
      });

      let apiKey;
      // ✅ FIX 1: Capture the model preference from DB
      let preferredModel = settings?.model; 
      
      if (settings && settings.isUserProvided && settings.encryptedApiKey) {
        // User provided their own API key
        apiKey = encryptionService.decrypt(settings.encryptedApiKey);
      } else {
        // Use platform default API key
        apiKey = this.getDefaultApiKey(providerType);
      }

      // ✅ FIX 2: Pass options object with the model
      return this.createProvider(providerType, apiKey, { model: preferredModel });
    } catch (error) {
      console.error('Error getting AI provider:', error.message);
      throw new Error('Failed to initialize AI provider');
    }
  }

  /**
   * Create provider instance
   * @param {string} providerType - Provider type
   * @param {string} apiKey - API key
   * @param {Object} options - Extra options (like model)
   * @returns {AIProvider} - Provider instance
   */
  // ✅ FIX 3: Accept options parameter
  static createProvider(providerType, apiKey, options = {}) {
    switch (providerType) {
      case 'gemini':
        // ✅ FIX 4: Pass options to Gemini
        return new GeminiProvider(apiKey, options);
      
      case 'claude': {
        // ✅ FIX 5: Pass options to Claude
        const claudeProvider = new ClaudeProvider(apiKey, options);
        
        try {
          const geminiKey = this.getDefaultApiKey('gemini');
          const geminiProvider = new GeminiProvider(geminiKey);
          claudeProvider.setEmbeddingFallback(geminiProvider);
        } catch (error) {
          console.warn('⚠️ Could not set embedding fallback for Claude');
        }
        
        return claudeProvider;
      }
      
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }

  /**
   * Get default platform API key for provider
   * @param {string} providerType - Provider type
   * @returns {string} - API key
   */
  static getDefaultApiKey(providerType) {
    switch (providerType) {
      case 'gemini':
        if (!config.ai.gemini.apiKey) {
          throw new Error('Gemini API key not configured');
        }
        return config.ai.gemini.apiKey;
      
      case 'claude':
        if (!config.ai.anthropic.apiKey) {
          throw new Error('Claude API key not configured');
        }
        return config.ai.anthropic.apiKey;
      
      default:
        throw new Error(`No default API key for provider: ${providerType}`);
    }
  }

  /**
   * Validate a user-provided API key
   * @param {string} providerType - Provider type
   * @param {string} apiKey - API key to validate
   * @returns {Promise<boolean>} - True if valid
   */
  static async validateApiKey(providerType, apiKey) {
    try {
      const provider = this.createProvider(providerType, apiKey);
      return await provider.validateApiKey();
    } catch (error) {
      console.error('API key validation error:', error.message);
      return false;
    }
  }

  /**
   * Get available providers
   * @returns {string[]} - List of provider names
   */
  static getAvailableProviders() {
    return ['gemini', 'claude'];
  }
}

export default ProviderFactory;