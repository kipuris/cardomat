import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useCards } from '../hooks/useCards';
import { LoyaltyCard } from '../types/card';
import { RootStackParamList } from '../types/navigation';
import { CardTemplate } from '../components/CardTemplate';

type CardsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export const CardsScreen: React.FC = () => {
  const navigation = useNavigation<CardsScreenNavigationProp>();
  const { cards, searchCards, toggleFavorite } = useCards();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCards, setFilteredCards] = useState(cards);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const results = searchCards(query);
    setFilteredCards(results);
  };

  const handleCardPress = (card: LoyaltyCard) => {
    navigation.navigate('CardDetail', { card });
  };

  const handleAddCard = () => {
    navigation.navigate('AddCard');
  };

  const renderCard = ({ item }: { item: LoyaltyCard }) => (
    <CardTemplate
      card={item}
      onPress={() => handleCardPress(item)}
      showBarcode={false}
      compact={false}
      style={styles.cardWrapper}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="card-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No cards yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Add your first loyalty card to get started
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Card</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cards..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#666"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {filteredCards.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredCards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          style={styles.cardsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardsListContent}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleAddCard}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    padding: 10,
  },
  cardsList: {
    flex: 1,
  },
  cardsListContent: {
    padding: 20,
  },
  cardWrapper: {
    marginBottom: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});