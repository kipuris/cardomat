import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

import { syncService, SyncStatus } from '../services/SyncService';
import { useAppContext } from '../contexts/AppContext';

export const useSync = () => {
  const { cards, transactions, dispatch } = useAppContext();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncService.addListener(setSyncStatus);
    return unsubscribe;
  }, []);

  // Sync a new card creation
  const syncCardCreation = useCallback(async (card: any) => {
    try {
      await syncService.addPendingChange({
        type: 'CREATE',
        entity: 'card',
        data: card,
      });
    } catch (error) {
      console.error('Failed to queue card creation for sync:', error);
    }
  }, []);

  // Sync a card update
  const syncCardUpdate = useCallback(async (card: any) => {
    try {
      await syncService.addPendingChange({
        type: 'UPDATE',
        entity: 'card',
        data: card,
      });
    } catch (error) {
      console.error('Failed to queue card update for sync:', error);
    }
  }, []);

  // Sync a card deletion
  const syncCardDeletion = useCallback(async (cardId: string) => {
    try {
      await syncService.addPendingChange({
        type: 'DELETE',
        entity: 'card',
        data: { id: cardId },
      });
    } catch (error) {
      console.error('Failed to queue card deletion for sync:', error);
    }
  }, []);

  // Sync a new transaction
  const syncTransactionCreation = useCallback(async (transaction: any) => {
    try {
      await syncService.addPendingChange({
        type: 'CREATE',
        entity: 'transaction',
        data: transaction,
      });
    } catch (error) {
      console.error('Failed to queue transaction creation for sync:', error);
    }
  }, []);

  // Manually trigger sync
  const triggerSync = useCallback(async () => {
    if (!syncStatus.isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your internet connection.');
      return false;
    }

    if (syncStatus.isSyncing) {
      return false; // Already syncing
    }

    try {
      await syncService.performFullSync();
      
      // Optionally refresh local data from server
      const serverData = await syncService.syncFromServer();
      
      // Update local state with server data
      dispatch({ type: 'SET_CARDS', payload: serverData.cards });
      dispatch({ type: 'SET_TRANSACTIONS', payload: serverData.transactions });
      
      return true;
    } catch (error) {
      console.error('Manual sync failed:', error);
      return false;
    }
  }, [syncStatus, dispatch]);

  // Force sync all data from server
  const pullFromServer = useCallback(async () => {
    if (!syncStatus.isOnline) {
      Alert.alert('Offline', 'Cannot pull data while offline.');
      return false;
    }

    try {
      const serverData = await syncService.syncFromServer();
      
      // Update local state
      dispatch({ type: 'SET_CARDS', payload: serverData.cards });
      dispatch({ type: 'SET_TRANSACTIONS', payload: serverData.transactions });
      
      Alert.alert('Success', 'Data synchronized from server successfully.');
      return true;
    } catch (error) {
      Alert.alert('Sync Error', 'Failed to pull data from server.');
      return false;
    }
  }, [syncStatus.isOnline, dispatch]);

  // Push local changes to server
  const pushToServer = useCallback(async () => {
    if (!syncStatus.isOnline) {
      Alert.alert('Offline', 'Cannot push data while offline.');
      return false;
    }

    try {
      await syncService.syncPendingChanges();
      Alert.alert('Success', 'Local changes pushed to server successfully.');
      return true;
    } catch (error) {
      Alert.alert('Sync Error', 'Failed to push changes to server.');
      return false;
    }
  }, [syncStatus.isOnline]);

  // Get formatted sync status message
  const getSyncStatusMessage = useCallback(() => {
    if (!syncStatus.isOnline) {
      return 'Offline';
    }
    
    if (syncStatus.isSyncing) {
      return 'Syncing...';
    }
    
    if (syncStatus.pendingChanges > 0) {
      return `${syncStatus.pendingChanges} changes pending`;
    }
    
    if (syncStatus.lastSync) {
      const timeDiff = Date.now() - syncStatus.lastSync.getTime();
      const minutes = Math.floor(timeDiff / 60000);
      
      if (minutes < 1) {
        return 'Synced just now';
      } else if (minutes < 60) {
        return `Synced ${minutes} minutes ago`;
      } else {
        const hours = Math.floor(minutes / 60);
        return `Synced ${hours} hours ago`;
      }
    }
    
    return 'Never synced';
  }, [syncStatus]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return syncStatus.pendingChanges > 0;
  }, [syncStatus.pendingChanges]);

  return {
    // Status
    syncStatus,
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    pendingChanges: syncStatus.pendingChanges,
    lastSync: syncStatus.lastSync,
    
    // Methods
    syncCardCreation,
    syncCardUpdate,
    syncCardDeletion,
    syncTransactionCreation,
    triggerSync,
    pullFromServer,
    pushToServer,
    
    // Utilities
    getSyncStatusMessage,
    hasUnsavedChanges,
  };
};