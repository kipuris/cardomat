import express from 'express';
import { LocationService } from '../services/LocationService';
import { CardAssistService } from '../services/CardAssistService';
import { StoreLocationRepository } from '../repositories/StoreLocationRepository';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, validateQuery } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();
const locationService = new LocationService();
const cardAssistService = new CardAssistService();
const storeRepository = new StoreLocationRepository();

// Validation schemas
const coordinatesSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

const cardSuggestionsSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  includeAnalytics: Joi.boolean().optional()
});

const nearbyStoresSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(0.1).max(50).optional().default(5),
  limit: Joi.number().integer().min(1).max(100).optional().default(20)
});

const preferencesSchema = Joi.object({
  enableLocationServices: Joi.boolean().optional(),
  enablePushNotifications: Joi.boolean().optional(),
  enableLockScreenDisplay: Joi.boolean().optional(),
  maxDistanceKm: Joi.number().min(0.1).max(50).optional(),
  preferredStoreChains: Joi.array().items(Joi.string()).optional(),
  quietHours: Joi.object({
    enabled: Joi.boolean().required(),
    start: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    end: Joi.string().pattern(/^\d{2}:\d{2}$/).required()
  }).optional()
});

const createStoreSchema = Joi.object({
  store_name: Joi.string().min(1).max(255).required(),
  store_chain: Joi.string().max(255).optional(),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(50).optional(),
  zip_code: Joi.string().max(20).optional(),
  country: Joi.string().max(50).optional().default('US'),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  geofence_radius: Joi.number().integer().min(10).max(1000).optional().default(100),
  is_active: Joi.boolean().optional().default(true)
});

// Apply authentication to all routes
router.use(authenticateToken);

// Get card suggestions based on location
router.post('/suggest-cards', validateRequest(cardSuggestionsSchema), async (req, res) => {
  try {
    const { latitude, longitude, includeAnalytics } = req.body;
    
    const suggestions = await cardAssistService.getCardSuggestions({
      userLocation: { latitude, longitude },
      userId: req.user!.id,
      timestamp: new Date()
    });

    const response: any = {
      success: true,
      data: {
        suggestions: suggestions.map(s => ({
          card: {
            id: s.card.id,
            card_name: s.card.card_name,
            store_name: s.card.store_name,
            card_color: s.card.card_color,
            is_favorite: s.card.is_favorite
          },
          store: {
            id: s.store.id,
            name: s.store.store_name,
            chain: s.store.store_chain,
            distance: locationService.formatDistance(s.distance),
            address: s.store.address
          },
          confidence: s.confidence,
          reason: s.reason,
          priority: s.priority
        })),
        location: {
          latitude,
          longitude,
          accuracy: locationService.getLocationAccuracy(0) // Would need actual accuracy
        },
        timestamp: new Date().toISOString()
      }
    };

    if (includeAnalytics) {
      response.data.analytics = {
        totalStoresNearby: suggestions.length,
        averageDistance: suggestions.reduce((sum, s) => sum + s.distance, 0) / suggestions.length,
        confidenceDistribution: {
          high: suggestions.filter(s => s.confidence === 'high').length,
          medium: suggestions.filter(s => s.confidence === 'medium').length,
          low: suggestions.filter(s => s.confidence === 'low').length
        }
      };
    }

    res.json(response);

  } catch (error) {
    console.error('Card suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get card suggestions',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Find nearby stores
router.get('/stores/nearby', validateQuery(nearbyStoresSchema), async (req, res) => {
  try {
    const { latitude, longitude, radius, limit } = req.query as any;

    const stores = await storeRepository.findNearby(
      { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      parseFloat(radius),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        stores: stores.map(store => ({
          id: store.id,
          name: store.store_name,
          chain: store.store_chain,
          address: store.address,
          city: store.city,
          state: store.state,
          coordinates: {
            latitude: store.latitude,
            longitude: store.longitude
          },
          geofence_radius: store.geofence_radius,
          distance_km: (store as any).distance_km // From SQL query
        })),
        search: {
          center: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
          radius_km: parseFloat(radius),
          total_found: stores.length
        }
      }
    });

  } catch (error) {
    console.error('Nearby stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby stores',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Get user location preferences
router.get('/preferences', async (req, res) => {
  try {
    const preferences = await cardAssistService.getUserPreferences(req.user!.id);

    res.json({
      success: true,
      data: {
        preferences,
        privacy_info: locationService.getPrivacyRecommendations()
      }
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location preferences'
    });
  }
});

// Update user location preferences
router.put('/preferences', validateRequest(preferencesSchema), async (req, res) => {
  try {
    const updatedPreferences = await cardAssistService.updateUserPreferences(
      req.user!.id,
      req.body
    );

    res.json({
      success: true,
      message: 'Location preferences updated successfully',
      data: {
        preferences: updatedPreferences
      }
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location preferences',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Calculate distance between two points
router.post('/distance', async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!locationService.validateCoordinates(from) || !locationService.validateCoordinates(to)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    const distance = locationService.calculateDistance(from, to);
    const bearing = locationService.getBearing(from, to);
    const travelTime = locationService.estimateTravelTime(distance);

    res.json({
      success: true,
      data: {
        distance_meters: Math.round(distance),
        distance_formatted: locationService.formatDistance(distance),
        bearing_degrees: Math.round(bearing),
        estimated_walk_time_minutes: travelTime,
        coordinates: {
          from,
          to
        }
      }
    });

  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate distance'
    });
  }
});

// Get store locations (admin function)
router.get('/stores', async (req, res) => {
  try {
    const { chain, city, state, active } = req.query;

    const filters = {
      store_chain: chain as string,
      city: city as string,
      state: state as string,
      is_active: active ? active === 'true' : undefined
    };

    const stores = await storeRepository.findAll(filters);

    res.json({
      success: true,
      data: {
        stores: stores.map(store => ({
          id: store.id,
          name: store.store_name,
          chain: store.store_chain,
          address: store.address,
          city: store.city,
          state: store.state,
          coordinates: {
            latitude: store.latitude,
            longitude: store.longitude
          },
          geofence_radius: store.geofence_radius,
          is_active: store.is_active
        })),
        filters: filters,
        total: stores.length
      }
    });

  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get store locations'
    });
  }
});

// Create store location (admin function)
router.post('/stores', validateRequest(createStoreSchema), async (req, res) => {
  try {
    const store = await storeRepository.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Store location created successfully',
      data: {
        store: {
          id: store.id,
          name: store.store_name,
          chain: store.store_chain,
          address: store.address,
          city: store.city,
          state: store.state,
          coordinates: {
            latitude: store.latitude,
            longitude: store.longitude
          },
          geofence_radius: store.geofence_radius,
          is_active: store.is_active
        }
      }
    });

  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create store location',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// Get store statistics
router.get('/stores/statistics', async (req, res) => {
  try {
    const stats = await storeRepository.getStatistics();

    res.json({
      success: true,
      data: {
        statistics: stats,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Store statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get store statistics'
    });
  }
});

export default router;