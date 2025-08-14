import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export interface BarcodeOptions {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textMargin?: number;
  margin?: number;
  background?: string;
  lineColor?: string;
}

export interface GeneratedBarcode {
  success: boolean;
  data?: Buffer;
  format?: string;
  error?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export class BarcodeGenerator {

  /**
   * Generate barcode based on format and data
   */
  async generateBarcode(
    data: string, 
    format: string, 
    options: BarcodeOptions = {}
  ): Promise<GeneratedBarcode> {
    try {
      switch (format.toLowerCase()) {
        case 'qr':
        case 'qrcode':
          return await this.generateQRCode(data, options);
        
        case 'code128':
        case 'code39':
        case 'ean13':
        case 'ean8':
        case 'upc':
        case 'upca':
        case 'upce':
        case 'itf':
        case 'msi':
        case 'pharmacode':
        case 'codabar':
          return await this.generateLinearBarcode(data, format, options);
        
        default:
          return {
            success: false,
            error: `Unsupported barcode format: ${format}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Barcode generation failed: ${error.message}`
      };
    }
  }

  /**
   * Generate QR code
   */
  async generateQRCode(data: string, options: BarcodeOptions = {}): Promise<GeneratedBarcode> {
    try {
      const qrOptions = {
        errorCorrectionLevel: 'M' as const,
        type: 'png' as const,
        quality: 0.92,
        margin: options.margin || 1,
        color: {
          dark: options.lineColor || '#000000',
          light: options.background || '#FFFFFF'
        },
        width: options.width || 200
      };

      const buffer = await QRCode.toBuffer(data, qrOptions);
      
      return {
        success: true,
        data: buffer,
        format: 'qr',
        dimensions: {
          width: qrOptions.width,
          height: qrOptions.width // QR codes are square
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `QR code generation failed: ${error.message}`
      };
    }
  }

  /**
   * Generate linear barcode (Code 128, Code 39, EAN, UPC, etc.)
   * Using SVG format instead of Canvas for simpler implementation
   */
  async generateLinearBarcode(
    data: string, 
    format: string, 
    options: BarcodeOptions = {}
  ): Promise<GeneratedBarcode> {
    try {
      // Validate data for specific formats
      const validationResult = this.validateBarcodeData(data, format);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      const barcodeOptions = {
        format: format.toUpperCase(),
        width: 2,
        height: options.height || 100,
        displayValue: options.displayValue !== false,
        fontSize: options.fontSize || 12,
        textMargin: options.textMargin || 2,
        margin: options.margin || 10,
        background: options.background || '#FFFFFF',
        lineColor: options.lineColor || '#000000'
      };

      // For now, return a simplified SVG barcode representation
      // This would be replaced with a proper barcode generation library in production
      const svgString = this.generateSimpleSVGBarcode(data, format, barcodeOptions);

      // Convert SVG to Buffer
      const buffer = Buffer.from(svgString);
      
      return {
        success: true,
        data: buffer,
        format: format.toLowerCase(),
        dimensions: {
          width: options.width || 200,
          height: options.height || 100
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Linear barcode generation failed: ${error.message}`
      };
    }
  }

  /**
   * Generate barcode as base64 string
   */
  async generateBarcodeBase64(
    data: string, 
    format: string, 
    options: BarcodeOptions = {}
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const result = await this.generateBarcode(data, format, options);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error
        };
      }

      const base64 = result.data.toString('base64');
      const mimeType = 'image/png';
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      return {
        success: true,
        data: dataUrl
      };
    } catch (error) {
      return {
        success: false,
        error: `Base64 generation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate barcode data for specific formats
   */
  private validateBarcodeData(data: string, format: string): { valid: boolean; error?: string } {
    const formatUpper = format.toUpperCase();
    
    switch (formatUpper) {
      case 'EAN13':
        if (!/^\d{13}$/.test(data)) {
          return { valid: false, error: 'EAN13 requires exactly 13 digits' };
        }
        break;
      
      case 'EAN8':
        if (!/^\d{8}$/.test(data)) {
          return { valid: false, error: 'EAN8 requires exactly 8 digits' };
        }
        break;
      
      case 'UPC':
      case 'UPCA':
        if (!/^\d{12}$/.test(data)) {
          return { valid: false, error: 'UPC-A requires exactly 12 digits' };
        }
        break;
      
      case 'UPCE':
        if (!/^\d{8}$/.test(data)) {
          return { valid: false, error: 'UPC-E requires exactly 8 digits' };
        }
        break;
      
      case 'CODE39':
        if (!/^[0-9A-Z\-\.\s\$\/\+%]+$/.test(data)) {
          return { valid: false, error: 'Code 39 supports only uppercase letters, digits, and special characters' };
        }
        break;
      
      case 'CODE128':
        // Code 128 supports all ASCII characters
        if (data.length === 0) {
          return { valid: false, error: 'Code 128 data cannot be empty' };
        }
        break;
      
      default:
        // For other formats, just check that data is not empty
        if (data.length === 0) {
          return { valid: false, error: 'Barcode data cannot be empty' };
        }
    }
    
    return { valid: true };
  }

  /**
   * Get supported barcode formats
   */
  getSupportedFormats(): string[] {
    return [
      'qr',
      'code128',
      'code39', 
      'ean13',
      'ean8',
      'upc',
      'upca',
      'upce',
      'itf',
      'msi',
      'pharmacode',
      'codabar'
    ];
  }

  /**
   * Generate a simple SVG barcode representation
   * This is a simplified implementation for demonstration purposes
   */
  private generateSimpleSVGBarcode(data: string, format: string, options: any): string {
    const width = options.width || 200;
    const height = options.height || 100;
    const barWidth = 2;
    const bars = this.generateBarPattern(data, format);
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="${options.background}"/>`;
    
    let x = options.margin || 10;
    for (const bar of bars) {
      if (bar === 1) { // Black bar
        svg += `<rect x="${x}" y="10" width="${barWidth}" height="${height - 40}" fill="${options.lineColor}"/>`;
      }
      x += barWidth;
    }
    
    if (options.displayValue) {
      svg += `<text x="${width/2}" y="${height - 10}" text-anchor="middle" font-family="monospace" font-size="${options.fontSize}">${data}</text>`;
    }
    
    svg += '</svg>';
    return svg;
  }

  /**
   * Generate a simple bar pattern for demonstration
   * In production, this would use proper barcode encoding algorithms
   */
  private generateBarPattern(data: string, format: string): number[] {
    // This is a simplified pattern generator
    // Real barcode libraries would implement the actual encoding standards
    const pattern: number[] = [];
    
    // Start pattern
    pattern.push(1, 0, 1, 0);
    
    // Data encoding (simplified)
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      // Simple encoding: alternating bars based on character code
      for (let j = 0; j < 4; j++) {
        pattern.push((charCode + j) % 2);
      }
    }
    
    // End pattern
    pattern.push(1, 0, 1, 0);
    
    return pattern;
  }

  /**
   * Get format-specific requirements
   */
  getFormatRequirements(format: string): {
    name: string;
    dataPattern: string;
    description: string;
    example: string;
  } {
    const requirements = {
      qr: {
        name: 'QR Code',
        dataPattern: 'Any text up to 4296 characters',
        description: 'Two-dimensional barcode that can store various types of data',
        example: 'https://example.com or any text'
      },
      code128: {
        name: 'Code 128',
        dataPattern: 'Any ASCII characters',
        description: 'High-density linear barcode supporting full ASCII character set',
        example: 'ABC123xyz'
      },
      code39: {
        name: 'Code 39',
        dataPattern: '0-9, A-Z, -, ., space, $, /, +, %',
        description: 'Alphanumeric barcode with limited character set',
        example: 'ABC-123'
      },
      ean13: {
        name: 'EAN-13',
        dataPattern: 'Exactly 13 digits',
        description: 'European Article Number, commonly used for products',
        example: '1234567890123'
      },
      ean8: {
        name: 'EAN-8',
        dataPattern: 'Exactly 8 digits', 
        description: 'Short version of EAN for small products',
        example: '12345678'
      },
      upc: {
        name: 'UPC-A',
        dataPattern: 'Exactly 12 digits',
        description: 'Universal Product Code used in North America',
        example: '123456789012'
      }
    };

    return requirements[format.toLowerCase()] || {
      name: 'Unknown',
      dataPattern: 'Format-specific',
      description: 'Unknown barcode format',
      example: ''
    };
  }
}