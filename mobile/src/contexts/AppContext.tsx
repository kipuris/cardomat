import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LoyaltyCard, Transaction, Offer } from '../types/card';
import { encryptionService } from '../services/EncryptionService';

interface AppState {
  cards: LoyaltyCard[];
  transactions: Transaction[];
  offers: Offer[];
  settings: AppSettings;
  isLoading: boolean;
}

interface AppSettings {
  pushNotifications: boolean;
  locationServices: boolean;
  cardAssist: boolean;
  biometricLock: boolean;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CARDS'; payload: LoyaltyCard[] }
  | { type: 'ADD_CARD'; payload: LoyaltyCard }
  | { type: 'UPDATE_CARD'; payload: LoyaltyCard }
  | { type: 'DELETE_CARD'; payload: string }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'SET_OFFERS'; payload: Offer[] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> };

const initialState: AppState = {
  cards: [],
  transactions: [],
  offers: [],
  settings: {
    pushNotifications: true,
    locationServices: true,
    cardAssist: true,
    biometricLock: false,
  },
  isLoading: false,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_CARDS':
      return { ...state, cards: action.payload };
    
    case 'ADD_CARD':
      return { ...state, cards: [...state.cards, action.payload] };
    
    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.id ? action.payload : card
        ),
      };
    
    case 'DELETE_CARD':
      return {
        ...state,
        cards: state.cards.filter(card => card.id !== action.payload),
      };
    
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    
    case 'SET_OFFERS':
      return { ...state, offers: action.payload };
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    
    default:
      return state;
  }
};

interface AppContextType extends AppState {
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from AsyncStorage on app start
  useEffect(() => {
    loadPersistedData();
  }, []);

  // Persist data to AsyncStorage when state changes
  useEffect(() => {
    persistData();
  }, [state.cards, state.transactions, state.settings]);

  const loadPersistedData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const [cardsData, transactionsData, settingsData] = await Promise.all([
        AsyncStorage.getItem('loyalty_cards'),
        AsyncStorage.getItem('transactions'),
        AsyncStorage.getItem('settings'),
      ]);

      if (cardsData) {
        const encryptedCards = JSON.parse(cardsData);
        const cards = await Promise.all(
          encryptedCards.map(async (card: any) => {
            try {
              const decryptedCard = await encryptionService.decryptCardData(card);
              return {
                ...decryptedCard,
                createdAt: new Date(decryptedCard.createdAt),
                updatedAt: new Date(decryptedCard.updatedAt),
              };
            } catch (error) {
              console.error('Failed to decrypt card:', error);
              return {
                ...card,
                createdAt: new Date(card.createdAt),
                updatedAt: new Date(card.updatedAt),
              };
            }
          })
        );
        dispatch({ type: 'SET_CARDS', payload: cards });
      }

      if (transactionsData) {
        const transactions = JSON.parse(transactionsData).map((transaction: any) => ({
          ...transaction,
          timestamp: new Date(transaction.timestamp),
        }));
        dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
      }

      if (settingsData) {
        dispatch({ type: 'UPDATE_SETTINGS', payload: JSON.parse(settingsData) });
      }
    } catch (error) {
      console.error('Error loading persisted data:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const persistData = async () => {
    try {
      // Encrypt sensitive card data before storage
      const encryptedCards = await Promise.all(
        state.cards.map(async (card) => {
          try {
            return await encryptionService.encryptCardData(card);
          } catch (error) {
            console.error('Failed to encrypt card:', error);
            return card; // Store unencrypted if encryption fails
          }
        })
      );

      await Promise.all([
        AsyncStorage.setItem('loyalty_cards', JSON.stringify(encryptedCards)),
        AsyncStorage.setItem('transactions', JSON.stringify(state.transactions)),
        AsyncStorage.setItem('settings', JSON.stringify(state.settings)),
      ]);
    } catch (error) {
      console.error('Error persisting data:', error);
    }
  };

  const contextValue: AppContextType = {
    ...state,
    dispatch,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};