import fs from 'fs/promises';
import pdfParse from 'pdf-parse';

/**
 * PDF Service
 * Handles PDF file parsing and text extraction
 */
class PDFService {
  /**
   * Extract text from PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<string>} - Extracted text
   */
  async extractText(filePath) {
    try {
      console.log('📄 Starting PDF extraction:', filePath);
      
      const dataBuffer = await fs.readFile(filePath);
      console.log('  ✅ File read, size:', dataBuffer.length, 'bytes');
      
      const pdfData = await pdfParse(dataBuffer);
      
      // ✅ ADD DETAILED DEBUG LOGS
      console.log('📊 PDF Extraction Results:');
      console.log('  - Pages:', pdfData.numpages);
      console.log('  - Text length:', pdfData.text.length, 'characters');
      console.log('  - Word count:', pdfData.text.split(/\s+/).filter(w => w.length > 0).length);
      console.log('  - First 300 chars:', pdfData.text.substring(0, 300));
      console.log('  - Has content:', pdfData.text.trim().length > 0);

      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('No text content found in PDF');
      }

      return pdfData.text;
    } catch (error) {
      console.error('PDF extraction error:', error.message);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Get PDF metadata
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<Object>} - PDF metadata
   */
  async getMetadata(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);

      return {
        pages: pdfData.numpages,
        info: pdfData.info,
        metadata: pdfData.metadata,
        version: pdfData.version,
      };
    } catch (error) {
      console.error('PDF metadata error:', error.message);
      throw new Error(`Failed to get PDF metadata: ${error.message}`);
    }
  }

  /**
   * Validate PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<boolean>} - True if valid PDF
   */
  async validatePDF(filePath) {
    try {
      await this.extractText(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const pdfService = new PDFService();
export default pdfService;