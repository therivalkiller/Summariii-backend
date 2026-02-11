import crypto from 'crypto';
import config from '../config/env.js';

/**
 * Encryption service for securing sensitive data (API keys)
 * Uses AES-256-GCM encryption
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = this.deriveKey(config.encryption.key);
  }

  /**
   * Derive a 32-byte key from the encryption secret
   */
  deriveKey(secret) {
    return crypto.scryptSync(secret, 'salt', 32);
  }

  /**
   * Encrypt a string value
   * @param {string} text - Plain text to encrypt
   * @returns {string} - Encrypted text with IV and auth tag (format: iv:authTag:encryptedData)
   */
  encrypt(text) {
    if (!text) {
      throw new Error('Cannot encrypt empty value');
    }

    try {
      // Generate random initialization vector
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);

      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Return format: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error.message);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted string
   * @param {string} encryptedText - Encrypted text (format: iv:authTag:encryptedData)
   * @returns {string} - Decrypted plain text
   */
  decrypt(encryptedText) {
    if (!encryptedText) {
      throw new Error('Cannot decrypt empty value');
    }

    try {
      // Split the encrypted text into components
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;

      // Convert from hex
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the text
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash a value (one-way, for verification)
   * @param {string} text - Text to hash
   * @returns {string} - Hashed value
   */
  hash(text) {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  }

  /**
   * Verify a value against a hash
   * @param {string} text - Plain text
   * @param {string} hash - Hash to compare against
   * @returns {boolean} - True if match
   */
  verifyHash(text, hash) {
    return this.hash(text) === hash;
  }
}

// Export singleton instance
const encryptionService = new EncryptionService();
export default encryptionService;
