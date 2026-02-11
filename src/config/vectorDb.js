import { Pinecone } from '@pinecone-database/pinecone';
import config from './env.js';

/**
 * Pinecone client instance
 */
let pineconeClient = null;

/**
 * Initialize Pinecone client
 */
export async function initializePinecone() {
  if (pineconeClient) {
    return pineconeClient;
  }

  try {
    pineconeClient = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });

    console.log('✅ Pinecone client initialized');
    return pineconeClient;
  } catch (error) {
    console.error('❌ Failed to initialize Pinecone:', error.message);
    throw error;
  }
}

/**
 * Get Pinecone index
 */
export async function getPineconeIndex() {
  if (!pineconeClient) {
    await initializePinecone();
  }

  return pineconeClient.index(config.pinecone.indexName);
}

/**
 * Pinecone configuration
 */
export const pineconeConfig = {
  indexName: config.pinecone.indexName,
  dimension: 768, // Standard embedding dimension (adjust based on model)
  metric: 'cosine',
};

export default {
  initializePinecone,
  getPineconeIndex,
  pineconeConfig,
};
