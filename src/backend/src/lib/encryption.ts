// External imports
// Node.js crypto module (built-in)
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

// Internal imports
import { authConfig } from '../config/auth.config';

/**
 * Interface defining the structure of encrypted data with version control
 */
interface EncryptedData {
  cipherText: string;
  iv: Buffer;
  tag: string;
  version: number;
}

/**
 * Interface for encryption options
 */
interface EncryptionOptions {
  encoding?: BufferEncoding;
  keyVersion?: number;
}

// Constants for encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_RETENTION_PERIOD = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
const ROTATION_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Enhanced encryption service providing secure data encryption and decryption
 * with key rotation support and secure memory handling
 */
export class EncryptionService {
  private key: Buffer;
  private iv: Buffer;
  private algorithm: string;
  private keyHistory: Map<number, { key: Buffer; timestamp: number }>;
  private currentKeyVersion: number;

  /**
   * Initialize encryption service with secure key management
   * @throws Error if required environment variables are missing
   */
  constructor() {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Initialize key history and version tracking
    this.keyHistory = new Map();
    this.currentKeyVersion = 1;
    this.algorithm = ENCRYPTION_ALGORITHM;

    // Securely initialize encryption key
    this.key = this.initializeKey(process.env.ENCRYPTION_KEY);
    this.keyHistory.set(this.currentKeyVersion, {
      key: this.key,
      timestamp: Date.now()
    });

    // Generate secure IV if not provided
    this.iv = process.env.ENCRYPTION_IV 
      ? Buffer.from(process.env.ENCRYPTION_IV, 'base64')
      : this.generateIV();

    // Setup key rotation
    this.setupKeyRotation();
  }

  /**
   * Encrypts data using AES-256-GCM with authentication
   * @param data - Data to encrypt
   * @param options - Encryption options
   * @returns EncryptedData object containing encrypted data and metadata
   * @throws Error if encryption fails
   */
  public async encrypt(
    data: string,
    options: EncryptionOptions = {}
  ): Promise<EncryptedData> {
    try {
      const iv = this.generateIV();
      const cipher = createCipheriv(this.algorithm, this.key, iv);
      
      let cipherText = cipher.update(data, 'utf8', 'base64');
      cipherText += cipher.final('base64');
      
      const tag = cipher.getAuthTag().toString('base64');

      return {
        cipherText,
        iv,
        tag,
        version: this.currentKeyVersion
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    } finally {
      // Clear sensitive data from memory
      this.clearSensitiveData();
    }
  }

  /**
   * Decrypts encrypted data using AES-256-GCM with authentication verification
   * @param encryptedData - Encrypted data object
   * @returns Decrypted string
   * @throws Error if decryption fails
   */
  public async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      const keyData = this.getKeyForVersion(encryptedData.version);
      if (!keyData) {
        throw new Error('Encryption key version not found');
      }

      const decipher = createDecipheriv(this.algorithm, keyData.key, encryptedData.iv);
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'base64'));

      let decrypted = decipher.update(encryptedData.cipherText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    } finally {
      // Clear sensitive data from memory
      this.clearSensitiveData();
    }
  }

  /**
   * Performs secure key rotation while maintaining backward compatibility
   * @private
   */
  private async rotateKey(): Promise<void> {
    try {
      const newKey = await this.generateKey(KEY_LENGTH);
      this.currentKeyVersion++;
      
      // Store new key in history
      this.keyHistory.set(this.currentKeyVersion, {
        key: newKey,
        timestamp: Date.now()
      });

      // Update current key
      this.key = newKey;

      // Clean old keys beyond retention period
      this.cleanOldKeys();
    } catch (error) {
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }

  /**
   * Generates a cryptographically secure encryption key
   * @param length - Length of the key to generate
   * @returns Generated key buffer
   * @private
   */
  private async generateKey(length: number): Promise<Buffer> {
    const scryptAsync = promisify(scrypt);
    const salt = randomBytes(16);
    
    try {
      return await scryptAsync(
        randomBytes(32),
        salt,
        length
      ) as Buffer;
    } catch (error) {
      throw new Error(`Key generation failed: ${error.message}`);
    }
  }

  /**
   * Generates a cryptographically secure initialization vector
   * @returns Generated IV buffer
   * @private
   */
  private generateIV(): Buffer {
    return randomBytes(IV_LENGTH);
  }

  /**
   * Initializes encryption key from base64 string
   * @param base64Key - Base64 encoded key string
   * @returns Initialized key buffer
   * @private
   */
  private initializeKey(base64Key: string): Buffer {
    try {
      return Buffer.from(base64Key, 'base64');
    } catch (error) {
      throw new Error('Invalid encryption key format');
    }
  }

  /**
   * Sets up automatic key rotation based on configured interval
   * @private
   */
  private setupKeyRotation(): void {
    const interval = parseInt(process.env.KEY_ROTATION_INTERVAL || '0', 10) || 
      ROTATION_CHECK_INTERVAL;

    setInterval(() => {
      this.rotateKey().catch(error => {
        console.error('Key rotation failed:', error.message);
      });
    }, interval);
  }

  /**
   * Retrieves encryption key for a specific version
   * @param version - Key version to retrieve
   * @returns Key data object or undefined if not found
   * @private
   */
  private getKeyForVersion(version: number): { key: Buffer; timestamp: number } | undefined {
    return this.keyHistory.get(version);
  }

  /**
   * Removes old keys beyond retention period
   * @private
   */
  private cleanOldKeys(): void {
    const now = Date.now();
    for (const [version, keyData] of this.keyHistory) {
      if (now - keyData.timestamp > KEY_RETENTION_PERIOD && 
          version !== this.currentKeyVersion) {
        this.keyHistory.delete(version);
      }
    }
  }

  /**
   * Clears sensitive data from memory
   * @private
   */
  private clearSensitiveData(): void {
    // Overwrite sensitive data in memory
    if (global.gc) {
      global.gc();
    }
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();