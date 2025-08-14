import { CardDataValidator } from '../../services/CardDataValidator';

describe('CardDataValidator', () => {
  let validator: CardDataValidator;

  beforeEach(() => {
    validator = new CardDataValidator();
  });

  describe('Basic Validation', () => {
    test('should validate complete card data', () => {
      const cardData = {
        cardName: 'Starbucks Rewards',
        storeName: 'Starbucks',
        cardNumber: '1234567890123456',
        barcodeType: 'code128',
        barcodeData: 'ABC123456',
        cardColor: '#00704A'
      };

      const result = validator.validateCard(cardData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedData).toBeDefined();
    });

    test('should reject missing required fields', () => {
      const cardData = {
        cardName: '',
        storeName: 'Starbucks',
        cardNumber: '123',
        barcodeType: 'code128',
        barcodeData: 'ABC123'
      };

      const result = validator.validateCard(cardData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Card name is required');
    });

    test('should validate barcode types', () => {
      const cardData = {
        cardName: 'Test Card',
        storeName: 'Test Store',
        cardNumber: '123',
        barcodeType: 'invalid_type',
        barcodeData: 'ABC123'
      };

      const result = validator.validateCard(cardData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid barcode type');
    });

    test('should validate card colors', () => {
      const cardData = {
        cardName: 'Test Card',
        storeName: 'Test Store',
        cardNumber: '123',
        barcodeType: 'code128',
        barcodeData: 'ABC123',
        cardColor: 'invalid-color'
      };

      const result = validator.validateCard(cardData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('valid hex color');
    });
  });

  describe('Format-Specific Validation', () => {
    test('should validate EAN13 format', () => {
      const cardData = {
        cardName: 'Test Card',
        storeName: 'Test Store',
        cardNumber: '123',
        barcodeType: 'ean13',
        barcodeData: '123' // Invalid: not 13 digits
      };

      const result = validator.validateCard(cardData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('EAN13 barcode must be exactly 13 digits');
    });

    test('should validate UPC format', () => {
      const validCardData = {
        cardName: 'Test Card',
        storeName: 'Test Store',
        cardNumber: '123',
        barcodeType: 'upc',
        barcodeData: '123456789012'
      };

      const result = validator.validateCard(validCardData);
      
      expect(result.isValid).toBe(true);
    });

    test('should validate Code39 format', () => {
      const invalidCardData = {
        cardName: 'Test Card',
        storeName: 'Test Store',
        cardNumber: '123',
        barcodeType: 'code39',
        barcodeData: 'abc123' // Invalid: lowercase not allowed
      };

      const result = validator.validateCard(invalidCardData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Code 39 supports only uppercase letters');
    });
  });

  describe('Store Chain Support', () => {
    test('should recognize known store chains', () => {
      const stores = validator.getSupportedStoreChains();
      
      expect(stores).toContain('Starbucks');
      expect(stores).toContain('Target');
      expect(stores).toContain('Walmart');
    });

    test('should provide store chain information', () => {
      const info = validator.getStoreChainInfo('Starbucks');
      
      expect(info).toBeDefined();
      expect(info?.chain).toBe('Starbucks');
      expect(info?.defaultColor).toBe('#00704A');
      expect(info?.commonFormats).toContain('code128');
    });

    test('should normalize store names', () => {
      const cardData = {
        cardName: 'Rewards Card',
        storeName: 'starbucks', // lowercase
        cardNumber: '123',
        barcodeType: 'code128',
        barcodeData: 'ABC123'
      };

      const result = validator.validateCard(cardData);
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedData?.storeName).toBe('Starbucks');
    });
  });

  describe('Data Normalization', () => {
    test('should normalize card numbers', () => {
      const cardData = {
        cardName: 'Test Card',
        storeName: 'Test Store',
        cardNumber: '1234 - 5678',  // With spaces and dashes
        barcodeType: 'code128',
        barcodeData: 'ABC123'
      };

      const result = validator.validateCard(cardData);
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedData?.cardNumber).toBe('12345678');
    });

    test('should apply store improvements', () => {
      const cardData = {
        cardName: 'Rewards Card',
        storeName: 'Starbucks',
        cardNumber: '123',
        barcodeType: 'code128',
        barcodeData: 'ABC123',
        cardColor: '#2196F3' // Generic blue
      };

      const result = validator.validateCard(cardData);
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedData?.cardColor).toBe('#00704A'); // Starbucks green
    });
  });
});