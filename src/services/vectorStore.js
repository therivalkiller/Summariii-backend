import { getPineconeIndex } from '../config/vectorDb.js';

/**
 * Vector Store Service
 * Manages embeddings in Pinecone
 */
class VectorStoreService {
  /**
   * Store embeddings in vector database
   * @param {Object} params - Storage parameters
   * @param {string} params.documentId - Document ID
   * @param {string} params.userId - User ID
   * @param {Array} params.chunks - Array of text chunks
   * @param {Array} params.embeddings - Array of embedding vectors
   * @returns {Promise<number>} - Number of vectors stored
   */
  async storeEmbeddings({ documentId, userId, chunks, embeddings }) {
    try {
      if (chunks.length !== embeddings.length) {
        throw new Error('Chunks and embeddings arrays must have same length');
      }

      const index = await getPineconeIndex();

      // Prepare vectors for upsert
      const vectors = chunks.map((chunk, idx) => ({
        id: `${documentId}-chunk-${idx}`,
        values: embeddings[idx],
        metadata: {
          userId,
          documentId,
          chunkIndex: idx,
          text: chunk,
          timestamp: new Date().toISOString(),
        },
      }));

      // Upsert in batches (Pinecone recommends batch size of 100)
      const batchSize = 100;
      let totalUpserted = 0;

      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(batch);
        totalUpserted += batch.length;
        console.log(`✅ Upserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} vectors`);
      }

      console.log(`✅ Successfully stored ${totalUpserted} embeddings for document ${documentId}`);
      return totalUpserted;
    } catch (error) {
      console.error('Vector store error:', error.message);
      throw new Error(`Failed to store embeddings: ${error.message}`);
    }
  }

  /**
   * Query vector database
   * @param {Object} params - Query parameters
   * @param {Array} params.queryEmbedding - Query embedding vector
   * @param {string} params.userId - User ID
   * @param {string} params.documentId - Document ID (optional)
   * @param {number} params.topK - Number of results to return
   * @returns {Promise<Array>} - Query results
   */
  async query({ queryEmbedding, userId, documentId = null, topK = 5 }) {
    try {
      const index = await getPineconeIndex();

      // Build filter
      const filter = { userId };
      if (documentId) {
        filter.documentId = documentId;
      }

      // Query Pinecone
      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
      });

      if (!queryResponse.matches || queryResponse.matches.length === 0) {
        return [];
      }

      // Format results
      return queryResponse.matches.map(match => ({
        id: match.id,
        score: match.score,
        text: match.metadata?.text || '',
        documentId: match.metadata?.documentId,
        chunkIndex: match.metadata?.chunkIndex,
      }));
    } catch (error) {
      console.error('Vector query error:', error.message);
      throw new Error(`Failed to query vectors: ${error.message}`);
    }
  }

  /**
   * Delete embeddings for a document
   * @param {string} documentId - Document ID
   * @returns {Promise<void>}
   */
  async deleteDocument(documentId) {
    try {
      const index = await getPineconeIndex();

      // Delete by filter
      await index.deleteMany({
        filter: { documentId },
      });

      console.log(`✅ Deleted embeddings for document ${documentId}`);
    } catch (error) {
      console.error('Vector delete error:', error.message);
      throw new Error(`Failed to delete embeddings: ${error.message}`);
    }
  }

  /**
   * Delete all embeddings for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteUserData(userId) {
    try {
      const index = await getPineconeIndex();

      await index.deleteMany({
        filter: { userId },
      });

      console.log(`✅ Deleted all embeddings for user ${userId}`);
    } catch (error) {
      console.error('Vector delete error:', error.message);
      throw new Error(`Failed to delete user embeddings: ${error.message}`);
    }
  }

  /**
   * Get document statistics
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} - Document statistics
   */
  async getDocumentStats(documentId) {
    try {
      const index = await getPineconeIndex();

      // Query to get count (Pinecone doesn't have direct count, so we fetch with limit)
      const result = await index.query({
        vector: new Array(768).fill(0), // Dummy vector
        topK: 10000,
        includeMetadata: true,
        filter: { documentId },
      });

      return {
        documentId,
        vectorCount: result.matches?.length || 0,
      };
    } catch (error) {
      console.error('Stats error:', error.message);
      return {
        documentId,
        vectorCount: 0,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
const vectorStoreService = new VectorStoreService();
export default vectorStoreService;
