import { LoyaltyCard } from '../models/LoyaltyCard';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedData?: CardValidationData;
}

export interface CardValidationData {
  cardName: string;
  storeName: string;
  cardNumber: string;
  barcodeType: string;
  barcodeData: string;
  cardColor: string;
  notes?: string;
}

export interface StoreChainInfo {
  chain: string;
  commonFormats: string[];
  cardNumberPattern?: RegExp;
  barcodePattern?: RegExp;
  defaultColor: string;
  aliases: string[];
}

export class CardDataValidator {
  
  private storeChains: Map<string, StoreChainInfo> = new Map();

  constructor() {
    this.initializeStoreChains();
  }

  /**
   * Validate and normalize loyalty card data
   */
  validateCard(cardData: Partial<CardValidationData>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required field validation
    if (!cardData.cardName || cardData.cardName.trim().length === 0) {
      errors.push('Card name is required');
    }
    
    if (!cardData.storeName || cardData.storeName.trim().length === 0) {
      errors.push('Store name is required');
    }
    
    if (!cardData.cardNumber || cardData.cardNumber.trim().length === 0) {
      errors.push('Card number is required');
    }
    
    if (!cardData.barcodeType || cardData.barcodeType.trim().length === 0) {
      errors.push('Barcode type is required');
    }
    
    if (!cardData.barcodeData || cardData.barcodeData.trim().length === 0) {
      errors.push('Barcode data is required');
    }

    // Early return if required fields are missing
    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Normalize and validate individual fields
    const normalizedData: CardValidationData = {
      cardName: this.normalizeCardName(cardData.cardName!),
      storeName: this.normalizeStoreName(cardData.storeName!),
      cardNumber: this.normalizeCardNumber(cardData.cardNumber!),
      barcodeType: this.normalizeBarcodeType(cardData.barcodeType!),
      barcodeData: this.normalizeBarcodeData(cardData.barcodeData!),
      cardColor: cardData.cardColor || '#2196F3',
      notes: cardData.notes || ''
    };

    // Validate barcode type
    const barcodeValidation = this.validateBarcodeType(normalizedData.barcodeType);
    if (!barcodeValidation.isValid) {
      errors.push(...barcodeValidation.errors);
    }

    // Validate barcode data format
    const barcodeDataValidation = this.validateBarcodeData(
      normalizedData.barcodeData, 
      normalizedData.barcodeType
    );
    if (!barcodeDataValidation.isValid) {
      errors.push(...barcodeDataValidation.errors);
    }

    // Validate card color
    const colorValidation = this.validateCardColor(normalizedData.cardColor);
    if (!colorValidation.isValid) {
      errors.push(...colorValidation.errors);
    }

    // Store-specific validation
    const storeValidation = this.validateForStore(normalizedData);
    warnings.push(...storeValidation.warnings);
    if (!storeValidation.isValid) {
      warnings.push(...storeValidation.errors);
    }

    // Apply store-specific improvements
    const improvedData = this.applyStoreImprovements(normalizedData);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedData: improvedData
    };
  }

  /**
   * Validate barcode type
   */
  private validateBarcodeType(barcodeType: string): ValidationResult {
    const validTypes = ['code128', 'code39', 'qr', 'ean13', 'ean8', 'upc', 'upca', 'upce', 'pdf417'];
    
    if (!validTypes.includes(barcodeType.toLowerCase())) {
      return {
        isValid: false,
        errors: [`Invalid barcode type: ${barcodeType}. Supported types: ${validTypes.join(', ')}`],
        warnings: []
      };
    }
    
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Validate barcode data format
   */
  private validateBarcodeData(data: string, type: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    switch (type.toLowerCase()) {
      case 'ean13':
        if (!/^\d{13}$/.test(data)) {
          errors.push('EAN13 barcode must be exactly 13 digits');
        }
        break;
      
      case 'ean8':
        if (!/^\d{8}$/.test(data)) {
          errors.push('EAN8 barcode must be exactly 8 digits');
        }
        break;
      
      case 'upc':
      case 'upca':
        if (!/^\d{12}$/.test(data)) {
          errors.push('UPC-A barcode must be exactly 12 digits');
        }
        break;
      
      case 'upce':
        if (!/^\d{8}$/.test(data)) {
          errors.push('UPC-E barcode must be exactly 8 digits');
        }
        break;
      
      case 'code39':
        if (!/^[0-9A-Z\-\.\s\$\/\+%]+$/.test(data)) {
          errors.push('Code 39 supports only uppercase letters, digits, and special characters');
        }
        break;
      
      case 'code128':
        if (data.length === 0) {
          errors.push('Code 128 barcode data cannot be empty');
        }
        if (data.length > 80) {
          warnings.push('Code 128 barcode data is quite long, may affect scanning');
        }
        break;
      
      case 'qr':
        if (data.length > 4296) {
          errors.push('QR code data exceeds maximum length of 4296 characters');
        }
        break;
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate card color format
   */
  private validateCardColor(color: string): ValidationResult {
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return {
        isValid: false,
        errors: ['Card color must be a valid hex color (e.g., #FF0000)'],
        warnings: []
      };
    }
    
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Validate card data against store-specific requirements
   */
  private validateForStore(cardData: CardValidationData): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    const storeInfo = this.findStoreChain(cardData.storeName);
    
    if (storeInfo) {
      // Check if barcode type is commonly used for this store
      if (!storeInfo.commonFormats.includes(cardData.barcodeType)) {
        warnings.push(`${cardData.barcodeType} is not commonly used for ${storeInfo.chain}. Common formats: ${storeInfo.commonFormats.join(', ')}`);
      }
      
      // Validate card number pattern if available
      if (storeInfo.cardNumberPattern && !storeInfo.cardNumberPattern.test(cardData.cardNumber)) {
        warnings.push(`Card number format doesn't match typical ${storeInfo.chain} pattern`);
      }
      
      // Validate barcode data pattern if available
      if (storeInfo.barcodePattern && !storeInfo.barcodePattern.test(cardData.barcodeData)) {
        warnings.push(`Barcode data format doesn't match typical ${storeInfo.chain} pattern`);
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Apply store-specific improvements to card data
   */
  private applyStoreImprovements(cardData: CardValidationData): CardValidationData {
    const storeInfo = this.findStoreChain(cardData.storeName);
    
    if (storeInfo) {
      // Use store's default color if generic color is being used
      if (cardData.cardColor === '#2196F3') {
        cardData.cardColor = storeInfo.defaultColor;
      }
      
      // Normalize store name to official name
      cardData.storeName = storeInfo.chain;
    }
    
    return cardData;
  }

  /**
   * Normalize card name
   */
  private normalizeCardName(cardName: string): string {
    return cardName.trim().replace(/\s+/g, ' ');
  }

  /**
   * Normalize store name
   */
  private normalizeStoreName(storeName: string): string {
    const normalized = storeName.trim().replace(/\s+/g, ' ');
    
    // Try to find matching store chain
    const storeInfo = this.findStoreChain(normalized);
    return storeInfo ? storeInfo.chain : normalized;
  }

  /**
   * Normalize card number
   */
  private normalizeCardNumber(cardNumber: string): string {
    return cardNumber.trim().replace(/[\s\-]/g, '');
  }

  /**
   * Normalize barcode type
   */
  private normalizeBarcodeType(barcodeType: string): string {
    const normalized = barcodeType.toLowerCase().trim();
    
    // Handle common variations
    const variations: { [key: string]: string } = {
      'qrcode': 'qr',
      'upc': 'upca',
      'code-128': 'code128',
      'code-39': 'code39'
    };
    
    return variations[normalized] || normalized;
  }

  /**
   * Normalize barcode data
   */
  private normalizeBarcodeData(barcodeData: string): string {
    return barcodeData.trim();
  }

  /**
   * Find store chain info by name
   */
  private findStoreChain(storeName: string): StoreChainInfo | null {
    const searchName = storeName.toLowerCase().trim();
    
    for (const [, storeInfo] of this.storeChains) {
      if (storeInfo.chain.toLowerCase() === searchName || 
          storeInfo.aliases.some(alias => alias.toLowerCase() === searchName)) {
        return storeInfo;
      }
    }
    
    return null;
  }

  /**
   * Initialize known store chains and their characteristics
   */
  private initializeStoreChains(): void {
    this.storeChains.set('starbucks', {
      chain: 'Starbucks',
      commonFormats: ['code128', 'qr'],
      cardNumberPattern: /^\d{16}$/,
      defaultColor: '#00704A',
      aliases: ['starbucks coffee', 'sbux']
    });
    
    this.storeChains.set('target', {
      chain: 'Target',
      commonFormats: ['code39', 'code128'],
      cardNumberPattern: /^\d{10,16}$/,
      defaultColor: '#CC0000',
      aliases: ['target stores']
    });
    
    this.storeChains.set('walmart', {
      chain: 'Walmart',
      commonFormats: ['code128', 'ean13'],
      defaultColor: '#0071CE',
      aliases: ['wal-mart', 'walmart stores']
    });
    
    this.storeChains.set('costco', {
      chain: 'Costco',
      commonFormats: ['code128', 'code39'],
      cardNumberPattern: /^\d{11,16}$/,
      defaultColor: '#E31837',
      aliases: ['costco wholesale']
    });
    
    this.storeChains.set('cvs', {
      chain: 'CVS Pharmacy',
      commonFormats: ['code39', 'code128'],
      cardNumberPattern: /^\d{10,13}$/,
      defaultColor: '#CC0000',
      aliases: ['cvs pharmacy', 'cvs health']
    });
    
    this.storeChains.set('walgreens', {
      chain: 'Walgreens',
      commonFormats: ['code39', 'code128'],
      cardNumberPattern: /^\d{10,16}$/,
      defaultColor: '#E31837',
      aliases: ['walgreens pharmacy']
    });
    
    this.storeChains.set('kroger', {
      chain: 'Kroger',
      commonFormats: ['code128', 'ean13'],
      defaultColor: '#004C91',
      aliases: ['kroger stores']
    });
    
    this.storeChains.set('safeway', {
      chain: 'Safeway',
      commonFormats: ['code128', 'code39'],
      defaultColor: '#E31837',
      aliases: ['safeway stores']
    });
  }

  /**
   * Get all supported store chains
   */
  getSupportedStoreChains(): string[] {
    return Array.from(this.storeChains.values()).map(info => info.chain);
  }

  /**
   * Get store chain information
   */
  getStoreChainInfo(storeName: string): StoreChainInfo | null {
    return this.findStoreChain(storeName);
  }
}