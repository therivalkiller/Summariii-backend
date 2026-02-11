/**
 * Chunk Service
 * Handles text chunking for embeddings
 */
class ChunkService {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1000; // characters per chunk
    this.chunkOverlap = options.chunkOverlap || 200; // overlap between chunks
  }

  /**
   * Split text into chunks
   * @param {string} text - Text to chunk
   * @returns {string[]} - Array of text chunks
   */
  chunkText(text) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      // Get chunk end index
      let endIndex = startIndex + this.chunkSize;

      // If this isn't the last chunk, try to find a good breaking point
      if (endIndex < text.length) {
        // Look for sentence ending near the chunk boundary
        const searchStart = Math.max(startIndex, endIndex - 100);
        const searchText = text.substring(searchStart, endIndex + 100);
        
        // Try to find period, exclamation, or question mark followed by space
        const sentenceEnd = searchText.search(/[.!?]\s/);
        
        if (sentenceEnd !== -1) {
          endIndex = searchStart + sentenceEnd + 1;
        } else {
          // Fallback to word boundary
          const lastSpace = text.lastIndexOf(' ', endIndex);
          if (lastSpace > startIndex) {
            endIndex = lastSpace;
          }
        }
      } else {
        endIndex = text.length;
      }

      // Extract chunk
      const chunk = text.substring(startIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Move to next chunk with overlap
      startIndex = endIndex - this.chunkOverlap;
      
      // Ensure we make progress
      if (startIndex <= chunks[chunks.length - 1]?.length) {
        startIndex = endIndex;
      }
    }

    return chunks;
  }

  /**
   * Split text into semantic chunks (by paragraphs)
   * @param {string} text - Text to chunk
   * @returns {string[]} - Array of text chunks
   */
  chunkByParagraphs(text) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Split by double newlines (paragraphs)
    const paragraphs = text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const chunks = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed chunk size
      if (currentChunk.length + paragraph.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get chunk metadata
   * @param {string[]} chunks - Array of chunks
   * @returns {Object} - Chunk statistics
   */
  getChunkMetadata(chunks) {
    if (!chunks || chunks.length === 0) {
      return {
        totalChunks: 0,
        avgChunkSize: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
      };
    }

    const sizes = chunks.map(c => c.length);
    
    return {
      totalChunks: chunks.length,
      avgChunkSize: Math.round(sizes.reduce((a, b) => a + b, 0) / chunks.length),
      minChunkSize: Math.min(...sizes),
      maxChunkSize: Math.max(...sizes),
    };
  }
}

// Export singleton instance with default settings
const chunkService = new ChunkService();
export default chunkService;
export { ChunkService };
