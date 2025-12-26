import Joi from 'joi';

// Authentication schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])')).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().optional(),
  device_id: Joi.string().required(),
  device_name: Joi.string().required(),
  device_type: Joi.string().valid('ios', 'android', 'web').required(),
  push_token: Joi.string().optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  device_id: Joi.string().required(),
  device_name: Joi.string().required(),
  device_type: Joi.string().valid('ios', 'android', 'web').required(),
  push_token: Joi.string().optional()
});

// Loyalty card schemas
export const createCardSchema = Joi.object({
  card_name: Joi.string().min(1).max(255).required(),
  store_name: Joi.string().min(1).max(255).required(),
  card_number: Joi.string().min(1).max(100).required(),
  barcode_type: Joi.string().valid('code128', 'code39', 'qr', 'ean13', 'upc', 'pdf417').required(),
  barcode_data: Joi.string().min(1).max(500).required(),
  card_color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  notes: Joi.string().max(1000).optional().allow(''),
  is_favorite: Joi.boolean().optional(),
  display_order: Joi.number().integer().min(0).optional()
});

export const updateCardSchema = Joi.object({
  card_name: Joi.string().min(1).max(255).optional(),
  store_name: Joi.string().min(1).max(255).optional(),
  card_number: Joi.string().min(1).max(100).optional(),
  barcode_type: Joi.string().valid('code128', 'code39', 'qr', 'ean13', 'upc', 'pdf417').optional(),
  barcode_data: Joi.string().min(1).max(500).optional(),
  card_color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  notes: Joi.string().max(1000).optional().allow(''),
  is_favorite: Joi.boolean().optional(),
  display_order: Joi.number().integer().min(0).optional()
}).min(1); // At least one field must be provided

// Parameter schemas
export const cardIdSchema = Joi.object({
  cardId: Joi.number().integer().positive().required()
});

// Query schemas
export const cardListQuerySchema = Joi.object({
  store_name: Joi.string().optional(),
  is_favorite: Joi.boolean().optional(),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'card_name', 'store_name', 'display_order').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional().default('asc'),
  limit: Joi.number().integer().min(1).max(100).optional().default(50),
  offset: Joi.number().integer().min(0).optional().default(0)
});

// Device registration schema
export const deviceRegistrationSchema = Joi.object({
  device_id: Joi.string().required(),
  device_name: Joi.string().required(),
  device_type: Joi.string().valid('ios', 'android', 'web').required(),
  push_token: Joi.string().optional()
});

// Barcode scan result schema
export const barcodeScanResultSchema = Joi.object({
  barcode_data: Joi.string().required(),
  barcode_type: Joi.string().valid('code128', 'code39', 'qr', 'ean13', 'upc', 'pdf417').required(),
  store_info: Joi.object({
    name: Joi.string().optional(),
    chain: Joi.string().optional()
  }).optional()
});

// Card usage logging schema
export const cardUsageSchema = Joi.object({
  action_type: Joi.string().valid('display', 'scan').required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional()
  }).optional(),
  metadata: Joi.object().optional()
});