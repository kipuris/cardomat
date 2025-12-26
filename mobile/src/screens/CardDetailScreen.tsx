import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';

import { barcodeService } from '../services/BarcodeService';

import { RootStackParamList } from '../types/navigation';
import { useCards } from '../hooks/useCards';

type CardDetailScreenRouteProp = RouteProp<RootStackParamList, 'CardDetail'>;

const { width } = Dimensions.get('window');

export const CardDetailScreen: React.FC = () => {
  const route = useRoute<CardDetailScreenRouteProp>();
  const { card } = route.params;
  const { toggleFavorite, deleteCard } = useCards();

  const renderBarcodePreview = () => {
    const isValidBarcode = barcodeService.validateBarcodeData(card.barcodeData, card.barcodeType);
    
    return (
      <View style={styles.barcodeContainer}>
        <Text style={styles.barcodeLabel}>Barcode</Text>
        <View style={styles.barcodePreview}>
          {isValidBarcode ? (
            barcodeService.generateCardBarcode(card, width - 80)
          ) : (
            <View style={styles.invalidBarcodeContainer}>
              <Ionicons name="alert-circle" size={24} color="#FF3B30" />
              <Text style={styles.invalidBarcodeText}>Invalid Barcode Data</Text>
            </View>
          )}
        </View>
        <Text style={styles.barcodeData}>{card.barcodeData}</Text>
        <Text style={styles.barcodeType}>{card.barcodeType}</Text>
        {!isValidBarcode && (
          <Text style={styles.validationError}>
            This barcode data is not valid for {card.barcodeType} format
          </Text>
        )}
      </View>
    );
  };

  const renderCardInfo = () => (
    <View style={styles.infoSection}>
      <Text style={styles.sectionTitle}>Card Information</Text>
      
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Card Number</Text>
        <Text style={styles.infoValue}>{card.cardNumber}</Text>
      </View>
      
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Category</Text>
        <Text style={styles.infoValue}>{card.category}</Text>
      </View>
      
      <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Date Added</Text>
        <Text style={styles.infoValue}>
          {card.createdAt.toLocaleDateString()}
        </Text>
      </View>
      
      {card.points && (
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Points Balance</Text>
          <Text style={styles.infoValue}>{card.points.toLocaleString()}</Text>
        </View>
      )}
      
      {card.notes && (
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Notes</Text>
          <Text style={styles.infoValue}>{card.notes}</Text>
        </View>
      )}
    </View>
  );

  const renderActions = () => (
    <View style={styles.actionsSection}>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => toggleFavorite(card.id)}
      >
        <Ionicons
          name={card.isFavorite ? 'star' : 'star-outline'}
          size={24}
          color="#FFD700"
        />
        <Text style={styles.actionButtonText}>
          {card.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton}>
        <Ionicons name="share" size={24} color="#007AFF" />
        <Text style={styles.actionButtonText}>Share Card</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton}>
        <Ionicons name="create" size={24} color="#34C759" />
        <Text style={styles.actionButtonText}>Edit Card</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => deleteCard(card.id)}
      >
        <Ionicons name="trash" size={24} color="#FF3B30" />
        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
          Delete Card
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.cardHeader, { backgroundColor: card.color }]}>
          <Text style={styles.cardName}>{card.name}</Text>
          <Text style={styles.storeName}>{card.store}</Text>
          {card.isFavorite && (
            <Ionicons name="star" size={24} color="#FFD700" style={styles.favoriteIcon} />
          )}
        </View>

        {renderBarcodePreview()}
        {renderCardInfo()}
        {renderActions()}
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
  cardHeader: {
    padding: 30,
    alignItems: 'center',
    position: 'relative',
  },
  cardName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  storeName: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
  favoriteIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  barcodeContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  barcodeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  barcodePreview: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  barcodeData: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#333',
    marginTop: 10,
  },
  barcodeType: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  actionsSection: {
    margin: 20,
    marginTop: 0,
  },
  actionButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  deleteButton: {
    borderColor: '#FF3B30',
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
  invalidBarcodeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  invalidBarcodeText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 8,
  },
  validationError: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
});