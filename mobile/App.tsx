import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export const navigationRef = createNavigationContainerRef<any>();

function ThemedApp() {
  const { colors, isDark } = useTheme();

  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.tabBarBg || colors.surface || colors.card,
      text: colors.textPrimary,
      border: colors.tabBarBorder || colors.border,
      notification: colors.accent,
    },
  };

  useEffect(() => {
    const handleNotificationData = (data: any) => {
      if (!data || !navigationRef.isReady()) return;

      const screen = data.screen || data.relatedType;
      const bookingId = data.bookingId || data.relatedId;

      if (screen === 'BookingDetail' || data.type === 'BOOKING' || screen === 'BOOKING') {
        try {
          if (navigationRef.canGoBack()) {
            navigationRef.navigate('PlayerBookings', { highlightBookingId: bookingId });
          } else {
            navigationRef.navigate('PlayerBookings');
          }
        } catch {
          try {
            navigationRef.navigate('OwnerBookings');
          } catch (e) {
            console.warn('Navigation fallback notice:', e);
          }
        }
      } else if (screen === 'DuesScreen' || data.type === 'DUE') {
        try {
          navigationRef.navigate('OwnerPlayersDues');
        } catch {
          navigationRef.navigate('PlayerPayments');
        }
      } else if (screen === 'Notifications' || data.notificationId) {
        try {
          navigationRef.navigate('Notifications');
        } catch (e) {
          console.warn('Could not navigate to notifications:', e);
        }
      }
    };

    // 1. Response when user taps a notification while app is running or in background
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      handleNotificationData(data);
    });

    // 2. Response if app was launched directly from cold start by tapping a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response?.notification?.request?.content?.data;
        // Give navigation tree a brief cycle to mount
        setTimeout(() => handleNotificationData(data), 600);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <StatusBar style={colors.statusBarStyle} />
      <AuthProvider>
        <LocationProvider>
          <RootNavigator />
        </LocationProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
