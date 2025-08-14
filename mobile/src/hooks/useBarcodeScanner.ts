import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useCards } from './useCards';
import { LoyaltyCard } from '../types/card';
import { ocrService, ExtractedCardInfo } from '../services/OCRService';

export const useBarcodeScanner = () => {
  const { addCard } = useCards();

  const processScannedData = useCallback(async (data: string, type: string) => {
    try {
      // Parse the scanned data and extract card information
      const cardInfo = await parseScannedData(data, type);
      
      // Create a new loyalty card
      const cardData: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'> = {
        name: cardInfo.name || 'Scanned Card',
        store: cardInfo.store || 'Unknown Store',
        cardNumber: cardInfo.cardNumber || data,
        barcodeType: mapBarcodeType(type),
        barcodeData: data,
        color: getRandomCardColor(),
        category: cardInfo.category || 'Other',
        isFavorite: false,
      };

      return await addCard(cardData);
    } catch (error) {
      throw new Error('Failed to process scanned card data');
    }
  }, [addCard]);

  const processImageWithOCR = useCallback(async (imageUri: string) => {
    try {
      // Extract card information using OCR
      const extractedInfo = await ocrService.extractCardInfo(imageUri);
      
      // Validate extracted information
      const validation = ocrService.validateExtractedInfo(extractedInfo);
      if (!validation.isValid) {
        throw new Error(`OCR validation failed: ${validation.errors.join(', ')}`);
      }

      // Create card data from extracted information
      const cardData: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'> = {
        name: extractedInfo.cardName || `${extractedInfo.storeName} Card` || 'Scanned Card',
        store: extractedInfo.storeName || 'Unknown Store',
        cardNumber: extractedInfo.cardNumber || extractedInfo.memberNumber || 'Unknown',
        barcodeType: 'CODE128', // Default barcode type for OCR scanned cards
        barcodeData: extractedInfo.cardNumber || extractedInfo.memberNumber || 'Unknown',
        color: getRandomCardColor(),
        category: getCategoryFromStore(extractedInfo.storeName),
        isFavorite: false,
      };

      return await addCard(cardData);
    } catch (error) {
      throw new Error('Failed to process card image with OCR');
    }
  }, [addCard]);

  const scanFromGallery = useCallback(async () => {
    try {
      // Request gallery permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Gallery permission is required to scan cards from photos');
      }

      // Pick image from gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: false,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      // Process the selected image with OCR
      return await processImageWithOCR(result.assets[0].uri);
    } catch (error) {
      throw new Error('Failed to scan card from gallery');
    }
  }, [processImageWithOCR]);

  const captureAndScan = useCallback(async () => {
    try {
      // Request camera permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Camera permission is required to capture cards');
      }

      // Capture image with camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
        base64: false,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      // Process the captured image with OCR
      return await processImageWithOCR(result.assets[0].uri);
    } catch (error) {
      throw new Error('Failed to capture and scan card');
    }
  }, [processImageWithOCR]);

  const parseScannedData = async (data: string, type: string) => {
    // This is a simplified parser - in a real app, you would have more sophisticated
    // parsing logic based on known loyalty card formats
    return {
      name: 'Loyalty Card',
      store: extractStoreFromData(data),
      cardNumber: data,
      category: 'Retail',
    };
  };

  const extractStoreFromData = (data: string) => {
    // Simple store detection based on known patterns
    // In a real app, you'd have a database of store patterns
    if (data.includes('STAR')) return 'Starbucks';
    if (data.includes('WAL')) return 'Walmart';
    if (data.includes('CVS')) return 'CVS';
    if (data.includes('TARG')) return 'Target';
    
    return 'Unknown Store';
  };

  const mapBarcodeType = (scannerType: string): LoyaltyCard['barcodeType'] => {
    switch (scannerType) {
      case '256': return 'QR_CODE';
      case '32': return 'EAN13';
      case '128': return 'CODE128';
      case '16': return 'CODE39';
      case '64': return 'UPC_A';
      default: return 'CODE128';
    }
  };

  const getCategoryFromStore = (storeName?: string) => {
    if (!storeName) return 'Other';
    
    const storeCategories: Record<string, string> = {
      'Starbucks': 'Coffee',
      'Dunkin\'': 'Coffee',
      'Walmart': 'Retail',
      'Target': 'Retail',
      'CVS Pharmacy': 'Pharmacy',
      'Walgreens': 'Pharmacy',
      'Kroger': 'Grocery',
      'Safeway': 'Grocery',
      'Costco': 'Retail',
      'Home Depot': 'Home Improvement',
      'Lowe\'s': 'Home Improvement',
      'Best Buy': 'Electronics',
      'Shell': 'Gas Station',
      'ExxonMobil': 'Gas Station',
      'Chevron': 'Gas Station',
      'BP': 'Gas Station',
      'McDonald\'s': 'Restaurant',
      'Subway': 'Restaurant',
    };
    
    return storeCategories[storeName] || 'Retail';
  };

  const getRandomCardColor = () => {
    const colors = [
      '#007AFF', '#34C759', '#FF3B30', '#FF9500',
      '#5856D6', '#AF52DE', '#FF2D92', '#A2845E',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const validateBarcodeData = useCallback((data: string, type: string) => {
    if (!data || data.length === 0) {
      return false;
    }

    // Basic validation - in a real app you'd have more comprehensive validation
    switch (type) {
      case '256': // QR Code
        return data.length > 0;
      case '32': // EAN13
        return data.length === 13 && /^\d+$/.test(data);
      case '128': // Code128
        return data.length > 0;
      default:
        return true;
    }
  }, []);

  return {
    processScannedData,
    processImageWithOCR,
    scanFromGallery,
    captureAndScan,
    validateBarcodeData,
  };
};