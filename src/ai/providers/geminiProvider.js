import { GoogleGenerativeAI } from "@google/generative-ai";
import { HfInference } from "@huggingface/inference"; // 👈 IMPORT THIS
import AIProvider from "./AIProvider.js";

/**
 * Gemini AI Provider Implementation
 * Uses Gemini for Text Generation
 * Uses Hugging Face (Qwen) for Embeddings
 */
class GeminiProvider extends AIProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    
    // 1. Initialize Gemini for Chat
    this.client = new GoogleGenerativeAI(apiKey);
    this.completionModel = options.model || "gemini-2.5-flash-lite"; // Updated to latest stable flash

    // 2. Initialize Hugging Face for Embeddings
    // We grab the key from env directly to avoid changing Factory signature
    const hfToken = process.env.HF_API_KEY; 
    if (!hfToken) {
      console.warn("⚠️ HF_API_KEY missing. Embeddings will fail.");
    }
    this.hf = new HfInference(hfToken);
    
    // Using the Qwen model you requested
    this.embeddingModel = "sentence-transformers/all-mpnet-base-v2";
  }

  /**
   * Generate embedding using Hugging Face
   */
  async generateEmbedding(text) {
    try {
      // ✅ Use Hugging Face Inference API
      const result = await this.hf.featureExtraction({
        model: this.embeddingModel,
        inputs: text,
      });

      // Handle different response formats (sometimes it returns nested arrays)
      if (Array.isArray(result) && Array.isArray(result[0])) {
        return result[0]; // Batch format
      }
      return result; // Single vector format

    } catch (error) {
      console.error("Hugging Face embedding error:", error.message);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate completion using Gemini (Unchanged)
   */
  async generateCompletion(prompt, options = {}) {
    try {
      const model = this.client.getGenerativeModel({
        model: this.completionModel,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 8192,
          topP: options.topP || 0.95,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;

      if (!response || !response.text) {
        throw new Error("Invalid response from Gemini");
      }

      return response.text();
    } catch (error) {
      console.error("Gemini completion error:", error.message);
      throw new Error(`Failed to generate Gemini completion: ${error.message}`);
    }
  }

  /**
   * Get provider name
   */
  getName() {
    return "gemini";
  }

  /**
   * Get embedding dimension
   * ⚠️ IMPORTANT: You must reset/clear your Vector DB because
   * dimensions changed from 768 (Gemini) to 3584 (Qwen)
   */
  getEmbeddingDimension() {
    return 3584; 
  }

  /**
   * Validate API key
   */
  async validateApiKey() {
    try {
      // Validate Gemini Key (Generation)
      const model = this.client.getGenerativeModel({ model: this.completionModel });
      await model.generateContent("test");
      return true;
    } catch (error) {
      console.error("Gemini API key validation failed:", error.message);
      return false;
    }
  }
}

export default GeminiProvider;