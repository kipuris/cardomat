import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { LoyaltyCard } from '../types/card';
import { barcodeService } from '../services/BarcodeService';
import { encryptionService } from '../services/EncryptionService';

interface CardTemplateProps {
  card: LoyaltyCard;
  onPress?: () => void;
  showBarcode?: boolean;
  compact?: boolean;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');

export const CardTemplate: React.FC<CardTemplateProps> = ({
  card,
  onPress,
  showBarcode = true,
  compact = false,
  style,
}) => {
  const cardWidth = compact ? screenWidth * 0.4 : screenWidth * 0.85;
  const cardHeight = compact ? cardWidth * 0.6 : cardWidth * 0.63;

  const getGradientColors = (baseColor: string) => {
    // Create a gradient effect based on the card color
    const gradients: Record<string, string[]> = {
      '#007AFF': ['#007AFF', '#0056CC'],
      '#34C759': ['#34C759', '#28A745'],
      '#FF3B30': ['#FF3B30', '#DC2626'],
      '#FF9500': ['#FF9500', '#F59E0B'],
      '#5856D6': ['#5856D6', '#4338CA'],
      '#AF52DE': ['#AF52DE', '#9333EA'],
      '#FF2D92': ['#FF2D92', '#EC4899'],
      '#A2845E': ['#A2845E', '#8B7355'],
    };

    return gradients[baseColor] || [baseColor, baseColor];
  };

  const renderCardFront = () => (
    <LinearGradient
      colors={getGradientColors(card.color)}
      style={[styles.cardContainer, { width: cardWidth, height: cardHeight }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={[styles.cardName, compact && styles.compactCardName]}>
            {card.name}
          </Text>
          <Text style={[styles.storeName, compact && styles.compactStoreName]}>
            {card.store}
          </Text>
        </View>
        {card.isFavorite && (
          <Ionicons name="star" size={compact ? 16 : 20} color="#FFD700" />
        )}
      </View>

      {/* Card Body */}
      <View style={styles.cardBody}>
        {!compact && (
          <>
            <View style={styles.cardNumberContainer}>
              <Text style={styles.cardNumberLabel}>Card Number</Text>
              <Text style={styles.cardNumber}>
                {encryptionService.maskCardNumber(card.cardNumber)}
              </Text>
            </View>

            <View style={styles.categoryContainer}>
              <Text style={styles.categoryText}>{card.category}</Text>
            </View>
          </>
        )}

        {/* Barcode section */}
        {showBarcode && !compact && (
          <View style={styles.barcodeSection}>
            <View style={styles.barcodeContainer}>
              {barcodeService.validateBarcodeData(card.barcodeData, card.barcodeType) ? (
                barcodeService.generateCardBarcode(card, cardWidth * 0.8)
              ) : (
                <View style={styles.invalidBarcode}>
                  <Ionicons name="alert-circle" size={16} color="#FFFFFF80" />
                  <Text style={styles.invalidBarcodeText}>Invalid Barcode</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        {!compact && card.points && (
          <View style={styles.pointsContainer}>
            <Ionicons name="star-outline" size={16} color="#FFFFFF80" />
            <Text style={styles.pointsText}>
              {card.points.toLocaleString()} points
            </Text>
          </View>
        )}
        
        {compact && (
          <Text style={styles.compactCategory}>{card.category}</Text>
        )}
      </View>
    </LinearGradient>
  );

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[styles.wrapper, style]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {renderCardFront()}
      {/* Card shadow effect */}
      <View style={[
        styles.cardShadow, 
        { width: cardWidth, height: cardHeight }
      ]} />
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 10,
  },
  cardContainer: {
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: 'relative',
    zIndex: 2,
  },
  cardShadow: {
    position: 'absolute',
    top: 4,
    left: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 16,
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  compactCardName: {
    fontSize: 14,
  },
  storeName: {
    fontSize: 16,
    color: '#FFFFFF90',
  },
  compactStoreName: {
    fontSize: 12,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  cardNumberContainer: {
    marginBottom: 15,
  },
  cardNumberLabel: {
    fontSize: 12,
    color: '#FFFFFF80',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardNumber: {
    fontSize: 18,
    fontFamily: 'monospace',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 15,
  },
  categoryText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  barcodeSection: {
    alignItems: 'center',
    marginTop: 10,
  },
  barcodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 8,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invalidBarcode: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  invalidBarcodeText: {
    fontSize: 10,
    color: '#FFFFFF80',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 12,
    color: '#FFFFFF80',
    marginLeft: 4,
  },
  compactCategory: {
    fontSize: 10,
    color: '#FFFFFF80',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});