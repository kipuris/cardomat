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

import { useCards } from '../hooks/useCards';
import { LoyaltyCard } from '../types/card';
import { CardTemplate } from '../components/CardTemplate';
import { SyncStatusBar } from '../components/SyncStatusBar';

const { width } = Dimensions.get('window');

export const DashboardScreen: React.FC = () => {
  const { cards, favoriteCards } = useCards();

  const renderQuickStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Ionicons name="card" size={24} color="#007AFF" />
        <Text style={styles.statNumber}>{cards.length}</Text>
        <Text style={styles.statLabel}>Total Cards</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="star" size={24} color="#FFD700" />
        <Text style={styles.statNumber}>{favoriteCards.length}</Text>
        <Text style={styles.statLabel}>Favorites</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="location" size={24} color="#34C759" />
        <Text style={styles.statNumber}>5</Text>
        <Text style={styles.statLabel}>Nearby</Text>
      </View>
    </View>
  );

  const renderRecentCards = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Cards</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {cards.slice(0, 5).map((card) => (
          <CardTemplate
            key={card.id}
            card={card}
            compact={true}
            showBarcode={false}
            style={styles.compactCard}
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="scan" size={32} color="#007AFF" />
          <Text style={styles.actionText}>Scan Card</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="add-circle" size={32} color="#34C759" />
          <Text style={styles.actionText}>Add Card</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="location" size={32} color="#FF9500" />
          <Text style={styles.actionText}>Find Stores</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.subtitleText}>Manage your loyalty cards</Text>
        </View>

        <SyncStatusBar />

        {renderQuickStats()}
        {renderRecentCards()}
        {renderQuickActions()}
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
  },
  compactCard: {
    marginLeft: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: width / 3 - 30,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});