export interface LoyaltyCard {
  id: string;
  name: string;
  store: string;
  cardNumber: string;
  barcodeType: 'CODE128' | 'CODE39' | 'QR_CODE' | 'EAN13' | 'UPC_A';
  barcodeData: string;
  color: string;
  logo?: string;
  points?: number;
  category: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface Transaction {
  id: string;
  cardId: string;
  store: string;
  amount: number;
  points: number;
  type: 'earn' | 'redeem';
  description: string;
  timestamp: Date;
}

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

export interface Offer {
  id: string;
  store: string;
  title: string;
  description: string;
  discount: string;
  validUntil: Date;
  isRedeemed: boolean;
  category: string;
  image?: string;
}