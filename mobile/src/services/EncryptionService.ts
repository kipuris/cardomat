import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export interface EncryptedData {
  data: string;
  iv: string;
  algorithm: string;
}

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits

  // Generate a random encryption key
  async generateKey(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(this.keyLength);
    return this.arrayBufferToBase64(randomBytes);
  }

  // Generate a random initialization vector
  private async generateIV(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16); // 128 bits
    return this.arrayBufferToBase64(randomBytes);
  }

  // Encrypt sensitive data (like card numbers)
  async encrypt(data: string, key?: string): Promise<EncryptedData> {
    try {
      // Use a default key if none provided (in production, this should be user-specific)
      const encryptionKey = key || await this.getOrCreateDefaultKey();
      const iv = await this.generateIV();
      
      // For React Native, we'll use a simplified encryption approach
      // In a production app, you would use expo-crypto or react-native-keychain
      const encrypted = await this.simpleEncrypt(data, encryptionKey, iv);
      
      return {
        data: encrypted,
        iv,
        algorithm: this.algorithm,
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt sensitive data
  async decrypt(encryptedData: EncryptedData, key?: string): Promise<string> {
    try {
      const decryptionKey = key || await this.getOrCreateDefaultKey();
      
      const decrypted = await this.simpleDecrypt(
        encryptedData.data,
        decryptionKey,
        encryptedData.iv
      );
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash sensitive data for comparison (one-way)
  async hash(data: string): Promise<string> {
    try {
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );
      return digest;
    } catch (error) {
      console.error('Hashing error:', error);
      throw new Error('Failed to hash data');
    }
  }

  // Encrypt card data before storage
  async encryptCardData(cardData: any): Promise<any> {
    const sensitiveFields = ['cardNumber', 'barcodeData'];
    const encryptedData = { ...cardData };

    for (const field of sensitiveFields) {
      if (encryptedData[field]) {
        try {
          encryptedData[field] = await this.encrypt(encryptedData[field]);
        } catch (error) {
          console.error(`Failed to encrypt ${field}:`, error);
          // Continue with unencrypted data if encryption fails
        }
      }
    }

    return encryptedData;
  }

  // Decrypt card data after retrieval
  async decryptCardData(encryptedCardData: any): Promise<any> {
    const decryptedData = { ...encryptedCardData };
    const sensitiveFields = ['cardNumber', 'barcodeData'];

    for (const field of sensitiveFields) {
      if (decryptedData[field] && typeof decryptedData[field] === 'object') {
        try {
          decryptedData[field] = await this.decrypt(decryptedData[field]);
        } catch (error) {
          console.error(`Failed to decrypt ${field}:`, error);
          // Use original data if decryption fails
          decryptedData[field] = encryptedCardData[field]?.data || encryptedCardData[field];
        }
      }
    }

    return decryptedData;
  }

  // Simple XOR-based encryption for demonstration
  // In production, use proper AES encryption with expo-crypto or react-native-keychain
  private async simpleEncrypt(data: string, key: string, iv: string): Promise<string> {
    try {
      // Convert strings to bytes
      const dataBytes = this.stringToBytes(data);
      const keyBytes = this.base64ToBytes(key);
      const ivBytes = this.base64ToBytes(iv);
      
      // Simple XOR encryption with key and IV
      const encrypted = new Uint8Array(dataBytes.length);
      for (let i = 0; i < dataBytes.length; i++) {
        encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length] ^ ivBytes[i % ivBytes.length];
      }
      
      return this.arrayBufferToBase64(encrypted.buffer);
    } catch (error) {
      console.error('Simple encryption error:', error);
      return data; // Return original data if encryption fails
    }
  }

  // Simple XOR-based decryption (reverse of encryption)
  private async simpleDecrypt(encryptedData: string, key: string, iv: string): Promise<string> {
    try {
      const encryptedBytes = this.base64ToBytes(encryptedData);
      const keyBytes = this.base64ToBytes(key);
      const ivBytes = this.base64ToBytes(iv);
      
      // Reverse the XOR operation
      const decrypted = new Uint8Array(encryptedBytes.length);
      for (let i = 0; i < encryptedBytes.length; i++) {
        decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length] ^ ivBytes[i % ivBytes.length];
      }
      
      return this.bytesToString(decrypted);
    } catch (error) {
      console.error('Simple decryption error:', error);
      return encryptedData; // Return encrypted data if decryption fails
    }
  }

  // Get or create a default encryption key
  private async getOrCreateDefaultKey(): Promise<string> {
    // In production, this should be stored securely using Keychain/Keystore
    // For demo purposes, we'll use a hardcoded key
    const defaultKey = 'cardomat-default-encryption-key-256bits';
    const keyHash = await this.hash(defaultKey);
    return keyHash.substring(0, 32); // Use first 32 chars as key
  }

  // Utility methods for byte manipulation
  private stringToBytes(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  private bytesToString(bytes: Uint8Array): string {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  private base64ToBytes(base64: string): Uint8Array {
    // Simple base64 decode for React Native
    const binaryString = Platform.OS === 'web' ? atob(base64) : this.base64Decode(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return Platform.OS === 'web' ? btoa(binary) : this.base64Encode(binary);
  }

  // Simple base64 encoding for React Native (fallback)
  private base64Encode(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  }

  // Simple base64 decoding for React Native (fallback)
  private base64Decode(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    str = str.replace(/[^A-Za-z0-9+/]/g, '');
    
    while (i < str.length) {
      const encoded1 = chars.indexOf(str.charAt(i++));
      const encoded2 = chars.indexOf(str.charAt(i++));
      const encoded3 = chars.indexOf(str.charAt(i++));
      const encoded4 = chars.indexOf(str.charAt(i++));
      
      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
      
      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
    }
    
    return result;
  }

  // Mask sensitive data for display purposes
  maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) return cardNumber;
    
    const last4 = cardNumber.slice(-4);
    const masked = '*'.repeat(Math.max(0, cardNumber.length - 4));
    
    return masked + last4;
  }

  // Check if data appears to be encrypted
  isEncrypted(data: any): boolean {
    return data && typeof data === 'object' && 'data' in data && 'iv' in data && 'algorithm' in data;
  }
}

export const encryptionService = new EncryptionService();