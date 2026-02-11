import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { models } from '../db/client.js';
import pdfService from '../services/pdfService.js';
import chunkService from '../services/chunkService.js';
import vectorStoreService from '../services/vectorStore.js';
import ProviderFactory from '../ai/providerFactory.js';
import config from '../config/env.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = config.upload.uploadPath;
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * POST /api/upload
 * Upload and process PDF document
 */
router.post(
  '/',
  authenticate,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    try {
      const { provider = 'gemini' } = req.body;

      // Create document record
      const document = await models.Document.create({
        userId: req.user.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        filePath: req.file.path,
        embeddingProvider: provider,
        status: 'processing',
      });

      // Process document asynchronously
      processDocumentAsync(document.id, req.user.id, provider).catch(error => {
        console.error('Document processing error:', error);
      });

      res.status(202).json({
        success: true,
        message: 'Document uploaded and processing started',
        documentId: document.id,
        status: 'processing',
      });
    } catch (error) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      throw error;
    }
  })
);

/**
 * GET /api/upload/:documentId
 * Get document status and details
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

    res.json({
      success: true,
      document: {
        id: document.id,
        filename: document.originalName,
        fileSize: document.fileSize,
        status: document.status,
        summary: document.summary,
        notes: document.notes,
        chunkCount: document.chunkCount,
        createdAt: document.createdAt,
      },
    });
  })
);

/**
 * GET /api/upload
 * Get all user documents
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const documents = await models.Document.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.originalName,
        fileSize: doc.fileSize,
        status: doc.status,
        chunkCount: doc.chunkCount,
        createdAt: doc.createdAt,
      })),
    });
  })
);

/**
 * DELETE /api/upload/:documentId
 * Delete document
 */
router.delete(
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

    await fs.unlink(document.filePath).catch(() => {});
    await vectorStoreService.deleteDocument(documentId).catch(() => {});
    await document.destroy();

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  })
);

/**
 * Process document asynchronously
 * (Modified: Only does Embeddings now)
 */
async function processDocumentAsync(documentId, userId, provider) {
  try {
    const document = await models.Document.findByPk(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    console.log('\n🔄 Starting document processing:', documentId);

    // 1. Extract text
    const text = await pdfService.extractText(document.filePath);
    console.log('✅ Text extracted:', text.length, 'characters');

    // 2. Chunk text
    const chunks = chunkService.chunkByParagraphs(text);
    console.log('📦 Created', chunks.length, 'chunks');

    // 3. Generate Embeddings & Store in Vector DB
    const aiProvider = await ProviderFactory.getProvider(userId, provider);
    console.log('🔄 Generating embeddings...');
    
    // Note: If you have a lot of chunks, consider batching this Promise.all
    const embeddings = await Promise.all(
      chunks.map(chunk => aiProvider.generateEmbedding(chunk))
    );

    console.log('🔄 Storing in Vector DB...');
    await vectorStoreService.storeEmbeddings({
      documentId,
      userId,
      chunks,
      embeddings,
    });

    // 4. Update Status (Set summary/notes to null explicitly)
    await document.update({
      status: 'completed',
      summary: null,
      notes: null,
      chunkCount: chunks.length,
    });

    console.log(`✅ Document ${documentId} ready (Embeddings only)`);

  } catch (error) {
    console.error(`❌ Document processing failed:`, error);
    await models.Document.update(
      { status: 'failed' },
      { where: { id: documentId } }
    );
  }
}

export default router;