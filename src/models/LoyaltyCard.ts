export interface LoyaltyCard {
  id: number;
  user_id: number;
  card_name: string;
  store_name: string;
  card_number_encrypted: string;
  barcode_type: 'code128' | 'code39' | 'qr' | 'ean13' | 'upc' | 'pdf417';
  barcode_data_encrypted: string;
  card_color: string;
  notes?: string;
  is_favorite: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateLoyaltyCardData {
  card_name: string;
  store_name: string;
  card_number: string;
  barcode_type: LoyaltyCard['barcode_type'];
  barcode_data: string;
  card_color?: string;
  notes?: string;
  is_favorite?: boolean;
  display_order?: number;
}

export interface UpdateLoyaltyCardData {
  card_name?: string;
  store_name?: string;
  card_number?: string;
  barcode_type?: LoyaltyCard['barcode_type'];
  barcode_data?: string;
  card_color?: string;
  notes?: string;
  is_favorite?: boolean;
  display_order?: number;
}

export interface LoyaltyCardResponse {
  id: number;
  card_name: string;
  store_name: string;
  card_number: string; // decrypted for response
  barcode_type: string;
  barcode_data: string; // decrypted for response
  card_color: string;
  notes?: string;
  is_favorite: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}