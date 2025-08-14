export interface Offer {
  id: number;
  store_chain: string;
  title: string;
  description?: string;
  offer_type: 'discount' | 'cashback' | 'bogo' | 'points' | 'freebie';
  discount_value?: number;
  minimum_purchase?: number;
  terms_conditions?: string;
  valid_from?: Date;
  valid_until?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserSavedOffer {
  id: number;
  user_id: number;
  offer_id: number;
  is_used: boolean;
  used_at?: Date;
  created_at: Date;
  offer?: Offer;
}

export interface OfferRecommendation {
  offer: Offer;
  score: number;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  expiresSoon: boolean;
  matchedCards: string[];
}

export interface ExternalOfferProvider {
  name: string;
  apiEndpoint: string;
  apiKey: string;
  supportedStores: string[];
  enabled: boolean;
}

export class OffersService {

  /**
   * Get personalized offer recommendations for user
   */
  async getPersonalizedOffers(
    userId: number,
    userCards: string[], // Store names from user's cards
    location?: { latitude: number; longitude: number }
  ): Promise<OfferRecommendation[]> {
    try {
      // Get active offers for stores the user has cards for
      const relevantOffers = await this.getOffersForStores(userCards);
      
      // Score and rank offers
      const recommendations = await this.scoreOffers(relevantOffers, userId, userCards, location);
      
      // Sort by score and return top recommendations
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 20); // Limit to top 20 offers
        
    } catch (error) {
      console.error('Error getting personalized offers:', error);
      return [];
    }
  }

  /**
   * Get offers for specific store chains
   */
  private async getOffersForStores(storeChains: string[]): Promise<Offer[]> {
    // This would typically query the database
    // For now, return sample offers
    const sampleOffers: Offer[] = [
      {
        id: 1,
        store_chain: 'Starbucks',
        title: '20% off your next purchase',
        description: 'Get 20% off any drink or food item',
        offer_type: 'discount',
        discount_value: 20,
        minimum_purchase: 10,
        terms_conditions: 'Valid for one-time use. Cannot be combined with other offers.',
        valid_from: new Date('2025-08-01'),
        valid_until: new Date('2025-08-31'),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        store_chain: 'Target',
        title: 'Buy One Get One Free',
        description: 'BOGO on select household items',
        offer_type: 'bogo',
        minimum_purchase: 25,
        terms_conditions: 'Valid on participating items only. See store for details.',
        valid_from: new Date('2025-08-10'),
        valid_until: new Date('2025-08-25'),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 3,
        store_chain: 'CVS',
        title: 'Extra Bucks Rewards',
        description: 'Earn $5 Extra Bucks on $20 purchase',
        offer_type: 'cashback',
        discount_value: 5,
        minimum_purchase: 20,
        terms_conditions: 'Extra Bucks valid for 30 days from issue date.',
        valid_from: new Date('2025-08-01'),
        valid_until: new Date('2025-09-01'),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Filter offers for user's store chains
    return sampleOffers.filter(offer => 
      storeChains.some(chain => 
        chain.toLowerCase().includes(offer.store_chain.toLowerCase())
      )
    );
  }

  /**
   * Score offers based on user preferences and behavior
   */
  private async scoreOffers(
    offers: Offer[],
    userId: number,
    userCards: string[],
    location?: { latitude: number; longitude: number }
  ): Promise<OfferRecommendation[]> {
    const recommendations: OfferRecommendation[] = [];

    for (const offer of offers) {
      let score = 0;
      const reasons: string[] = [];
      const matchedCards: string[] = [];

      // Base score for active offers
      if (offer.is_active) score += 10;

      // Score based on offer type preferences
      const typeScores = {
        'discount': 8,
        'cashback': 7,
        'bogo': 9,
        'points': 6,
        'freebie': 10
      };
      score += typeScores[offer.offer_type] || 5;

      // Score based on discount value
      if (offer.discount_value) {
        if (offer.discount_value >= 20) score += 15;
        else if (offer.discount_value >= 10) score += 10;
        else if (offer.discount_value >= 5) score += 5;
      }

      // Check which cards match this offer
      for (const card of userCards) {
        if (card.toLowerCase().includes(offer.store_chain.toLowerCase())) {
          matchedCards.push(card);
          score += 20; // High score for matching cards
          reasons.push(`You have a ${card} card`);
        }
      }

      // Time-based scoring
      const now = new Date();
      const expiry = offer.valid_until ? new Date(offer.valid_until) : null;
      const expiresSoon = expiry ? 
        (expiry.getTime() - now.getTime()) < (7 * 24 * 60 * 60 * 1000) : false;

      if (expiresSoon) {
        score += 25; // Urgent offers get priority
        reasons.push('Expires soon');
      }

      // Determine urgency
      let urgency: 'high' | 'medium' | 'low' = 'low';
      if (expiresSoon) urgency = 'high';
      else if (score >= 50) urgency = 'medium';

      // Generate primary reason
      const primaryReason = reasons.length > 0 ? reasons[0] : 
        `${offer.offer_type} offer for ${offer.store_chain}`;

      recommendations.push({
        offer,
        score,
        reason: primaryReason,
        urgency,
        expiresSoon,
        matchedCards
      });
    }

    return recommendations;
  }

  /**
   * Save offer for user
   */
  async saveOfferForUser(userId: number, offerId: number): Promise<boolean> {
    try {
      // In a real implementation, this would save to database
      console.log(`Saving offer ${offerId} for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error saving offer:', error);
      return false;
    }
  }

  /**
   * Mark offer as used
   */
  async markOfferAsUsed(userId: number, offerId: number): Promise<boolean> {
    try {
      // In a real implementation, this would update database
      console.log(`Marking offer ${offerId} as used for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error marking offer as used:', error);
      return false;
    }
  }

  /**
   * Get saved offers for user
   */
  async getUserSavedOffers(userId: number, includeUsed: boolean = false): Promise<UserSavedOffer[]> {
    try {
      // Sample saved offers
      const savedOffers: UserSavedOffer[] = [
        {
          id: 1,
          user_id: userId,
          offer_id: 1,
          is_used: false,
          created_at: new Date(),
          offer: {
            id: 1,
            store_chain: 'Starbucks',
            title: '20% off your next purchase',
            description: 'Get 20% off any drink or food item',
            offer_type: 'discount',
            discount_value: 20,
            minimum_purchase: 10,
            terms_conditions: 'Valid for one-time use.',
            valid_until: new Date('2025-08-31'),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        }
      ];

      return includeUsed ? savedOffers : savedOffers.filter(o => !o.is_used);
    } catch (error) {
      console.error('Error getting saved offers:', error);
      return [];
    }
  }

  /**
   * Get trending offers
   */
  async getTrendingOffers(limit: number = 10): Promise<Offer[]> {
    try {
      // In a real implementation, this would analyze usage statistics
      const trendingOffers = await this.getOffersForStores(['Starbucks', 'Target', 'CVS', 'Walmart']);
      return trendingOffers.slice(0, limit);
    } catch (error) {
      console.error('Error getting trending offers:', error);
      return [];
    }
  }

  /**
   * Search offers by text
   */
  async searchOffers(
    query: string, 
    storeChain?: string, 
    offerType?: string
  ): Promise<Offer[]> {
    try {
      let offers = await this.getOffersForStores(['Starbucks', 'Target', 'CVS', 'Walmart']);

      // Filter by search query
      if (query) {
        const lowerQuery = query.toLowerCase();
        offers = offers.filter(offer => 
          offer.title.toLowerCase().includes(lowerQuery) ||
          offer.description?.toLowerCase().includes(lowerQuery) ||
          offer.store_chain.toLowerCase().includes(lowerQuery)
        );
      }

      // Filter by store chain
      if (storeChain) {
        offers = offers.filter(offer => 
          offer.store_chain.toLowerCase().includes(storeChain.toLowerCase())
        );
      }

      // Filter by offer type
      if (offerType) {
        offers = offers.filter(offer => offer.offer_type === offerType);
      }

      return offers;
    } catch (error) {
      console.error('Error searching offers:', error);
      return [];
    }
  }

  /**
   * Get offer categories/types
   */
  getOfferTypes(): Array<{ type: string; display_name: string; description: string }> {
    return [
      {
        type: 'discount',
        display_name: 'Discounts',
        description: 'Percentage or dollar amount off purchases'
      },
      {
        type: 'cashback',
        display_name: 'Cashback',
        description: 'Money back or store credit rewards'
      },
      {
        type: 'bogo',
        display_name: 'Buy One Get One',
        description: 'Free items with purchase'
      },
      {
        type: 'points',
        display_name: 'Bonus Points',
        description: 'Extra loyalty points or rewards'
      },
      {
        type: 'freebie',
        display_name: 'Free Items',
        description: 'Complimentary products or services'
      }
    ];
  }

  /**
   * Get offer analytics for admin
   */
  async getOfferAnalytics(): Promise<{
    totalOffers: number;
    activeOffers: number;
    totalSaves: number;
    totalRedemptions: number;
    topStores: Array<{ store: string; offerCount: number }>;
    topOfferTypes: Array<{ type: string; count: number }>;
  }> {
    try {
      // In a real implementation, this would query actual analytics
      return {
        totalOffers: 150,
        activeOffers: 120,
        totalSaves: 5200,
        totalRedemptions: 2100,
        topStores: [
          { store: 'Starbucks', offerCount: 25 },
          { store: 'Target', offerCount: 20 },
          { store: 'CVS', offerCount: 18 },
          { store: 'Walmart', offerCount: 15 }
        ],
        topOfferTypes: [
          { type: 'discount', count: 45 },
          { type: 'bogo', count: 30 },
          { type: 'cashback', count: 25 },
          { type: 'points', count: 20 }
        ]
      };
    } catch (error) {
      console.error('Error getting offer analytics:', error);
      throw error;
    }
  }

  /**
   * Validate offer conditions
   */
  validateOfferConditions(offer: Offer, purchaseAmount: number): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if offer is active
    if (!offer.is_active) {
      errors.push('Offer is not currently active');
    }

    // Check expiration
    if (offer.valid_until && new Date() > new Date(offer.valid_until)) {
      errors.push('Offer has expired');
    }

    // Check minimum purchase
    if (offer.minimum_purchase && purchaseAmount < offer.minimum_purchase) {
      errors.push(`Minimum purchase of $${offer.minimum_purchase} required`);
    }

    // Check start date
    if (offer.valid_from && new Date() < new Date(offer.valid_from)) {
      errors.push('Offer is not yet valid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}