import express from 'express';
import { OffersService } from '../services/OffersService';
import { OffersRepository } from '../repositories/OffersRepository';
import { LoyaltyCardRepository } from '../repositories/LoyaltyCardRepository';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, validateQuery, validateParams } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();
const offersService = new OffersService();
const offersRepository = new OffersRepository();
const cardRepository = new LoyaltyCardRepository();

// Validation schemas
const createOfferSchema = Joi.object({
  store_chain: Joi.string().min(1).max(255).required(),
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  offer_type: Joi.string().valid('discount', 'cashback', 'bogo', 'points', 'freebie').required(),
  discount_value: Joi.number().min(0).max(100).optional(),
  minimum_purchase: Joi.number().min(0).optional(),
  terms_conditions: Joi.string().max(2000).optional(),
  valid_from: Joi.date().optional(),
  valid_until: Joi.date().optional(),
  is_active: Joi.boolean().optional()
});

const updateOfferSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  offer_type: Joi.string().valid('discount', 'cashback', 'bogo', 'points', 'freebie').optional(),
  discount_value: Joi.number().min(0).max(100).optional(),
  minimum_purchase: Joi.number().min(0).optional(),
  terms_conditions: Joi.string().max(2000).optional(),
  valid_from: Joi.date().optional(),
  valid_until: Joi.date().optional(),
  is_active: Joi.boolean().optional()
}).min(1);

const offerQuerySchema = Joi.object({
  store_chain: Joi.string().optional(),
  offer_type: Joi.string().valid('discount', 'cashback', 'bogo', 'points', 'freebie').optional(),
  is_active: Joi.boolean().optional(),
  valid_only: Joi.boolean().optional(),
  search: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  offset: Joi.number().integer().min(0).optional().default(0)
});

const offerIdSchema = Joi.object({
  offerId: Joi.number().integer().positive().required()
});

const personalizedOffersSchema = Joi.object({
  include_location: Joi.boolean().optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional()
});

// Apply authentication to all routes
router.use(authenticateToken);

// Get personalized offers for user
router.get('/personalized', validateQuery(personalizedOffersSchema), async (req, res) => {
  try {
    // Get user's loyalty cards to determine relevant stores
    const userCards = await cardRepository.findByUserId(req.user!.id);
    const storeNames = userCards.map(card => card.store_name);

    // Get location if provided
    const location = req.query.include_location && req.query.latitude && req.query.longitude ? {
      latitude: parseFloat(req.query.latitude as string),
      longitude: parseFloat(req.query.longitude as string)
    } : undefined;

    const recommendations = await offersService.getPersonalizedOffers(
      req.user!.id,
      storeNames,
      location
    );

    res.json({
      success: true,
      data: {
        recommendations: recommendations.map(rec => ({
          offer: {
            id: rec.offer.id,
            store_chain: rec.offer.store_chain,
            title: rec.offer.title,
            description: rec.offer.description,
            offer_type: rec.offer.offer_type,
            discount_value: rec.offer.discount_value,
            minimum_purchase: rec.offer.minimum_purchase,
            valid_until: rec.offer.valid_until,
            terms_conditions: rec.offer.terms_conditions
          },
          score: rec.score,
          reason: rec.reason,
          urgency: rec.urgency,
          expires_soon: rec.expiresSoon,
          matched_cards: rec.matchedCards
        })),
        user_cards_count: userCards.length,
        location_used: !!location,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Personalized offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personalized offers',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Get all offers with filtering
router.get('/', validateQuery(offerQuerySchema), async (req, res) => {
  try {
    const { store_chain, offer_type, is_active, valid_only, search, limit, offset } = req.query as any;

    const filters = {
      store_chain,
      offer_type,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      valid_only: valid_only === 'true',
      search
    };

    const allOffers = await offersRepository.findAll(filters);
    
    // Apply pagination
    const total = allOffers.length;
    const offers = allOffers.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        offers: offers.map(offer => ({
          id: offer.id,
          store_chain: offer.store_chain,
          title: offer.title,
          description: offer.description,
          offer_type: offer.offer_type,
          discount_value: offer.discount_value,
          minimum_purchase: offer.minimum_purchase,
          valid_from: offer.valid_from,
          valid_until: offer.valid_until,
          is_active: offer.is_active,
          created_at: offer.created_at
        })),
        pagination: {
          total,
          offset,
          limit,
          has_more: offset + limit < total
        },
        filters: filters
      }
    });

  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get offers'
    });
  }
});

// Get specific offer by ID
router.get('/:offerId', validateParams(offerIdSchema), async (req, res) => {
  try {
    const offerId = parseInt(req.params.offerId);
    const offer = await offersRepository.findById(offerId);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Check if user has saved this offer
    const savedOffers = await offersRepository.getUserSavedOffers(req.user!.id, true);
    const isSaved = savedOffers.some(saved => saved.offer_id === offerId);
    const savedOffer = savedOffers.find(saved => saved.offer_id === offerId);

    res.json({
      success: true,
      data: {
        offer: {
          id: offer.id,
          store_chain: offer.store_chain,
          title: offer.title,
          description: offer.description,
          offer_type: offer.offer_type,
          discount_value: offer.discount_value,
          minimum_purchase: offer.minimum_purchase,
          terms_conditions: offer.terms_conditions,
          valid_from: offer.valid_from,
          valid_until: offer.valid_until,
          is_active: offer.is_active,
          created_at: offer.created_at
        },
        user_status: {
          is_saved: isSaved,
          is_used: savedOffer?.is_used || false,
          saved_at: savedOffer?.created_at,
          used_at: savedOffer?.used_at
        }
      }
    });

  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get offer'
    });
  }
});

// Save offer for user
router.post('/:offerId/save', validateParams(offerIdSchema), async (req, res) => {
  try {
    const offerId = parseInt(req.params.offerId);
    
    // Check if offer exists
    const offer = await offersRepository.findById(offerId);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Save the offer
    const savedOffer = await offersRepository.saveOfferForUser(req.user!.id, offerId);

    res.json({
      success: true,
      message: 'Offer saved successfully',
      data: {
        saved_offer: {
          id: savedOffer.id,
          offer_id: savedOffer.offer_id,
          saved_at: savedOffer.created_at
        }
      }
    });

  } catch (error) {
    console.error('Save offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save offer',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Remove saved offer
router.delete('/:offerId/save', validateParams(offerIdSchema), async (req, res) => {
  try {
    const offerId = parseInt(req.params.offerId);
    
    const removed = await offersRepository.removeSavedOfferForUser(req.user!.id, offerId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Saved offer not found'
      });
    }

    res.json({
      success: true,
      message: 'Offer removed from saved list'
    });

  } catch (error) {
    console.error('Remove saved offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove saved offer'
    });
  }
});

// Mark offer as used
router.post('/:offerId/use', validateParams(offerIdSchema), async (req, res) => {
  try {
    const offerId = parseInt(req.params.offerId);
    const { purchase_amount } = req.body;
    
    // Get the offer and validate conditions
    const offer = await offersRepository.findById(offerId);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Validate offer conditions if purchase amount provided
    if (purchase_amount !== undefined) {
      const validation = offersService.validateOfferConditions(offer, purchase_amount);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Offer conditions not met',
          errors: validation.errors
        });
      }
    }

    // Mark as used
    const marked = await offersRepository.markOfferAsUsed(req.user!.id, offerId);

    if (!marked) {
      return res.status(404).json({
        success: false,
        message: 'Saved offer not found or already used'
      });
    }

    res.json({
      success: true,
      message: 'Offer marked as used successfully',
      data: {
        offer_id: offerId,
        used_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Use offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to use offer'
    });
  }
});

// Get user's saved offers
router.get('/saved/list', async (req, res) => {
  try {
    const includeUsed = req.query.include_used === 'true';
    const savedOffers = await offersRepository.getUserSavedOffers(req.user!.id, includeUsed);

    res.json({
      success: true,
      data: {
        saved_offers: savedOffers.map(saved => ({
          id: saved.id,
          is_used: saved.is_used,
          saved_at: saved.created_at,
          used_at: saved.used_at,
          offer: saved.offer ? {
            id: saved.offer.id,
            store_chain: saved.offer.store_chain,
            title: saved.offer.title,
            description: saved.offer.description,
            offer_type: saved.offer.offer_type,
            discount_value: saved.offer.discount_value,
            minimum_purchase: saved.offer.minimum_purchase,
            valid_until: saved.offer.valid_until,
            is_active: saved.offer.is_active
          } : null
        })),
        total_count: savedOffers.length,
        unused_count: savedOffers.filter(o => !o.is_used).length,
        used_count: savedOffers.filter(o => o.is_used).length
      }
    });

  } catch (error) {
    console.error('Get saved offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get saved offers'
    });
  }
});

// Search offers
router.get('/search/query', async (req, res) => {
  try {
    const { q, store_chain, offer_type } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query (q) parameter is required'
      });
    }

    const offers = await offersService.searchOffers(
      q,
      store_chain as string,
      offer_type as string
    );

    res.json({
      success: true,
      data: {
        offers: offers.map(offer => ({
          id: offer.id,
          store_chain: offer.store_chain,
          title: offer.title,
          description: offer.description,
          offer_type: offer.offer_type,
          discount_value: offer.discount_value,
          minimum_purchase: offer.minimum_purchase,
          valid_until: offer.valid_until,
          is_active: offer.is_active
        })),
        query: q,
        filters: {
          store_chain,
          offer_type
        },
        total_results: offers.length
      }
    });

  } catch (error) {
    console.error('Search offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search offers'
    });
  }
});

// Get trending offers
router.get('/trending/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const trending = await offersService.getTrendingOffers(limit);

    res.json({
      success: true,
      data: {
        trending_offers: trending.map(offer => ({
          id: offer.id,
          store_chain: offer.store_chain,
          title: offer.title,
          description: offer.description,
          offer_type: offer.offer_type,
          discount_value: offer.discount_value,
          valid_until: offer.valid_until
        })),
        limit,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Trending offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending offers'
    });
  }
});

// Get offer types/categories
router.get('/meta/types', (req, res) => {
  try {
    const types = offersService.getOfferTypes();

    res.json({
      success: true,
      data: {
        offer_types: types
      }
    });

  } catch (error) {
    console.error('Get offer types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get offer types'
    });
  }
});

// Get expiring offers for user
router.get('/expiring/soon', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const expiring = await offersRepository.getExpiringOffers(days);
    
    // Filter by user's saved offers
    const savedOffers = await offersRepository.getUserSavedOffers(req.user!.id, false);
    const savedOfferIds = savedOffers.map(s => s.offer_id);
    
    const userExpiringOffers = expiring.filter(offer => 
      savedOfferIds.includes(offer.id)
    );

    res.json({
      success: true,
      data: {
        expiring_offers: userExpiringOffers.map(offer => ({
          id: offer.id,
          store_chain: offer.store_chain,
          title: offer.title,
          description: offer.description,
          offer_type: offer.offer_type,
          discount_value: offer.discount_value,
          valid_until: offer.valid_until,
          days_remaining: Math.ceil((new Date(offer.valid_until!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        })),
        days_ahead: days,
        total_expiring: userExpiringOffers.length
      }
    });

  } catch (error) {
    console.error('Expiring offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get expiring offers'
    });
  }
});

export default router;