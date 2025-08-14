import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';

import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProvider } from './src/contexts/AppContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}