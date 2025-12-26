import { useCallback } from 'react';
import { Alert, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppContext } from '../contexts/AppContext';

export const useSettings = () => {
  const { settings, cards, transactions, dispatch } = useAppContext();

  const updateSetting = useCallback((key: keyof typeof settings, value: boolean) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { [key]: value },
    });
  }, [dispatch]);

  const exportData = useCallback(async () => {
    try {
      const exportData = {
        cards,
        transactions,
        settings,
        exportDate: new Date().toISOString(),
      };

      const jsonData = JSON.stringify(exportData, null, 2);
      
      await Share.share({
        message: jsonData,
        title: 'Cardomat Data Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  }, [cards, transactions, settings]);

  const clearData = useCallback(async () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your cards, transactions, and reset settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'loyalty_cards',
                'transactions',
                'settings',
              ]);
              
              dispatch({ type: 'SET_CARDS', payload: [] });
              dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
              dispatch({
                type: 'UPDATE_SETTINGS',
                payload: {
                  pushNotifications: true,
                  locationServices: true,
                  cardAssist: true,
                  biometricLock: false,
                },
              });
              
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  }, [dispatch]);

  const resetToDefaults = useCallback(() => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        pushNotifications: true,
        locationServices: true,
        cardAssist: true,
        biometricLock: false,
      },
    });
  }, [dispatch]);

  return {
    settings,
    updateSetting,
    exportData,
    clearData,
    resetToDefaults,
  };
};