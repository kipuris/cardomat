import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useAppContext } from '../contexts/AppContext';
import { LoyaltyCard } from '../types/card';
import { useSync } from './useSync';

export const useCards = () => {
  const { cards, dispatch } = useAppContext();
  const { syncCardCreation, syncCardUpdate, syncCardDeletion } = useSync();

  const addCard = useCallback(async (cardData: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCard: LoyaltyCard = {
      ...cardData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dispatch({ type: 'ADD_CARD', payload: newCard });
    
    // Sync with server
    await syncCardCreation(newCard);
    
    return newCard;
  }, [dispatch, syncCardCreation]);

  const updateCard = useCallback(async (cardId: string, updates: Partial<LoyaltyCard>) => {
    const existingCard = cards.find(card => card.id === cardId);
    if (!existingCard) {
      throw new Error('Card not found');
    }

    const updatedCard: LoyaltyCard = {
      ...existingCard,
      ...updates,
      updatedAt: new Date(),
    };

    dispatch({ type: 'UPDATE_CARD', payload: updatedCard });
    
    // Sync with server
    await syncCardUpdate(updatedCard);
    
    return updatedCard;
  }, [cards, dispatch, syncCardUpdate]);

  const deleteCard = useCallback(async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    Alert.alert(
      'Delete Card',
      `Are you sure you want to delete "${card.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            dispatch({ type: 'DELETE_CARD', payload: cardId });
            
            // Sync with server
            await syncCardDeletion(cardId);
          },
        },
      ]
    );
  }, [cards, dispatch, syncCardDeletion]);

  const toggleFavorite = useCallback(async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    await updateCard(cardId, { isFavorite: !card.isFavorite });
  }, [cards, updateCard]);

  const searchCards = useCallback((query: string) => {
    if (!query.trim()) return cards;

    const lowercaseQuery = query.toLowerCase();
    return cards.filter(card =>
      card.name.toLowerCase().includes(lowercaseQuery) ||
      card.store.toLowerCase().includes(lowercaseQuery) ||
      card.category.toLowerCase().includes(lowercaseQuery) ||
      card.cardNumber.includes(query)
    );
  }, [cards]);

  const getCardsByCategory = useCallback((category: string) => {
    return cards.filter(card => card.category === category);
  }, [cards]);

  const getFavoriteCards = useCallback(() => {
    return cards.filter(card => card.isFavorite);
  }, [cards]);

  const getRecentCards = useCallback((limit = 5) => {
    return cards
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }, [cards]);

  const getCardById = useCallback((cardId: string) => {
    return cards.find(card => card.id === cardId);
  }, [cards]);

  return {
    cards,
    addCard,
    updateCard,
    deleteCard,
    toggleFavorite,
    searchCards,
    getCardsByCategory,
    favoriteCards: getFavoriteCards(),
    recentCards: getRecentCards(),
    getCardById,
  };
};