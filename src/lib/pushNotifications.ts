import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Tier 2: Push notifications via Expo Push Service.
 *
 * - Registers Android notification channels (alerts = high priority).
 * - Requests OS permission.
 * - Fetches the Expo push token (requires EAS projectId in app.json
 *   extra.eas.projectId for standalone/development builds).
 * - Upserts the token into public.push_tokens so DB/Edge triggers can
 *   target this device.
 */

// Show in-app alerts while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const ANDROID_CHANNELS = {
  alerts: {
    id: 'alerts',
    name: 'Accessibility Alerts',
    importance: Notifications.AndroidImportance.MAX,
    description: 'High-priority barriers at saved places',
    vibrationPattern: [0, 250, 250, 250] as number[],
    lightColor: '#FF5A36',
  },
  updates: {
    id: 'updates',
    name: 'Status Updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Verification and badge updates',
    lightColor: '#FF5A36',
  },
} as const;

export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const channel of Object.values(ANDROID_CHANNELS)) {
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      importance: channel.importance,
      vibrationPattern: 'vibrationPattern' in channel ? channel.vibrationPattern : undefined,
      lightColor: channel.lightColor,
    });
  }
}

export async function registerPushToken(userId: string): Promise<{ token?: string; error?: string }> {
  try {
    // Remote push is not supported inside Expo Go (removed in SDK 53).
    // Local notifications, the in-app inbox, and realtime still work there;
    // use a development build (eas build --profile development) for remote push.
    if (isRunningInExpoGo()) {
      return { error: 'Remote push requires a development build (not Expo Go).' };
    }

    if (!Device.isDevice) {
      // Emulators cannot receive push; skip silently (in-app still works).
      return { error: 'Push requires a physical device.' };
    }

    await setupAndroidChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return { error: 'Push permission not granted.' };
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      return { error: 'Missing EAS projectId (app.json extra.eas.projectId).' };
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    if (!tokenData) {
      return { error: 'Failed to get Expo push token.' };
    }

    const token = typeof tokenData === 'string' ? tokenData : tokenData.data;

    if (isSupabaseConfigured) {
      const { error: upsertError } = await supabase.from('push_tokens').upsert(
        {
          user_id: userId,
          expo_push_token: token,
          platform: Platform.OS,
          device_name: Device.deviceName ?? Device.modelName ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,expo_push_token' },
      );
      if (upsertError) {
        return { error: upsertError.message };
      }
    }

    return { token };
  } catch (err: any) {
    return { error: err?.message || 'Push registration failed.' };
  }
}

/** Local notification used for immediate in-app testing of Tier 2. */
export async function sendTestLocalNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Accessibility Alert',
      body: 'Test alert: high-priority barrier reported at a saved place.',
      sound: true,
      data: { type: 'high_priority_report', test: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: Platform.OS === 'android' ? ANDROID_CHANNELS.alerts.id : undefined,
    },
  });
}
