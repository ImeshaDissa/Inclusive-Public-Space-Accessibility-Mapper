import { isRunningInExpoGo } from 'expo';

type Notifications = typeof import('expo-notifications');

/**
 * expo-notifications prints an unavoidable console WARNING + ERROR the moment
 * the module is imported while running inside Expo Go (remote push was removed
 * from Expo Go in SDK 53). LogBox.ignoreLogs cannot hide them because they are
 * forwarded to the native console before LogBox filters them.
 *
 * Local notifications, the in-app inbox and realtime all still work in Expo Go,
 * so the module is loaded here with those two known messages filtered out.
 * Everything else logged during the import is passed through untouched.
 */
const EXPO_GO_NOISE = [
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
];

let cached: Notifications | null = null;

const isExpoGoNoise = (args: unknown[]): boolean => {
  const [first] = args;
  return typeof first === 'string' && EXPO_GO_NOISE.some((message) => first.includes(message));
};

export function loadNotifications(): Notifications {
  if (cached) return cached;

  const importer = (): Notifications => require('expo-notifications');

  if (!isRunningInExpoGo()) {
    cached = importer();
    return cached;
  }

  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args: unknown[]) => {
    if (!isExpoGoNoise(args)) originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    if (!isExpoGoNoise(args)) originalError(...args);
  };

  try {
    cached = importer();
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }

  return cached as Notifications;
}
