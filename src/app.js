import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import config from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import routes
import uploadRoutes from './routes/upload.js';
import chatRoutes from './routes/chat.js';
import summaryRoutes from './routes/summary.js'; // You might delete this if it was the old one
import documentsRoutes from './routes/documents.js'; // 👈 NEW IMPORT
import aiSettingsRoutes from './routes/aiSettings.js';
import billingRoutes from './routes/billing.js';


function createApp() {
  const app = express();

  app.use(helmet());

 app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if the origin is allowed
      const allowedOrigins = config.cors.allowedOrigins;
      
      // In development, allow everything (optional, but helpful)
      if (config.nodeEnv !== 'production') {
        return callback(null, true);
      }

      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use((req, res, next) => {
    if (req.originalUrl === '/api/billing/webhook') {
      next();
    } else {
      bodyParser.json()(req, res, next);
    }
  });

  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  });

  // API routes
  app.use('/api/upload', uploadRoutes);
  app.use('/api/documents', documentsRoutes); // 👈 NEW ROUTE
  app.use('/api/chat', chatRoutes);
  
  // Note: if 'summaryRoutes' was doing the old logic, you can deprecate/remove it
  // But I'll leave it if it does something else.
  // app.use('/api/summary', summaryRoutes); 
  
  app.use('/api/ai-settings', aiSettingsRoutes);
  app.use('/api/billing', billingRoutes);

  app.get('/', (req, res) => {
    res.json({
      message: 'RAG Backend API',
      version: '1.0.0',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;