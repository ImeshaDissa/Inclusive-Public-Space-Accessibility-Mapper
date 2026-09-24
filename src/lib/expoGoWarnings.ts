import { LogBox } from 'react-native';

/**
 * Expo Go noise suppression (dev only).
 *
 * Expo Go on Android logs a scary console ERROR the moment expo-notifications
 * loads, because remote push was removed from Expo Go in SDK 53. It is
 * expected behavior — remote push requires a development build, while local
 * notifications, the in-app inbox, and realtime still work in Expo Go.
 *
 * Silence it in development so genuine errors are not drowned out.
 * (This module is imported first in src/app/_layout.tsx.)
 */
if (__DEV__) {
  LogBox.ignoreLogs([
    'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
    '`expo-notifications` functionality is not fully supported in Expo Go',
  ]);
}
