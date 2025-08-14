import express from 'express';
import { LoyaltyCardRepository } from '../repositories/LoyaltyCardRepository';
import { authenticateToken, authenticateAPIKey } from '../middleware/auth';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { createCardSchema, updateCardSchema, cardIdSchema, cardListQuerySchema, cardUsageSchema } from '../validation/schemas';

const router = express.Router();
const cardRepository = new LoyaltyCardRepository();

// Apply authentication to all card routes
router.use((req, res, next) => {
  // Check for API key first, then fall back to JWT token
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return authenticateAPIKey(req, res, next);
  } else {
    return authenticateToken(req, res, next);
  }
});

// Get all loyalty cards for the authenticated user
router.get('/', validateQuery(cardListQuerySchema), async (req, res) => {
  try {
    const { store_name, is_favorite, sort_by, sort_order, limit, offset } = req.query as any;
    
    let cards = await cardRepository.findByUserId(req.user!.id);

    // Apply filters
    if (store_name) {
      cards = cards.filter(card => 
        card.store_name.toLowerCase().includes(store_name.toLowerCase())
      );
    }

    if (is_favorite !== undefined) {
      cards = cards.filter(card => card.is_favorite === is_favorite);
    }

    // Apply sorting
    if (sort_by) {
      cards.sort((a, b) => {
        let aVal = a[sort_by as keyof typeof a];
        let bVal = b[sort_by as keyof typeof b];
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }
        
        if (sort_order === 'desc') {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        } else {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
      });
    }

    // Apply pagination
    const total = cards.length;
    const paginatedCards = cards.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        cards: paginatedCards,
        pagination: {
          total,
          offset,
          limit,
          has_more: offset + limit < total
        }
      }
    });

  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get a specific loyalty card
router.get('/:cardId', validateParams(cardIdSchema), async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);
    const card = await cardRepository.findById(cardId, req.user!.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Log card display
    await cardRepository.logCardUsage(cardId, req.user!.id, 'display');

    res.json({
      success: true,
      data: { card }
    });

  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create a new loyalty card
router.post('/', validateRequest(createCardSchema), async (req, res) => {
  try {
    const cardData = req.body;
    const card = await cardRepository.create(req.user!.id, cardData);

    res.status(201).json({
      success: true,
      message: 'Loyalty card created successfully',
      data: { card }
    });

  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update a loyalty card
router.put('/:cardId', 
  validateParams(cardIdSchema), 
  validateRequest(updateCardSchema), 
  async (req, res) => {
    try {
      const cardId = parseInt(req.params.cardId);
      const updateData = req.body;
      
      const updatedCard = await cardRepository.update(cardId, req.user!.id, updateData);

      if (!updatedCard) {
        return res.status(404).json({
          success: false,
          message: 'Card not found'
        });
      }

      res.json({
        success: true,
        message: 'Loyalty card updated successfully',
        data: { card: updatedCard }
      });

    } catch (error) {
      console.error('Update card error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Delete a loyalty card
router.delete('/:cardId', validateParams(cardIdSchema), async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);
    const deleted = await cardRepository.delete(cardId, req.user!.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    res.json({
      success: true,
      message: 'Loyalty card deleted successfully'
    });

  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Log card usage (for analytics)
router.post('/:cardId/usage', 
  validateParams(cardIdSchema), 
  validateRequest(cardUsageSchema), 
  async (req, res) => {
    try {
      const cardId = parseInt(req.params.cardId);
      const { action_type, location, metadata } = req.body;

      // Verify card exists and belongs to user
      const card = await cardRepository.findById(cardId, req.user!.id);
      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Card not found'
        });
      }

      // Log the usage
      const usageMetadata = {
        ...metadata,
        location: location || null
      };

      await cardRepository.logCardUsage(cardId, req.user!.id, action_type, usageMetadata);

      res.json({
        success: true,
        message: 'Usage logged successfully'
      });

    } catch (error) {
      console.error('Log usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Get card display data for barcode scanning (optimized endpoint)
router.get('/:cardId/display', validateParams(cardIdSchema), async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);
    const card = await cardRepository.findById(cardId, req.user!.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Log card display
    await cardRepository.logCardUsage(cardId, req.user!.id, 'display');

    // Return only the data needed for display
    res.json({
      success: true,
      data: {
        card: {
          id: card.id,
          card_name: card.card_name,
          store_name: card.store_name,
          barcode_type: card.barcode_type,
          barcode_data: card.barcode_data,
          card_color: card.card_color
        }
      }
    });

  } catch (error) {
    console.error('Get card display error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;