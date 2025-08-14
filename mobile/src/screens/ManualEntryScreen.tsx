import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useCards } from '../hooks/useCards';
import { LoyaltyCard } from '../types/card';

const BARCODE_TYPES: LoyaltyCard['barcodeType'][] = [
  'CODE128', 'CODE39', 'QR_CODE', 'EAN13', 'UPC_A'
];

const CARD_COLORS = [
  '#007AFF', '#34C759', '#FF3B30', '#FF9500',
  '#5856D6', '#AF52DE', '#FF2D92', '#A2845E',
];

const CARD_CATEGORIES = [
  'Retail', 'Grocery', 'Restaurant', 'Gas Station',
  'Pharmacy', 'Coffee', 'Clothing', 'Electronics',
];

export const ManualEntryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { addCard } = useCards();
  
  const [formData, setFormData] = useState({
    name: '',
    store: '',
    cardNumber: '',
    barcodeData: '',
    barcodeType: 'CODE128' as LoyaltyCard['barcodeType'],
    color: CARD_COLORS[0],
    category: CARD_CATEGORIES[0],
    notes: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Card name is required';
    }
    
    if (!formData.store.trim()) {
      newErrors.store = 'Store name is required';
    }
    
    if (!formData.cardNumber.trim()) {
      newErrors.cardNumber = 'Card number is required';
    }
    
    if (!formData.barcodeData.trim()) {
      newErrors.barcodeData = 'Barcode data is required';
    }
    
    // Validate barcode data format based on type
    if (formData.barcodeData.trim()) {
      const isValid = validateBarcodeFormat(formData.barcodeData, formData.barcodeType);
      if (!isValid) {
        newErrors.barcodeData = `Invalid format for ${formData.barcodeType}`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBarcodeFormat = (data: string, type: LoyaltyCard['barcodeType']) => {
    switch (type) {
      case 'EAN13':
        return /^\d{13}$/.test(data);
      case 'UPC_A':
        return /^\d{12}$/.test(data);
      case 'CODE39':
        return /^[A-Z0-9\-. $\/+%]+$/.test(data);
      case 'CODE128':
        return data.length > 0; // More flexible validation
      case 'QR_CODE':
        return data.length > 0; // QR codes can contain any data
      default:
        return true;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again');
      return;
    }

    setIsLoading(true);
    try {
      const cardData: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        store: formData.store.trim(),
        cardNumber: formData.cardNumber.trim(),
        barcodeType: formData.barcodeType,
        barcodeData: formData.barcodeData.trim(),
        color: formData.color,
        category: formData.category,
        isFavorite: false,
        notes: formData.notes.trim() || undefined,
      };

      await addCard(cardData);
      Alert.alert('Success', 'Card added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderInput = (
    label: string,
    field: keyof typeof formData,
    options?: {
      placeholder?: string;
      keyboardType?: any;
      multiline?: boolean;
      numberOfLines?: number;
    }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label} *</Text>
      <TextInput
        style={[
          styles.textInput,
          options?.multiline && styles.textArea,
          errors[field] && styles.inputError
        ]}
        value={formData[field]}
        onChangeText={(value) => updateFormData(field, value)}
        placeholder={options?.placeholder}
        placeholderTextColor="#999"
        keyboardType={options?.keyboardType}
        multiline={options?.multiline}
        numberOfLines={options?.numberOfLines}
        textAlignVertical={options?.multiline ? 'top' : 'center'}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderPicker = (
    label: string,
    field: keyof typeof formData,
    options: string[]
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.pickerContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.pickerOption,
                formData[field] === option && styles.selectedPickerOption,
              ]}
              onPress={() => updateFormData(field, option)}
            >
              <Text style={[
                styles.pickerOptionText,
                formData[field] === option && styles.selectedPickerOptionText,
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderColorPicker = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Card Color</Text>
      <View style={styles.colorGrid}>
        {CARD_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              formData.color === color && styles.selectedColor,
            ]}
            onPress={() => updateFormData('color', color)}
          >
            {formData.color === color && (
              <Ionicons name="checkmark" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const generateSampleBarcode = () => {
    const sampleData = {
      'CODE128': '123456789012',
      'CODE39': 'SAMPLE123',
      'QR_CODE': 'SAMPLE_QR_CODE',
      'EAN13': '1234567890123',
      'UPC_A': '123456789012',
    };
    
    updateFormData('barcodeData', sampleData[formData.barcodeType]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Card Manually</Text>
            <Text style={styles.subtitle}>
              Enter your loyalty card details below
            </Text>
          </View>

          <View style={styles.form}>
            {renderInput('Card Name', 'name', { placeholder: 'e.g., Rewards Card' })}
            {renderInput('Store Name', 'store', { placeholder: 'e.g., Starbucks' })}
            {renderInput('Card Number', 'cardNumber', { 
              placeholder: 'Enter card number',
              keyboardType: 'numeric'
            })}

            <View style={styles.barcodeSection}>
              <Text style={styles.sectionTitle}>Barcode Information</Text>
              
              {renderPicker('Barcode Type', 'barcodeType', BARCODE_TYPES)}
              
              <View style={styles.barcodeInputRow}>
                {renderInput('Barcode Data', 'barcodeData', { 
                  placeholder: 'Enter barcode data' 
                })}
                <TouchableOpacity 
                  style={styles.generateButton}
                  onPress={generateSampleBarcode}
                >
                  <Ionicons name="refresh" size={16} color="#007AFF" />
                  <Text style={styles.generateButtonText}>Sample</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.helperText}>
                The barcode data is usually found below the barcode on your card
              </Text>
            </View>

            {renderColorPicker()}
            {renderPicker('Category', 'category', CARD_CATEGORIES)}
            
            {renderInput('Notes (Optional)', 'notes', { 
              placeholder: 'Additional notes...',
              multiline: true,
              numberOfLines: 3
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.disabledButton]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Card'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  barcodeSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  barcodeInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 20,
  },
  generateButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 5,
  },
  pickerOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  selectedPickerOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedPickerOptionText: {
    color: '#fff',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});