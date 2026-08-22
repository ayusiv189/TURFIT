import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'TruFit',
  slug: 'trufit',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'trufit',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#020617',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.trufit.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'TruFit uses your location to discover nearby sports turfs, arenas, and calculate driving distance.',
      NSLocationAlwaysUsageDescription:
        'TruFit uses your location to find nearby sports turfs and arenas.',
      NSCameraUsageDescription:
        'TruFit uses your camera to let you take and upload photos for turf listings, reviews, and user profile.',
      NSPhotoLibraryUsageDescription:
        'TruFit accesses your photo library so you can upload turf gallery pictures and profile avatars.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#020617',
    },
    package: 'com.trufit.app',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
    ],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      },
    },
  },
  extra: {
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    eas: {
      projectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID || 'your-eas-project-id',
    },
  },
});
