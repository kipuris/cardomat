import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSync } from '../hooks/useSync';

interface SyncStatusBarProps {
  style?: any;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ style }) => {
  const { 
    isOnline, 
    isSyncing, 
    pendingChanges, 
    getSyncStatusMessage,
    triggerSync,
  } = useSync();

  const getStatusColor = () => {
    if (!isOnline) return '#FF3B30';
    if (isSyncing) return '#FF9500';
    if (pendingChanges > 0) return '#FF9500';
    return '#34C759';
  };

  const getStatusIcon = () => {
    if (!isOnline) return 'cloud-offline';
    if (isSyncing) return 'sync';
    if (pendingChanges > 0) return 'cloud-upload';
    return 'cloud-done';
  };

  const handlePress = () => {
    if (!isSyncing && isOnline) {
      triggerSync();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: getStatusColor() }, style]}
      onPress={handlePress}
      disabled={isSyncing || !isOnline}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons 
              name={getStatusIcon()} 
              size={16} 
              color="#fff" 
            />
          )}
          <Text style={styles.statusText}>
            {getSyncStatusMessage()}
          </Text>
        </View>
        
        {!isSyncing && isOnline && pendingChanges > 0 && (
          <Text style={styles.actionText}>Tap to sync</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.8,
    fontStyle: 'italic',
  },
});