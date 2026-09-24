import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Place, AppNotification } from '@/types/accessibility';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Client-side actions for Tier 2 (device push) and
 * Tier 3 (email requests: account export, monthly digest).
 * All actions run under the standard 'user' role — no caregiver features.
 */

const invokeEdge = async (name: string) => {
  const { error } = await supabase.functions.invoke(name);
  return !error;
};

/**
 * Tier 2: Emergency alert — delivers a high-priority alert message through
 * all available channels so it is ALWAYS visible:
 *
 *   1. Local device notification  -> lock screen / shade instantly
 *      (works in Expo Go; remote push requires an EAS build)
 *   2. In-app notification row    -> appears in the Inbox tab in real time
 *   3. Email notification request -> queues an email alert through Supabase
 *      so the user receives a direct alert in their inbox
 */
export async function sendSavedPlaceAlert(userId: string, email?: string): Promise<boolean> {
  const message = 'Emergency alert: check your saved places for newly reported barriers.';
  let delivered = false;

  // 1. Instant local notification (no server needed).
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Emergency Alert',
        body: message,
        sound: true,
        data: { type: 'self_alert' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: Platform.OS === 'android' ? 'alerts' : undefined,
      },
    });
    delivered = true;
  } catch {
    // Notifications module unavailable (e.g. web) — fall through.
  }

  if (!isSupabaseConfigured) return delivered;

  try {
    // 2. In-app Inbox message (realtime pushes it into the Inbox instantly).
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      placeId: '',
      placeName: 'Emergency Alert',
      oldStatus: null,
      newStatus: 'pending',
      message,
      timestamp: 'Just now',
      read: false,
      category: 'system',
    };
    await supabase.from('notifications').insert({
      id: notif.id,
      user_id: userId,
      place_id: null,
      place_name: notif.placeName,
      old_status: null,
      new_status: notif.newStatus,
      message: notif.message,
      category: 'system',
      read: false,
    });
    delivered = true;

    // 3. Queue an email notification as the primary emergency signal.
    if (email) {
      const { error } = await supabase.from('email_requests').insert({
        user_id: userId,
        kind: 'account_export',
        to_email: email,
        payload: {
          type: 'emergency_alert',
          message,
          triggered_at: new Date().toISOString(),
        },
      });
      if (!error) {
        await invokeEdge('send-email');
      }
    }

    // 4. Remote push to all registered devices (best-effort, needs deploy).
    await supabase.functions.invoke('push-notify', {
      body: { type: 'self_alert', submitter_id: userId, message },
    });
  } catch {
    // Local notification already delivered — don't fail the whole action.
  }

  return delivered;
}

/**
 * Tier 3: Account export — queues an email with the user's saved
 * places + profile summary, then triggers the `send-email` function.
 */
export async function requestAccountExport(
  userId: string,
  email: string,
  savedPlaces: Place[]
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('email_requests').insert({
      user_id: userId,
      kind: 'account_export',
      to_email: email,
      payload: {
        savedPlaces: savedPlaces.map((p) => ({
          name: p.name,
          address: p.address,
          status: p.status,
        })),
      },
    });
    if (error) return false;
    return await invokeEdge('send-email');
  } catch {
    return false;
  }
}
