// import express from 'express';
// import multer from 'multer';
// import path from 'path';
// import fs from 'fs/promises';
// import { v4 as uuidv4 } from 'uuid';
// import { authenticate } from '../middleware/auth.js';
// import { asyncHandler } from '../middleware/errorHandler.js';
// import { models } from '../db/client.js';
// import pdfService from '../services/pdfService.js';
// import chunkService from '../services/chunkService.js';
// import vectorStoreService from '../services/vectorStore.js';
// import summaryService from '../services/summaryService.js';
// import ProviderFactory from '../ai/providerFactory.js';
// import config from '../config/env.js';

// const router = express.Router();

// // Store SSE clients
// const clients = new Map();

// // Configure multer (same as before)
// const storage = multer.diskStorage({
//   destination: async (req, file, cb) => {
//     const uploadDir = config.upload.uploadPath;
//     await fs.mkdir(uploadDir, { recursive: true });
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: config.upload.maxFileSize },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === 'application/pdf') {
//       cb(null, true);
//     } else {
//       cb(new Error('Only PDF files are allowed'));
//     }
//   },
// });

// /**
//  * SSE endpoint for progress updates
//  */
// router.get(
//   '/progress/:documentId',
//   authenticate,
//   (req, res) => {
//     const { documentId } = req.params;

//     // Set SSE headers
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');

//     // Store client connection
//     clients.set(documentId, res);

//     // Remove client on disconnect
//     req.on('close', () => {
//       clients.delete(documentId);
//     });
//   }
// );

// /**
//  * Send progress update to client
//  */
// function sendProgress(documentId, data) {
//   const client = clients.get(documentId);
//   if (client) {
//     client.write(`data: ${JSON.stringify(data)}\n\n`);
//   }
// }

// /**
//  * POST /api/upload
//  * Upload and process PDF with progress tracking
//  */
// router.post(
//   '/',
//   authenticate,
//   upload.single('file'),
//   asyncHandler(async (req, res) => {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         error: 'No file uploaded',
//       });
//     }

//     try {
//       const { provider = 'gemini' } = req.body;

//       // Create document record
//       const document = await models.Document.create({
//         userId: req.user.id,
//         filename: req.file.filename,
//         originalName: req.file.originalname,
//         fileSize: req.file.size,
//         mimeType: req.file.mimetype,
//         filePath: req.file.path,
//         embeddingProvider: provider,
//         status: 'processing',
//       });

//       // Process document asynchronously with progress tracking
//       processDocumentAsync(document.id, req.user.id, provider).catch(error => {
//         console.error('Document processing error:', error);
//         sendProgress(document.id, {
//           step: 'error',
//           message: error.message,
//           status: 'failed',
//         });
//       });

//       res.status(202).json({
//         success: true,
//         message: 'Document uploaded and processing started',
//         documentId: document.id,
//         status: 'processing',
//       });
//     } catch (error) {
//       if (req.file) {
//         await fs.unlink(req.file.path).catch(() => {});
//       }
//       throw error;
//     }
//   })
// );

// /**
//  * Process document with progress updates
//  */
// async function processDocumentAsync(documentId, userId, provider) {
//   try {
//     const document = await models.Document.findByPk(documentId);
//     if (!document) throw new Error('Document not found');

//     // Step 1: Extract text
//     sendProgress(documentId, {
//       step: 'extracting',
//       message: 'Extracting text from PDF...',
//       progress: 10,
//     });

//     const text = await pdfService.extractText(document.filePath);
    
//     sendProgress(documentId, {
//       step: 'extracted',
//       message: `Extracted ${text.length} characters from ${document.originalName}`,
//       progress: 20,
//     });

//     // Step 2: Chunk text
//     sendProgress(documentId, {
//       step: 'chunking',
//       message: 'Breaking document into chunks...',
//       progress: 30,
//     });

//     const chunks = chunkService.chunkByParagraphs(text);
    
//     sendProgress(documentId, {
//       step: 'chunked',
//       message: `Created ${chunks.length} chunks for processing`,
//       progress: 40,
//     });

//     // Step 3: Generate embeddings
//     sendProgress(documentId, {
//       step: 'embedding',
//       message: 'Generating AI embeddings...',
//       progress: 50,
//     });

//     const aiProvider = await ProviderFactory.getProvider(userId, provider);
//     const embeddings = await Promise.all(
//       chunks.map(chunk => aiProvider.generateEmbedding(chunk))
//     );

//     sendProgress(documentId, {
//       step: 'embedded',
//       message: `Generated ${embeddings.length} embeddings`,
//       progress: 60,
//     });

//     // Step 4: Store embeddings
//     sendProgress(documentId, {
//       step: 'storing',
//       message: 'Storing embeddings in vector database...',
//       progress: 70,
//     });

//     await vectorStoreService.storeEmbeddings({
//       documentId,
//       userId,
//       chunks,
//       embeddings,
//     });

//     sendProgress(documentId, {
//       step: 'stored',
//       message: 'Embeddings stored successfully',
//       progress: 80,
//     });

//     // Step 5: Generate summary
//     sendProgress(documentId, {
//       step: 'summarizing',
//       message: 'Generating comprehensive summary (this may take 30-60 seconds)...',
//       progress: 85,
//     });

//     const { summary, notes } = await summaryService.generateSummary({
//       text,
//       userId,
//       provider,
//     });

//     sendProgress(documentId, {
//       step: 'summarized',
//       message: `Summary generated (${summary.length} chars, ${notes.length} chars notes)`,
//       progress: 95,
//     });

//     // Step 6: Complete
//     await document.update({
//       status: 'completed',
//       summary,
//       notes,
//       chunkCount: chunks.length,
//     });

//     sendProgress(documentId, {
//       step: 'completed',
//       message: '✅ Document processed successfully!',
//       progress: 100,
//       status: 'completed',
//     });

//     // Close SSE connection
//     setTimeout(() => {
//       const client = clients.get(documentId);
//       if (client) {
//         client.end();
//         clients.delete(documentId);
//       }
//     }, 1000);

//   } catch (error) {
//     console.error('❌ Document processing failed:', error);

//     await models.Document.update(
//       { status: 'failed' },
//       { where: { id: documentId } }
//     );

//     sendProgress(documentId, {
//       step: 'error',
//       message: `Processing failed: ${error.message}`,
//       progress: 0,
//       status: 'failed',
//     });
//   }
// }

// export default router;