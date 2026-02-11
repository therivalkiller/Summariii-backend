import createApp from './app.js';
import config from './config/env.js';
import { testConnection, syncDatabase } from './db/client.js';
import { initializePinecone } from './config/vectorDb.js';

/**
 * Start the server
 */
async function startServer() {
  try {
    console.log('🚀 Starting RAG Backend Server...');
    console.log(`📍 Environment: ${config.nodeEnv}`);

    // Test database connection
    console.log('🔌 Testing database connection...');
    await testConnection();

    // Sync database (create tables)
    console.log('📊 Syncing database...');
    await syncDatabase();

    // Initialize Pinecone
    console.log('🧠 Initializing Pinecone...');
    await initializePinecone();

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(config.port, () => {
      console.log('');
      console.log('✅ Server started successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Server running at: http://localhost:${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🔐 Authentication: Clerk`);
      console.log(`💳 Payments: Stripe`);
      console.log(`🗄️  Vector DB: Pinecone`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📚 API Endpoints:');
      console.log('   GET  /health');
      console.log('   POST /api/upload');
      console.log('   GET  /api/upload');
      console.log('   POST /api/chat');
      console.log('   GET  /api/summary');
      console.log('   POST /api/ai-settings');
      console.log('   POST /api/billing/create-checkout-session');
      console.log('');
    });

    console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        const { closeConnection } = await import('./db/client.js');
        await closeConnection();
        
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start server
startServer();
