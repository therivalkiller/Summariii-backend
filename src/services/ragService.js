import ProviderFactory from "../ai/providerFactory.js";
import vectorStoreService from "./vectorStore.js";

/**
 * RAG Service
 * Handles Retrieval-Augmented Generation for question answering
 */
class RAGService {
  constructor() {
    this.maxHistoryLength = 6; // Keep last 6 exchanges (3 Q&A pairs)
  }

  /**
   * Build contextualized query from conversation history
   * @param {string} currentQuestion - Current question
   * @param {Array} history - Conversation history from database
   * @returns {string} - Contextualized query
   */
  buildContextualizedQuery(currentQuestion, history) {
    if (!history || history.length === 0) {
      return currentQuestion;
    }

    // Group by Q&A pairs
    const pairs = [];
    for (let i = 0; i < history.length; i += 2) {
      if (history[i] && history[i + 1]) {
        pairs.push({
          question: history[i].question || history[i].content,
          answer: history[i + 1].answer || history[i + 1].content,
        });
      }
    }

    // Get last 3 pairs
    const recentPairs = pairs.slice(-3);

    if (recentPairs.length === 0) {
      return currentQuestion;
    }

    const context = recentPairs
      .map((pair) => `Q: ${pair.question}\nA: ${pair.answer.substring(0, 200)}`)
      .join("\n");

    return `Previous conversation:\n${context}\n\nCurrent question: ${currentQuestion}`;
  }

  /**
   * Generate suggested follow-up questions
   * @param {string} answer - Generated answer
   * @param {string} context - Retrieved context
   * @returns {Array} - Suggested questions
   */
  generateSuggestedQuestions(answer, context) {
    const suggestions = [];

    if (
      answer.toLowerCase().includes("because") ||
      answer.toLowerCase().includes("due to")
    ) {
      suggestions.push("Can you explain that in more detail?");
    }
    if (
      answer.toLowerCase().includes("example") ||
      answer.toLowerCase().includes("such as")
    ) {
      suggestions.push("Are there other examples?");
    }
    if (
      context.includes("chart") ||
      context.includes("table") ||
      context.includes("figure")
    ) {
      suggestions.push("What are the key findings from the data?");
    }
    if (answer.length > 500) {
      suggestions.push("Can you summarize that more briefly?");
    }

    // Default suggestions
    if (suggestions.length < 3) {
      const defaults = [
        "What are the main takeaways?",
        "Can you elaborate on this?",
        "What else should I know about this?",
        "Are there any related topics?",
      ];
      suggestions.push(...defaults.slice(0, 3 - suggestions.length));
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Answer question using RAG with conversation awareness
   * @param {Object} params - RAG parameters
   * @param {string} params.question - User question
   * @param {string} params.documentId - Document ID
   * @param {string} params.userId - User ID
   * @param {string} params.provider - AI provider to use
   * @param {Array} params.conversationHistory - Conversation history from database
   * @param {number} params.topK - Number of chunks to retrieve
   * @returns {Promise<Object>} - Answer and sources
   */
  async answerQuestion({
    question,
    documentId,
    userId,
    provider = "gemini",
    conversationHistory = [],
    topK = 5,
  }) {
    try {
      // Get AI provider
      const aiProvider = await ProviderFactory.getProvider(userId, provider);

      // Build contextualized query for better retrieval
      const contextualizedQuery = this.buildContextualizedQuery(
        question,
        conversationHistory,
      );

      // Generate embedding for the contextualized query
      const questionEmbedding = await aiProvider.generateEmbedding(
        conversationHistory.length > 0 ? contextualizedQuery : question,
      );

      // Retrieve relevant chunks from vector store
      const relevantChunks = await vectorStoreService.query({
        queryEmbedding: questionEmbedding,
        userId,
        documentId,
        topK,
      });

      if (relevantChunks.length === 0) {
        return {
          answer:
            "I couldn't find relevant information in the document to answer your question. Could you try rephrasing or asking something else?",
          sources: [],
          confidence: 0,
          suggestedQuestions: [
            "What is this document about?",
            "Can you summarize the main points?",
            "What are the key topics covered?",
          ],
        };
      }

      // Build context from retrieved chunks
      const context = relevantChunks
        .map((chunk, idx) => {
          const preview =
            chunk.text.length > 500
              ? chunk.text.substring(0, 500) + "..."
              : chunk.text;
          return `[Source ${idx + 1}] (Relevance: ${(chunk.score * 100).toFixed(0)}%)\n${preview}`;
        })
        .join("\n\n---\n\n");

      // Build enhanced RAG prompt with conversation history
      const prompt = this.buildEnhancedRAGPrompt(
        question,
        context,
        conversationHistory,
      );

      const isLongFormRequest = question
        .toLowerCase()
        .match(
          /give me|generate|create|write|list|explain all|describe all|\d+\s*(questions|examples|points|items)/,
        );
      const maxTokens = isLongFormRequest ? 2500 : 1200;

      // Generate answer
      const answer = await aiProvider.generateCompletion(prompt, {
        temperature: 0.3,
        maxTokens,
      });

      // Calculate confidence based on similarity scores
      const avgScore =
        relevantChunks.reduce((sum, c) => sum + c.score, 0) /
        relevantChunks.length;
      const confidence = Math.min(avgScore * 100, 100);

      // Generate suggested follow-up questions
      const suggestedQuestions = this.generateSuggestedQuestions(
        answer,
        context,
      );

      return {
        answer: answer.trim(),
        sources: relevantChunks.map((chunk) => ({
          text: chunk.text,
          score: chunk.score,
          chunkIndex: chunk.chunkIndex,
          preview: chunk.text.substring(0, 200) + "...",
        })),
        confidence: Math.round(confidence),
        suggestedQuestions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("RAG error:", error.message);
      throw new Error(`Failed to answer question: ${error.message}`);
    }
  }

  /**
   * Build enhanced RAG prompt with conversation history
   * @param {string} question - User question
   * @param {string} context - Retrieved context
   * @param {Array} history - Conversation history from database
   * @returns {string} - Enhanced RAG prompt
   */
  buildEnhancedRAGPrompt(question, context, history) {
    let conversationContext = "";

    if (history && history.length > 0) {
      // Group by Q&A pairs
      const pairs = [];
      for (let i = 0; i < history.length; i += 2) {
        if (history[i] && history[i + 1]) {
          pairs.push({
            question: history[i].question || history[i].content,
            answer: history[i + 1].answer || history[i + 1].content,
          });
        }
      }

      // Get last 3 pairs
      const recentPairs = pairs.slice(-3);

      if (recentPairs.length > 0) {
        conversationContext = `
Previous conversation context:
${recentPairs
  .map(
    (pair, idx) => `
Q${idx + 1}: ${pair.question}
A${idx + 1}: ${pair.answer.substring(0, 150)}${pair.answer.length > 150 ? "..." : ""}
`,
  )
  .join("\n")}

---
`;
      }
    }

    return `You are an intelligent document assistant that provides accurate, well-structured answers based on the given context. 

**STRICT RULES:**
1. Answer ONLY using information from the context below
2. If the answer isn't in the context, clearly state: "I don't have enough information to answer that question based on the document."
3. ALWAYS cite sources using [Source X] notation when making claims
4. Be conversational but professional
5. Structure longer answers with clear paragraphs
6. If the question references previous conversation (like "more", "elaborate", "continue"), use that context to provide better answers
7. Don't make assumptions or add information not in the sources

${conversationContext}

**CONTEXT FROM DOCUMENT:**
${context}

**CURRENT QUESTION:** ${question}

**YOUR ANSWER:**
Provide a clear, well-structured answer with proper citations. Use markdown formatting for better readability (bold, lists, etc.).`;
  }

  /**
   * Chat with document (multi-turn conversation)
   * @param {Object} params - Chat parameters
   * @param {Array} params.messages - Conversation history
   * @param {string} params.documentId - Document ID
   * @param {string} params.userId - User ID
   * @param {string} params.provider - AI provider
   * @returns {Promise<Object>} - Response
   */
  async chatWithDocument({
    messages,
    documentId,
    userId,
    provider = "gemini",
  }) {
    try {
      // Get the last user message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== "user") {
        throw new Error("Last message must be from user");
      }

      // Use RAG for the current question
      const result = await this.answerQuestion({
        question: lastMessage.content,
        documentId,
        userId,
        provider,
        conversationHistory: messages.slice(0, -1), // All messages except the last one
      });

      return {
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        confidence: result.confidence,
        suggestedQuestions: result.suggestedQuestions,
        timestamp: result.timestamp,
      };
    } catch (error) {
      console.error("Chat error:", error.message);
      throw new Error(`Failed to process chat: ${error.message}`);
    }
  }

  /**
   * Get document insights with better analysis
   * @param {Object} params - Parameters
   * @param {string} params.documentId - Document ID
   * @param {string} params.userId - User ID
   * @param {string} params.provider - AI provider
   * @returns {Promise<Object>} - Document insights
   */
  async getDocumentInsights({ documentId, userId, provider = "gemini" }) {
    try {
      const aiProvider = await ProviderFactory.getProvider(userId, provider);

      // Query for representative chunks
      const dummyEmbedding = await aiProvider.generateEmbedding(
        "main topics themes key concepts",
      );
      const chunks = await vectorStoreService.query({
        queryEmbedding: dummyEmbedding,
        userId,
        documentId,
        topK: 15,
      });

      if (chunks.length === 0) {
        return {
          mainTopics: [],
          keyThemes: [],
          suggestedQuestions: [],
        };
      }

      // Combine chunks
      const context = chunks.map((c) => c.text).join("\n\n");

      // Generate comprehensive insights
      const prompt = `Analyze the following document excerpts and provide:

1. **Main Topics** (3-5 topics): What are the primary subjects discussed?
2. **Key Themes** (3-5 themes): What are the underlying themes or concepts?
3. **Important Entities** (people, places, organizations mentioned)
4. **Document Type**: What kind of document is this? (research paper, guide, report, etc.)
5. **Suggested Questions** (5 questions): What questions would help someone understand this document better?

Be specific and insightful. Format your response clearly.

Document excerpts:
${context.substring(0, 8000)}

**ANALYSIS:**`;

      const insights = await aiProvider.generateCompletion(prompt, {
        temperature: 0.4,
        maxTokens: 1000,
      });

      // Parse suggested questions from insights
      const questionMatch = insights.match(
        /(?:suggested questions|questions)[\s\S]*?(\d+\.[\s\S]*)/i,
      );
      const suggestedQuestions = questionMatch
        ? questionMatch[1]
            .split("\n")
            .filter((q) => q.match(/^\d+\./))
            .map((q) => q.replace(/^\d+\.\s*/, "").trim())
            .slice(0, 5)
        : [];

      return {
        insights: insights.trim(),
        basedOnChunks: chunks.length,
        suggestedQuestions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Insights error:", error.message);
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }

  /**
   * Get starter questions for a document
   * @param {Object} params - Parameters
   * @returns {Promise<Array>} - Starter questions
   */
  async getStarterQuestions({ documentId, userId, provider = "gemini" }) {
    try {
      const insights = await this.getDocumentInsights({
        documentId,
        userId,
        provider,
      });

      const defaultQuestions = [
        "What is this document about?",
        "What are the main points?",
        "Can you summarize the key findings?",
        "What are the most important takeaways?",
        "Who is the intended audience?",
      ];

      return insights.suggestedQuestions.length > 0
        ? insights.suggestedQuestions
        : defaultQuestions;
    } catch (error) {
      console.error("Starter questions error:", error.message);
      return [
        "What is this document about?",
        "What are the main points?",
        "Can you summarize this?",
      ];
    }
  }
}

// Export singleton instance
const ragService = new RAGService();
export default ragService;
