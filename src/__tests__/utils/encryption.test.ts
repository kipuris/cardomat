import { encrypt, decrypt, hashPassword, comparePassword } from '../../utils/encryption';

describe('Encryption Utils', () => {
  describe('encrypt/decrypt', () => {
    test('should encrypt and decrypt text correctly', () => {
      const originalText = 'sensitive-card-number-123456';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(originalText);
      expect(encrypted).toContain(':'); // Should contain IV separator
      expect(decrypted).toBe(originalText);
    });

    test('should handle empty strings', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt('');

      expect(encrypted).toBe('');
      expect(decrypted).toBe('');
    });

    test('should throw error for invalid encrypted data', () => {
      expect(() => {
        decrypt('invalid-encrypted-data');
      }).toThrow('Failed to decrypt data');
    });
  });

  describe('password hashing', () => {
    test('should hash password correctly', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    test('should verify password correctly', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(password, hash);
      const isInvalid = await comparePassword('wrongPassword', hash);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });
});