import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { models } from '../db/client.js';
import summaryService from '../services/summaryService.js';
import pdfService from '../services/pdfService.js';

const router = express.Router();

/**
 * Helper: Re-extract text from file
 * (Since we don't store raw text in DB to save space)
 */
async function getDocumentText(filePath) {
  try {
    return await pdfService.extractText(filePath);
  } catch (error) {
    throw new Error('Failed to read document text: ' + error.message);
  }
}

/**
 * GET /api/documents/:id/summary
 * Lazy load summary
 */
router.get(
  '/:id/summary',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Find Document
    const doc = await models.Document.findOne({ 
      where: { id, userId } 
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // 2. Return existing summary if available
    if (doc.summary) {
      return res.json({ success: true, summary: doc.summary });
    }

    // 3. Generate if missing
    // We assume 'gemini' as default or fetch from user settings if you have them stored
    const provider = doc.embeddingProvider || 'gemini'; 
    const text = await getDocumentText(doc.filePath);
    
    const summary = await summaryService.generateSummaryOnly({
      text,
      userId,
      provider
    });

    // 4. Save to DB
    await doc.update({ summary });

    res.json({ success: true, summary });
  })
);

/**
 * GET /api/documents/:id/notes
 * Lazy load revision notes
 */
router.get(
  '/:id/notes',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const doc = await models.Document.findOne({ 
      where: { id, userId } 
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    if (doc.notes) {
      return res.json({ success: true, notes: doc.notes });
    }

    const provider = doc.embeddingProvider || 'gemini';
    const text = await getDocumentText(doc.filePath);
    
    const notes = await summaryService.generateNotesOnly({
      text,
      userId,
      provider
    });

    await doc.update({ notes });

    res.json({ success: true, notes });
  })
);

export default router;