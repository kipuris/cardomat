import express from 'express';
import multer from 'multer';
import { BarcodeScanner } from '../services/BarcodeScanner';
import { BarcodeGenerator } from '../services/BarcodeGenerator';
import { CardDataValidator } from '../services/CardDataValidator';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();
const scanner = new BarcodeScanner();
const generator = new BarcodeGenerator();
const validator = new CardDataValidator();

// Configure multer for image upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  }
});

// Validation schemas
const generateBarcodeSchema = Joi.object({
  data: Joi.string().min(1).max(4296).required(),
  format: Joi.string().valid('qr', 'code128', 'code39', 'ean13', 'ean8', 'upc', 'upca', 'upce', 'pdf417').required(),
  width: Joi.number().integer().min(50).max(1000).optional(),
  height: Joi.number().integer().min(50).max(500).optional(),
  displayValue: Joi.boolean().optional(),
  background: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  lineColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  margin: Joi.number().integer().min(0).max(50).optional(),
  fontSize: Joi.number().integer().min(8).max(24).optional()
});

const validateCardSchema = Joi.object({
  cardName: Joi.string().min(1).max(255).required(),
  storeName: Joi.string().min(1).max(255).required(),
  cardNumber: Joi.string().min(1).max(100).required(),
  barcodeType: Joi.string().valid('qr', 'code128', 'code39', 'ean13', 'ean8', 'upc', 'upca', 'upce', 'pdf417').required(),
  barcodeData: Joi.string().min(1).max(4296).required(),
  cardColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional()
});

const scanBase64Schema = Joi.object({
  image: Joi.string().required(),
  includeMetadata: Joi.boolean().optional()
});

// Apply authentication to all routes
router.use(authenticateToken);

// Scan barcode from uploaded image
router.post('/scan/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Validate image
    const isValidImage = await scanner.validateImage(req.file.buffer);
    if (!isValidImage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or corrupted image file'
      });
    }

    // Scan barcode
    const scanResult = await scanner.scanFromBuffer(req.file.buffer);

    if (scanResult.success) {
      res.json({
        success: true,
        message: 'Barcode detected successfully',
        data: {
          barcodeData: scanResult.data,
          format: scanResult.format,
          confidence: 'high', // In a real implementation, this would be calculated
          metadata: {
            imageSize: req.file.size,
            imageMimeType: req.file.mimetype
          }
        }
      });
    } else {
      res.status(422).json({
        success: false,
        message: scanResult.error || 'No barcode detected in image',
        data: {
          supportedFormats: ['QR Code', 'Code 128', 'Code 39', 'EAN-13', 'UPC-A'],
          tips: [
            'Ensure the barcode is clearly visible and in focus',
            'Try better lighting conditions',
            'Make sure the entire barcode is within the image frame'
          ]
        }
      });
    }

  } catch (error) {
    console.error('Barcode scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Barcode scanning failed',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Scan barcode from base64 image
router.post('/scan/base64', validateRequest(scanBase64Schema), async (req, res) => {
  try {
    const { image, includeMetadata } = req.body;

    // Scan barcode
    const scanResult = await scanner.scanFromBase64(image);

    if (scanResult.success) {
      const response: any = {
        success: true,
        message: 'Barcode detected successfully',
        data: {
          barcodeData: scanResult.data,
          format: scanResult.format,
          confidence: 'high'
        }
      };

      if (includeMetadata) {
        response.data.metadata = {
          scanMethod: 'base64',
          timestamp: new Date().toISOString()
        };
      }

      res.json(response);
    } else {
      res.status(422).json({
        success: false,
        message: scanResult.error || 'No barcode detected in image'
      });
    }

  } catch (error) {
    console.error('Base64 barcode scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Barcode scanning failed',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Generate barcode
router.post('/generate', validateRequest(generateBarcodeSchema), async (req, res) => {
  try {
    const { data, format, width, height, displayValue, background, lineColor, margin, fontSize } = req.body;

    const options = {
      width,
      height,
      displayValue,
      background,
      lineColor,
      margin,
      fontSize
    };

    const result = await generator.generateBarcode(data, format, options);

    if (result.success && result.data) {
      // Return as base64 for API response
      const base64Result = await generator.generateBarcodeBase64(data, format, options);
      
      res.json({
        success: true,
        message: 'Barcode generated successfully',
        data: {
          format: result.format,
          dimensions: result.dimensions,
          base64: base64Result.data,
          size: result.data.length
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Barcode generation failed'
      });
    }

  } catch (error) {
    console.error('Barcode generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Barcode generation failed',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Validate card data
router.post('/validate', validateRequest(validateCardSchema), async (req, res) => {
  try {
    const cardData = req.body;
    
    const validationResult = validator.validateCard(cardData);

    res.json({
      success: true,
      message: 'Card data validation completed',
      data: {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        normalizedData: validationResult.normalizedData,
        suggestions: validationResult.isValid ? [] : [
          'Check that all required fields are provided',
          'Ensure barcode format matches the data',
          'Verify card number format for the specific store'
        ]
      }
    });

  } catch (error) {
    console.error('Card validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Card validation failed',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Get supported barcode formats
router.get('/formats', (req, res) => {
  try {
    const formats = generator.getSupportedFormats();
    const formatDetails = formats.map(format => generator.getFormatRequirements(format));

    res.json({
      success: true,
      data: {
        formats: formatDetails,
        scanningSupported: scanner.getSupportedFormats(),
        generationSupported: formats
      }
    });

  } catch (error) {
    console.error('Get formats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve format information'
    });
  }
});

// Get supported store chains
router.get('/stores', (req, res) => {
  try {
    const stores = validator.getSupportedStoreChains();
    
    const storeDetails = stores.map(storeName => {
      const info = validator.getStoreChainInfo(storeName);
      return info ? {
        name: info.chain,
        commonFormats: info.commonFormats,
        defaultColor: info.defaultColor,
        aliases: info.aliases
      } : { name: storeName };
    });

    res.json({
      success: true,
      data: {
        supportedStores: storeDetails,
        totalCount: stores.length
      }
    });

  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve store information'
    });
  }
});

// Process and suggest card data from scan
router.post('/process-scan', async (req, res) => {
  try {
    const { barcodeData, format, storeName } = req.body;

    if (!barcodeData || !format) {
      return res.status(400).json({
        success: false,
        message: 'Barcode data and format are required'
      });
    }

    // Create suggested card data
    const suggestedCard = {
      cardName: storeName ? `${storeName} Loyalty Card` : 'Loyalty Card',
      storeName: storeName || 'Unknown Store',
      cardNumber: barcodeData.length <= 20 ? barcodeData : barcodeData.substring(0, 20),
      barcodeType: format,
      barcodeData: barcodeData
    };

    // Validate the suggested data
    const validation = validator.validateCard(suggestedCard);

    res.json({
      success: true,
      message: 'Scan processed successfully',
      data: {
        suggestedCard: validation.normalizedData || suggestedCard,
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings
        },
        confidence: barcodeData && format ? 'high' : 'medium'
      }
    });

  } catch (error) {
    console.error('Process scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process scan data',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

export default router;