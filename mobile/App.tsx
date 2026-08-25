import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <LocationProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </LocationProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
