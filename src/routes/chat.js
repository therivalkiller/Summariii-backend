import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import ragService from '../services/ragService.js';
import { models } from '../db/client.js';

const router = express.Router();

/**
 * GET /api/chat/history/:documentId
 * Get chat history for a document
 */
router.get(
  '/history/:documentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;

    // Verify document belongs to user
    const document = await models.Document.findOne({
      where: {
        id: documentId,
        userId: req.user.id,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Get chat messages
    const messages = await models.ChatMessage.findAll({
      where: {
        documentId,
        userId: req.user.id,
      },
      order: [['timestamp', 'ASC']],
      attributes: ['id', 'role', 'content', 'sources', 'confidence', 'error', 'timestamp'],
    });

    res.json({
      success: true,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
        confidence: msg.confidence,
        error: msg.error,
        timestamp: msg.timestamp,
      })),
    });
  })
);

/**
 * DELETE /api/chat/history/:documentId
 * Clear chat history for a document
 */
router.delete(
  '/history/:documentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;

    // Verify document belongs to user
    const document = await models.Document.findOne({
      where: {
        id: documentId,
        userId: req.user.id,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Delete all messages for this document
    await models.ChatMessage.destroy({
      where: {
        documentId,
        userId: req.user.id,
      },
    });

    res.json({
      success: true,
      message: 'Chat history cleared',
    });
  })
);

/**
 * POST /api/chat
 * Chat with document using RAG
 */
router.post(
  '/',
  authenticate,
  [
    body('documentId').isUUID().withMessage('Valid document ID is required'),
    body('question').isString().trim().notEmpty().withMessage('Question is required'),
    body('provider').optional().isIn(['gemini', 'claude']).withMessage('Invalid provider'),
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { documentId, question, provider = 'gemini' } = req.body;

    // Verify document belongs to user
    const document = await models.Document.findOne({
      where: {
        id: documentId,
        userId: req.user.id,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    if (document.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Document is still processing',
        status: document.status,
      });
    }

    // Save user message
    await models.ChatMessage.create({
      documentId,
      userId: req.user.id,
      role: 'user',
      content: question,
      timestamp: new Date(),
    });

    try {
      // 🔥 Get recent conversation history from database (last 10 messages)
      const recentMessages = await models.ChatMessage.findAll({
        where: {
          documentId,
          userId: req.user.id,
        },
        order: [['timestamp', 'DESC']],
        limit: 10,
        attributes: ['role', 'content', 'confidence', 'timestamp'],
      });

      // Reverse to get chronological order
      const conversationHistory = recentMessages.reverse().slice(0, -1); // Exclude the message we just added

      // Answer question using RAG with conversation context
      const result = await ragService.answerQuestion({
        question,
        documentId,
        userId: req.user.id,
        provider,
        conversationHistory: conversationHistory.map(msg => ({
          question: msg.role === 'user' ? msg.content : null,
          answer: msg.role === 'assistant' ? msg.content : null,
          confidence: msg.confidence,
          timestamp: msg.timestamp,
        })).filter(msg => msg.question || msg.answer),
      });

      // Save assistant message
      await models.ChatMessage.create({
        documentId,
        userId: req.user.id,
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        confidence: result.confidence,
        timestamp: new Date(),
      });

      res.json({
        success: true,
        answer: result.answer,
        sources: result.sources,
        confidence: result.confidence,
        suggestedQuestions: result.suggestedQuestions,
      });
    } catch (error) {
      console.error('Chat error:', error);
      
      // 🔥 User-friendly error message
      let userMessage = "I'm having trouble processing your question right now. ";
      
      if (error.message.includes('API key')) {
        userMessage += "There's an issue with the AI service configuration.";
      } else if (error.message.includes('rate limit')) {
        userMessage += "Too many requests. Please try again in a moment.";
      } else if (error.message.includes('embedding')) {
        userMessage += "I couldn't analyze your question properly.";
      } else if (error.message.includes('vector')) {
        userMessage += "I couldn't search the document effectively.";
      } else {
        userMessage += "Please try rephrasing your question or try again later.";
      }

      // Save error message to database
      await models.ChatMessage.create({
        documentId,
        userId: req.user.id,
        role: 'assistant',
        content: userMessage,
        error: true,
        timestamp: new Date(),
      });

      res.status(500).json({
        success: false,
        error: userMessage,
        answer: userMessage, // For frontend compatibility
      });
    }
  })
);

/**
 * POST /api/chat/conversation
 * Multi-turn conversation with document
 */
router.post(
  '/conversation',
  authenticate,
  [
    body('documentId').isUUID().withMessage('Valid document ID is required'),
    body('messages').isArray({ min: 1 }).withMessage('Messages array is required'),
    body('provider').optional().isIn(['gemini', 'claude']).withMessage('Invalid provider'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { documentId, messages, provider = 'gemini' } = req.body;

    // Verify document
    const document = await models.Document.findOne({
      where: {
        id: documentId,
        userId: req.user.id,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    if (document.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Document is still processing',
      });
    }

    // Process conversation
    const response = await ragService.chatWithDocument({
      messages,
      documentId,
      userId: req.user.id,
      provider,
    });

    res.json({
      success: true,
      response,
    });
  })
);

/**
 * GET /api/chat/insights/:documentId
 * Get document insights
 */
router.get(
  '/insights/:documentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { provider = 'gemini' } = req.query;

    // Verify document
    const document = await models.Document.findOne({
      where: {
        id: documentId,
        userId: req.user.id,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    if (document.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Document is still processing',
      });
    }

    try {
      // Get insights
      const insights = await ragService.getDocumentInsights({
        documentId,
        userId: req.user.id,
        provider,
      });

      res.json({
        success: true,
        insights,
      });
    } catch (error) {
      console.error('Insights error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate insights. Please try again.',
      });
    }
  })
);

export default router;