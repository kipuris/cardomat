import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useCards } from '../hooks/useCards';
import { LoyaltyCard } from '../types/card';

const CARD_COLORS = [
  '#007AFF', '#34C759', '#FF3B30', '#FF9500',
  '#5856D6', '#AF52DE', '#FF2D92', '#A2845E',
];

const CARD_CATEGORIES = [
  'Retail', 'Grocery', 'Restaurant', 'Gas Station',
  'Pharmacy', 'Coffee', 'Clothing', 'Electronics',
];

export const AddCardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { addCard } = useCards();
  
  const [cardName, setCardName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [selectedCategory, setSelectedCategory] = useState(CARD_CATEGORIES[0]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveCard = async () => {
    if (!cardName.trim() || !storeName.trim() || !cardNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const newCard: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'> = {
        name: cardName.trim(),
        store: storeName.trim(),
        cardNumber: cardNumber.trim(),
        barcodeType: 'CODE128',
        barcodeData: cardNumber.trim(),
        color: selectedColor,
        category: selectedCategory,
        isFavorite: false,
        notes: notes.trim() || undefined,
      };

      await addCard(newCard);
      Alert.alert('Success', 'Card added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderColorPicker = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Card Color</Text>
      <View style={styles.colorGrid}>
        {CARD_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              selectedColor === color && styles.selectedColor,
            ]}
            onPress={() => setSelectedColor(color)}
          >
            {selectedColor === color && (
              <Ionicons name="checkmark" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCategoryPicker = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Category</Text>
      <View style={styles.categoryGrid}>
        {CARD_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryOption,
              selectedCategory === category && styles.selectedCategory,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category && styles.selectedCategoryText,
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPreview = () => (
    <View style={styles.previewSection}>
      <Text style={styles.sectionTitle}>Preview</Text>
      <View style={[styles.cardPreview, { backgroundColor: selectedColor }]}>
        <Text style={styles.previewCardName}>
          {cardName || 'Card Name'}
        </Text>
        <Text style={styles.previewStoreName}>
          {storeName || 'Store Name'}
        </Text>
        <View style={styles.previewCardNumber}>
          <Text style={styles.previewCardNumberText}>
            {cardNumber || '1234567890'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {renderPreview()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card Name *</Text>
            <TextInput
              style={styles.textInput}
              value={cardName}
              onChangeText={setCardName}
              placeholder="e.g., Rewards Card"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Store Name *</Text>
            <TextInput
              style={styles.textInput}
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g., Starbucks"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card Number *</Text>
            <TextInput
              style={styles.textInput}
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="Enter card number"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
        </View>

        {renderColorPicker()}
        {renderCategoryPicker()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes about this card..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.scanButton}>
            <Ionicons name="scan" size={20} color="#007AFF" />
            <Text style={styles.scanButtonText}>Scan Instead</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.disabledButton]}
            onPress={handleSaveCard}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Card'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  previewSection: {
    margin: 20,
  },
  cardPreview: {
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  previewCardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  previewStoreName: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 15,
  },
  previewCardNumber: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewCardNumberText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
    minHeight: 80,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryOption: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    minWidth: '30%',
    alignItems: 'center',
  },
  selectedCategory: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  scanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  scanButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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