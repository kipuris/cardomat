import * as ImageManipulator from 'expo-image-manipulator';

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ExtractedCardInfo {
  cardNumber?: string;
  memberNumber?: string;
  storeName?: string;
  cardName?: string;
  expiryDate?: string;
}

export class OCRService {
  // This is a mock OCR service - in a real app you would use services like:
  // - Google Vision API
  // - AWS Textract
  // - Azure Computer Vision
  // - react-native-text-recognition
  
  async extractTextFromImage(imageUri: string): Promise<OCRResult[]> {
    try {
      // Preprocess the image for better OCR results
      const processedImage = await this.preprocessImage(imageUri);
      
      // Mock OCR results - replace with actual OCR service
      const mockResults: OCRResult[] = [
        {
          text: "REWARDS CARD",
          confidence: 0.95,
          boundingBox: { x: 50, y: 20, width: 200, height: 30 }
        },
        {
          text: "1234567890123456",
          confidence: 0.92,
          boundingBox: { x: 30, y: 150, width: 250, height: 25 }
        },
        {
          text: "STARBUCKS",
          confidence: 0.98,
          boundingBox: { x: 80, y: 80, width: 150, height: 35 }
        }
      ];
      
      return mockResults;
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  async extractCardInfo(imageUri: string): Promise<ExtractedCardInfo> {
    try {
      const ocrResults = await this.extractTextFromImage(imageUri);
      const extractedInfo: ExtractedCardInfo = {};
      
      for (const result of ocrResults) {
        const text = result.text.trim();
        
        // Extract card numbers (look for sequences of 10+ digits)
        const cardNumberMatch = text.match(/\d{10,}/);
        if (cardNumberMatch && !extractedInfo.cardNumber) {
          extractedInfo.cardNumber = cardNumberMatch[0];
        }
        
        // Extract member numbers (look for "Member", "ID", etc.)
        if (text.toUpperCase().includes('MEMBER') || text.toUpperCase().includes('ID')) {
          const memberMatch = text.match(/\d{8,}/);
          if (memberMatch) {
            extractedInfo.memberNumber = memberMatch[0];
          }
        }
        
        // Extract store names (look for common store patterns)
        const storeName = this.identifyStore(text);
        if (storeName && !extractedInfo.storeName) {
          extractedInfo.storeName = storeName;
        }
        
        // Extract card types
        if (text.toUpperCase().includes('REWARDS') || 
            text.toUpperCase().includes('LOYALTY') ||
            text.toUpperCase().includes('CLUB')) {
          extractedInfo.cardName = text;
        }
        
        // Extract expiry dates
        const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{4})/);
        if (dateMatch) {
          extractedInfo.expiryDate = dateMatch[0];
        }
      }
      
      return extractedInfo;
    } catch (error) {
      console.error('Card info extraction failed:', error);
      throw new Error('Failed to extract card information');
    }
  }

  private async preprocessImage(imageUri: string) {
    try {
      // Resize and enhance image for better OCR
      const processedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 800 } }, // Resize to optimal width
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      return processedImage.uri;
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      return imageUri; // Return original if preprocessing fails
    }
  }

  private identifyStore(text: string): string | null {
    const storePatterns = {
      'STARBUCKS': 'Starbucks',
      'WALMART': 'Walmart',
      'TARGET': 'Target',
      'CVS': 'CVS Pharmacy',
      'WALGREENS': 'Walgreens',
      'KROGER': 'Kroger',
      'SAFEWAY': 'Safeway',
      'COSTCO': 'Costco',
      'SAMS': 'Sam\'s Club',
      'HOME DEPOT': 'Home Depot',
      'LOWES': 'Lowe\'s',
      'BEST BUY': 'Best Buy',
      'SHELL': 'Shell',
      'EXXON': 'ExxonMobil',
      'CHEVRON': 'Chevron',
      'BP': 'BP',
      'DUNKIN': 'Dunkin\'',
      'SUBWAY': 'Subway',
      'MCDONALDS': 'McDonald\'s',
    };
    
    const upperText = text.toUpperCase();
    
    for (const [pattern, storeName] of Object.entries(storePatterns)) {
      if (upperText.includes(pattern)) {
        return storeName;
      }
    }
    
    return null;
  }

  // Validate extracted card information
  validateExtractedInfo(info: ExtractedCardInfo): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!info.cardNumber && !info.memberNumber) {
      errors.push('No valid card number found');
    }
    
    if (info.cardNumber && info.cardNumber.length < 8) {
      errors.push('Card number appears to be too short');
    }
    
    if (info.expiryDate) {
      const isValidDate = this.isValidExpiryDate(info.expiryDate);
      if (!isValidDate) {
        errors.push('Invalid expiry date format');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidExpiryDate(dateStr: string): boolean {
    // Check common date formats
    const formats = [
      /^\d{2}\/\d{4}$/, // MM/YYYY
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    ];
    
    return formats.some(format => format.test(dateStr));
  }

  // Clean and format extracted text
  cleanExtractedText(text: string): string {
    return text
      .replace(/[^\w\s\d\/\-]/g, '') // Remove special characters except basic ones
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Generate confidence score for extracted information
  calculateConfidence(info: ExtractedCardInfo, ocrResults: OCRResult[]): number {
    let totalConfidence = 0;
    let count = 0;
    
    // Weight confidence based on what information we found
    if (info.cardNumber) {
      const cardNumberResult = ocrResults.find(r => r.text.includes(info.cardNumber!));
      if (cardNumberResult) {
        totalConfidence += cardNumberResult.confidence * 2; // Card number is most important
        count += 2;
      }
    }
    
    if (info.storeName) {
      const storeResult = ocrResults.find(r => r.text.toUpperCase().includes(info.storeName!.toUpperCase()));
      if (storeResult) {
        totalConfidence += storeResult.confidence;
        count++;
      }
    }
    
    if (info.cardName) {
      const nameResult = ocrResults.find(r => r.text.includes(info.cardName!));
      if (nameResult) {
        totalConfidence += nameResult.confidence;
        count++;
      }
    }
    
    return count > 0 ? totalConfidence / count : 0;
  }
}

export const ocrService = new OCRService();