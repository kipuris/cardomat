import { BarcodeGenerator } from '../../services/BarcodeGenerator';

describe('BarcodeGenerator', () => {
  let generator: BarcodeGenerator;

  beforeEach(() => {
    generator = new BarcodeGenerator();
  });

  describe('QR Code Generation', () => {
    test('should generate QR code successfully', async () => {
      const result = await generator.generateQRCode('Hello World');
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('qr');
      expect(result.data).toBeDefined();
      expect(result.dimensions).toBeDefined();
    });

    test('should handle empty data', async () => {
      const result = await generator.generateQRCode('');
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('qr');
    });
  });

  describe('Linear Barcode Generation', () => {
    test('should generate Code 128 barcode', async () => {
      const result = await generator.generateLinearBarcode('ABC123', 'code128');
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('code128');
      expect(result.data).toBeDefined();
    });

    test('should validate EAN13 format', async () => {
      const result = await generator.generateLinearBarcode('123', 'ean13');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('EAN13 requires exactly 13 digits');
    });

    test('should validate UPC format', async () => {
      const result = await generator.generateLinearBarcode('123456789012', 'upc');
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('upc');
    });
  });

  describe('Format Support', () => {
    test('should return supported formats', () => {
      const formats = generator.getSupportedFormats();
      
      expect(formats).toContain('qr');
      expect(formats).toContain('code128');
      expect(formats).toContain('code39');
      expect(formats).toContain('ean13');
    });

    test('should return format requirements', () => {
      const requirements = generator.getFormatRequirements('ean13');
      
      expect(requirements.name).toBe('EAN-13');
      expect(requirements.dataPattern).toBe('Exactly 13 digits');
      expect(requirements.example).toBe('1234567890123');
    });
  });

  describe('Base64 Generation', () => {
    test('should generate base64 QR code', async () => {
      const result = await generator.generateBarcodeBase64('Test', 'qr');
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('data:image/png;base64,');
    });
  });
});