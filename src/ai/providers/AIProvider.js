/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */
class AIProvider {
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('API key is required for AI provider');
    }
    this.apiKey = apiKey;
    this.options = options;
  }

  /**
   * Generate embedding for text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateEmbedding(text) {
    throw new Error('generateEmbedding must be implemented by provider');
  }

  /**
   * Generate completion/response
   * @param {string} prompt - Prompt text
   * @param {Object} options - Provider-specific options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    throw new Error('generateCompletion must be implemented by provider');
  }

  /**
   * Get provider name
   * @returns {string} - Provider name
   */
  getName() {
    throw new Error('getName must be implemented by provider');
  }

  /**
   * Get embedding dimension
   * @returns {number} - Embedding vector dimension
   */
  getEmbeddingDimension() {
    throw new Error('getEmbeddingDimension must be implemented by provider');
  }

  /**
   * Validate API key
   * @returns {Promise<boolean>} - True if valid
   */
  async validateApiKey() {
    throw new Error('validateApiKey must be implemented by provider');
  }
}

export default AIProvider;
