import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { models } from '../db/client.js';

const router = express.Router();

/**
 * GET /api/summary
 * Get document summary and notes
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { documentId } = req.query;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required',
      });
    }

    // Get document
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

    res.json({
      success: true,
      documentId: document.id,
      filename: document.originalName,
      summary: document.summary,
      notes: document.notes,
      chunkCount: document.chunkCount,
    });
  })
);

/**
 * GET /api/summary/:documentId
 * Get document summary by ID
 */
router.get(
  '/:documentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;

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

    res.json({
      success: true,
      documentId: document.id,
      filename: document.originalName,
      summary: document.summary,
      notes: document.notes,
      chunkCount: document.chunkCount,
      createdAt: document.createdAt,
    });
  })
);

export default router;
