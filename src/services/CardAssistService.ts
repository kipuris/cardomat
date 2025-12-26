import { LocationService, Coordinates, StoreLocation } from './LocationService';
import { StoreLocationRepository } from '../repositories/StoreLocationRepository';
import { LoyaltyCardRepository } from '../repositories/LoyaltyCardRepository';
import { LoyaltyCardResponse } from '../models/LoyaltyCard';
import pool from '../config/database';

export interface CardSuggestion {
  card: LoyaltyCardResponse;
  store: StoreLocation;
  distance: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  priority: number;
}

export interface AssistContext {
  userLocation: Coordinates;
  userId: number;
  timestamp: Date;
  previousSuggestions?: CardSuggestion[];
  userPreferences?: UserLocationPreferences;
}

export interface UserLocationPreferences {
  enableLocationServices: boolean;
  enablePushNotifications: boolean;
  enableLockScreenDisplay: boolean;
  maxDistanceKm: number;
  preferredStoreChains: string[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  lastUpdated: Date;
}

export interface LocationAnalytics {
  mostVisitedStores: Array<{
    store: StoreLocation;
    visitCount: number;
    lastVisit: Date;
  }>;
  preferredTimes: Array<{
    hour: number;
    visitCount: number;
  }>;
  averageSessionDuration: number;
  totalLocations: number;
}

export class CardAssistService {
  private locationService: LocationService;
  private storeRepository: StoreLocationRepository;
  private cardRepository: LoyaltyCardRepository;

  constructor() {
    this.locationService = new LocationService();
    this.storeRepository = new StoreLocationRepository();
    this.cardRepository = new LoyaltyCardRepository();
  }

  /**
   * Get card suggestions based on user location
   */
  async getCardSuggestions(context: AssistContext): Promise<CardSuggestion[]> {
    try {
      // Validate location
      if (!this.locationService.validateCoordinates(context.userLocation)) {
        throw new Error('Invalid coordinates provided');
      }

      // Get user preferences
      const preferences = context.userPreferences || await this.getUserPreferences(context.userId);
      
      if (!preferences.enableLocationServices) {
        return [];
      }

      // Check quiet hours
      if (this.isQuietHours(preferences.quietHours)) {
        return [];
      }

      // Find nearby stores
      const nearbyStores = await this.storeRepository.findNearby(
        context.userLocation,
        preferences.maxDistanceKm || 2,
        20
      );

      if (nearbyStores.length === 0) {
        return [];
      }

      // Get user's loyalty cards
      const userCards = await this.cardRepository.findByUserId(context.userId);

      if (userCards.length === 0) {
        return [];
      }

      // Match cards to nearby stores
      const suggestions = this.matchCardsToStores(
        userCards,
        nearbyStores,
        context.userLocation,
        preferences
      );

      // Apply machine learning insights
      const enhancedSuggestions = await this.enhanceWithUserBehavior(
        suggestions,
        context.userId
      );

      // Sort by priority and confidence
      return enhancedSuggestions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3); // Limit to top 3 suggestions

    } catch (error) {
      console.error('Error getting card suggestions:', error);
      return [];
    }
  }

  /**
   * Match user cards to nearby stores
   */
  private matchCardsToStores(
    cards: LoyaltyCardResponse[],
    stores: StoreLocation[],
    userLocation: Coordinates,
    preferences: UserLocationPreferences
  ): CardSuggestion[] {
    const suggestions: CardSuggestion[] = [];

    for (const card of cards) {
      for (const store of stores) {
        // Check if card matches store
        const matchScore = this.calculateStoreMatch(card, store);
        
        if (matchScore > 0.3) { // Minimum match threshold
          const distance = this.locationService.calculateDistance(
            userLocation,
            { latitude: store.latitude, longitude: store.longitude }
          );

          // Apply preference filters
          if (preferences.preferredStoreChains.length > 0) {
            if (!preferences.preferredStoreChains.includes(store.store_chain || '')) {
              continue;
            }
          }

          const confidence = this.calculateConfidence(matchScore, distance, store.geofence_radius);
          const priority = this.calculatePriority(card, store, distance, matchScore);

          suggestions.push({
            card,
            store,
            distance,
            confidence,
            reason: this.generateReason(matchScore, distance),
            priority
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Calculate how well a card matches a store
   */
  private calculateStoreMatch(card: LoyaltyCardResponse, store: StoreLocation): number {
    let score = 0;

    // Exact store name match
    if (card.store_name.toLowerCase() === store.store_name.toLowerCase()) {
      score += 1.0;
    }
    // Partial store name match
    else if (card.store_name.toLowerCase().includes(store.store_name.toLowerCase()) ||
             store.store_name.toLowerCase().includes(card.store_name.toLowerCase())) {
      score += 0.8;
    }

    // Chain match
    if (store.store_chain && 
        card.store_name.toLowerCase().includes(store.store_chain.toLowerCase())) {
      score += 0.6;
    }

    // Fuzzy matching for common variations
    const fuzzyScore = this.calculateFuzzyMatch(card.store_name, store.store_name);
    score = Math.max(score, fuzzyScore);

    return Math.min(score, 1.0);
  }

  /**
   * Simple fuzzy matching for store names
   */
  private calculateFuzzyMatch(name1: string, name2: string): number {
    const n1 = name1.toLowerCase().replace(/[^\w]/g, '');
    const n2 = name2.toLowerCase().replace(/[^\w]/g, '');
    
    if (n1 === n2) return 1.0;
    if (n1.includes(n2) || n2.includes(n1)) return 0.7;
    
    // Simple character overlap
    const chars1 = new Set(n1);
    const chars2 = new Set(n2);
    const intersection = new Set([...chars1].filter(x => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate confidence level for suggestion
   */
  private calculateConfidence(
    matchScore: number,
    distance: number,
    geofenceRadius: number
  ): 'high' | 'medium' | 'low' {
    const locationScore = Math.max(0, 1 - (distance / geofenceRadius));
    const overallScore = (matchScore + locationScore) / 2;

    if (overallScore >= 0.8) return 'high';
    if (overallScore >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Calculate priority score for suggestion
   */
  private calculatePriority(
    card: LoyaltyCardResponse,
    store: StoreLocation,
    distance: number,
    matchScore: number
  ): number {
    let priority = matchScore * 100;

    // Closer stores get higher priority
    priority += Math.max(0, 100 - distance);

    // Favorite cards get bonus
    if (card.is_favorite) {
      priority += 50;
    }

    // Recently used cards get bonus (would need usage tracking)
    // priority += recentUsageBonus;

    return Math.round(priority);
  }

  /**
   * Generate human-readable reason for suggestion
   */
  private generateReason(matchScore: number, distance: number): string {
    const distanceText = this.locationService.formatDistance(distance);
    
    if (matchScore >= 0.9) {
      return `Exact match - You're ${distanceText} from this store`;
    } else if (matchScore >= 0.7) {
      return `Close match - You're ${distanceText} away`;
    } else {
      return `Possible match - ${distanceText} from here`;
    }
  }

  /**
   * Enhance suggestions with user behavior patterns
   */
  private async enhanceWithUserBehavior(
    suggestions: CardSuggestion[],
    userId: number
  ): Promise<CardSuggestion[]> {
    try {
      // Get user's location history and card usage patterns
      const analytics = await this.getUserLocationAnalytics(userId);
      
      return suggestions.map(suggestion => {
        // Boost priority for frequently visited stores
        const visitedStore = analytics.mostVisitedStores.find(
          vs => vs.store.id === suggestion.store.id
        );
        
        if (visitedStore) {
          suggestion.priority += visitedStore.visitCount * 10;
          suggestion.reason += ` (visited ${visitedStore.visitCount} times)`;
        }

        // Boost priority based on time patterns
        const currentHour = new Date().getHours();
        const timePattern = analytics.preferredTimes.find(pt => pt.hour === currentHour);
        
        if (timePattern) {
          suggestion.priority += timePattern.visitCount * 5;
        }

        return suggestion;
      });
    } catch (error) {
      console.error('Error enhancing with user behavior:', error);
      return suggestions;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(quietHours: UserLocationPreferences['quietHours']): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 100 + startMin;
    const endTime = endHour * 100 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Get user location preferences
   */
  async getUserPreferences(userId: number): Promise<UserLocationPreferences> {
    try {
      const result = await pool.query(
        'SELECT location_preferences FROM user_preferences WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return this.getDefaultPreferences();
      }

      return result.rows[0].location_preferences || this.getDefaultPreferences();
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Update user location preferences
   */
  async updateUserPreferences(
    userId: number,
    preferences: Partial<UserLocationPreferences>
  ): Promise<UserLocationPreferences> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const currentPreferences = await this.getUserPreferences(userId);
      const updatedPreferences = {
        ...currentPreferences,
        ...preferences,
        lastUpdated: new Date()
      };

      await client.query(
        `INSERT INTO user_preferences (user_id, location_preferences) 
         VALUES ($1, $2) 
         ON CONFLICT (user_id) 
         DO UPDATE SET location_preferences = $2, updated_at = NOW()`,
        [userId, JSON.stringify(updatedPreferences)]
      );

      await client.query('COMMIT');
      return updatedPreferences;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating user preferences:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserLocationPreferences {
    return {
      enableLocationServices: false,
      enablePushNotifications: false,
      enableLockScreenDisplay: false,
      maxDistanceKm: 2,
      preferredStoreChains: [],
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      lastUpdated: new Date()
    };
  }

  /**
   * Get user location analytics
   */
  private async getUserLocationAnalytics(userId: number): Promise<LocationAnalytics> {
    try {
      // This would analyze card_usage_logs and location data
      // For now, return empty analytics
      return {
        mostVisitedStores: [],
        preferredTimes: [],
        averageSessionDuration: 0,
        totalLocations: 0
      };
    } catch (error) {
      console.error('Error getting location analytics:', error);
      return {
        mostVisitedStores: [],
        preferredTimes: [],
        averageSessionDuration: 0,
        totalLocations: 0
      };
    }
  }
}