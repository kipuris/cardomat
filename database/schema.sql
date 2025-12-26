-- Cardomat Loyalty Card Digital Wallet Database Schema

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User devices for multi-device sync
CREATE TABLE user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) UNIQUE NOT NULL, -- unique device identifier
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL, -- 'ios', 'android', 'web'
  push_token VARCHAR(512), -- for push notifications
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty cards table
CREATE TABLE loyalty_cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  card_name VARCHAR(255) NOT NULL, -- e.g., "Starbucks Rewards"
  store_name VARCHAR(255) NOT NULL, -- e.g., "Starbucks"
  card_number_encrypted TEXT NOT NULL, -- encrypted card number/barcode
  barcode_type VARCHAR(50) NOT NULL, -- 'code128', 'code39', 'qr', 'ean13', etc.
  barcode_data_encrypted TEXT NOT NULL, -- encrypted barcode data
  card_color VARCHAR(7) DEFAULT '#2196F3', -- hex color for card display
  notes TEXT, -- user notes about the card
  is_favorite BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0, -- for custom sorting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store locations for Card Assist feature
CREATE TABLE store_locations (
  id SERIAL PRIMARY KEY,
  store_name VARCHAR(255) NOT NULL,
  store_chain VARCHAR(255), -- e.g., "Starbucks", "Target"
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'US',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius INTEGER DEFAULT 100, -- meters
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card usage logs for analytics
CREATE TABLE card_usage_logs (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES loyalty_cards(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'display', 'scan', 'add', 'edit', 'delete'
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  store_location_id INTEGER REFERENCES store_locations(id),
  metadata JSONB, -- additional data about the usage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offers and coupons
CREATE TABLE offers (
  id SERIAL PRIMARY KEY,
  store_chain VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  offer_type VARCHAR(50) NOT NULL, -- 'discount', 'cashback', 'bogo', 'points'
  discount_value DECIMAL(10, 2), -- percentage or dollar amount
  minimum_purchase DECIMAL(10, 2),
  terms_conditions TEXT,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User saved offers
CREATE TABLE user_saved_offers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, offer_id)
);

-- User preferences including location settings
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  location_preferences JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- API keys for external access
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  key_name VARCHAR(255) NOT NULL,
  api_key_hash VARCHAR(255) UNIQUE NOT NULL,
  permissions JSONB DEFAULT '{"read": true, "write": false}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'user', 'card', 'offer', etc.
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_loyalty_cards_user_id ON loyalty_cards(user_id);
CREATE INDEX idx_loyalty_cards_store_name ON loyalty_cards(store_name);
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX idx_store_locations_chain ON store_locations(store_chain);
CREATE INDEX idx_store_locations_coords ON store_locations(latitude, longitude);
CREATE INDEX idx_card_usage_logs_card_id ON card_usage_logs(card_id);
CREATE INDEX idx_card_usage_logs_created_at ON card_usage_logs(created_at);
CREATE INDEX idx_offers_store_chain ON offers(store_chain);
CREATE INDEX idx_offers_valid_until ON offers(valid_until);
CREATE INDEX idx_user_saved_offers_user_id ON user_saved_offers(user_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(api_key_hash);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON user_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loyalty_cards_updated_at BEFORE UPDATE ON loyalty_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_locations_updated_at BEFORE UPDATE ON store_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();