import Anthropic from '@anthropic-ai/sdk';
import AIProvider from './AIProvider.js';

/**
 * Claude (Anthropic) AI Provider Implementation
 * Note: Anthropic doesn't provide embeddings, so we use a fallback approach
 */
class ClaudeProvider extends AIProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.client = new Anthropic({ apiKey });
    this.completionModel = options.model || 'claude-sonnet-4-20250514';
    // For embeddings, we'll use text features (fallback: use another provider)
    this.embeddingFallback = options.embeddingProvider || null;
  }

  /**
   * Generate embedding for text
   * Note: Anthropic doesn't provide embeddings natively
   * This is a fallback implementation
   */
  async generateEmbedding(text) {
    // If an embedding fallback provider is set, use it
    if (this.embeddingFallback) {
      return await this.embeddingFallback.generateEmbedding(text);
    }

    // Otherwise, create a simple feature-based embedding
    // This is NOT recommended for production - use Gemini or OpenAI for embeddings
    console.warn('⚠️ Using Claude without proper embedding provider. Consider using Gemini for embeddings.');
    
    // Return a dummy embedding (in production, you should use a proper embedding model)
    const dummyEmbedding = new Array(768).fill(0);
    return dummyEmbedding;
  }

  /**
   * Generate completion/response
   */
  async generateCompletion(prompt, options = {}) {
    try {
      const message = await this.client.messages.create({
        model: this.completionModel,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      if (!message.content || message.content.length === 0) {
        throw new Error('Invalid response from Claude');
      }

      // Extract text from response
      const textContent = message.content.find(block => block.type === 'text');
      if (!textContent) {
        throw new Error('No text content in Claude response');
      }

      return textContent.text;
    } catch (error) {
      console.error('Claude completion error:', error.message);
      throw new Error(`Failed to generate Claude completion: ${error.message}`);
    }
  }

  /**
   * Get provider name
   */
  getName() {
    return 'claude';
  }

  /**
   * Get embedding dimension
   */
  getEmbeddingDimension() {
    // If using fallback, match its dimension
    if (this.embeddingFallback) {
      return this.embeddingFallback.getEmbeddingDimension();
    }
    return 768; // Default dimension
  }

  /**
   * Validate API key
   */
  async validateApiKey() {
    try {
      // Test with a minimal completion request
      await this.generateCompletion('Hello', { maxTokens: 10 });
      return true;
    } catch (error) {
      console.error('Claude API key validation failed:', error.message);
      return false;
    }
  }

  /**
   * Set embedding fallback provider
   */
  setEmbeddingFallback(provider) {
    this.embeddingFallback = provider;
  }
}

export default ClaudeProvider;
