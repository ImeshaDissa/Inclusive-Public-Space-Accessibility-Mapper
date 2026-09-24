import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { AppNotification, Place } from '@/types/accessibility';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Client-side actions for Tier 2 (device push) and
 * Tier 3 (email requests: account export, emergency alert, monthly digest, test).
 * All actions run under the standard 'user' role — no caregiver features.
 */

export type NotificationActionResult = {
  ok: boolean;
  detail?: string;
  /** Present only when an email was attempted: true = accepted by send-email. */
  emailOk?: boolean;
};

/**
 * Invoke an Edge Function and surface its error details.
 * supabase-js wraps non-2xx responses in a FunctionsHttpError whose
 * `context` is the Response — read the body to get our custom error text.
 */
const invokeEdge = async (name: string): Promise<NotificationActionResult> => {
  const { data, error } = await supabase.functions.invoke(name);
  if (error) {
    let detail = error.message || 'Edge function call failed.';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof (ctx as Response).text === 'function') {
        const raw = await (ctx as Response).text();
        try {
          const body = raw ? JSON.parse(raw) : null;
          if (body?.error) detail = body.error;
          else if (Array.isArray(body?.errors) && body.errors.length > 0) detail = body.errors.join(' | ');
          else if (raw) detail = raw.slice(0, 300);
        } catch {
          if (raw) detail = raw.slice(0, 300);
        }
      }
    } catch {
      // keep error.message
    }
    if (/failed to (fetch|send)|network|CORS/i.test(detail)) {
      detail = `${detail} — is the "${name}" function deployed? (supabase functions deploy ${name})`;
    }
    return { ok: false, detail };
  }
  if (data && data.ok === false) {
    const detail =
      data.error ||
      (Array.isArray(data.errors) ? data.errors.join(' | ') : 'Email delivery failed.');
    return { ok: false, detail };
  }
  return { ok: true };
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
 *   4. Remote Expo push           -> best-effort to registered devices
 */
export async function sendSavedPlaceAlert(
  userId: string,
  email?: string
): Promise<NotificationActionResult> {
  const message = 'Emergency alert: check your saved places for newly reported barriers.';
  let delivered = false;
  let emailOk: boolean | undefined;
  let emailDetail: string | undefined;

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

  if (!isSupabaseConfigured) {
    return { ok: delivered, emailOk: false, detail: 'Supabase is not configured in this build.' };
  }

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
    const { error: inboxError } = await supabase.from('notifications').insert({
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
    if (!inboxError) delivered = true;

    // 3. Queue an email notification as the primary emergency signal.
    if (email) {
      const { error } = await supabase.from('email_requests').insert({
        user_id: userId,
        kind: 'emergency_alert',
        to_email: email,
        payload: {
          type: 'emergency_alert',
          message,
          triggered_at: new Date().toISOString(),
        },
      });
      if (error) {
        emailOk = false;
        emailDetail = `Could not queue alert email: ${error.message}`;
      } else {
        const res = await invokeEdge('send-email');
        emailOk = res.ok;
        if (!res.ok) emailDetail = res.detail;
      }
    }

    // 4. Remote push to all registered devices (best-effort, needs deploy).
    await supabase.functions.invoke('push-notify', {
      body: { type: 'self_alert', submitter_id: userId, message },
    });
  } catch (err) {
    if (emailOk === undefined && email) {
      emailOk = false;
      emailDetail = String(err);
    }
  }

  return { ok: delivered, emailOk, detail: emailDetail };
}

/**
 * Tier 3: Account export — queues an email with the user's saved
 * places + profile summary, then triggers the `send-email` function.
 */
export async function requestAccountExport(
  userId: string,
  email: string,
  savedPlaces: Place[]
): Promise<NotificationActionResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, detail: 'Supabase is not configured in this build.' };
  }
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
    if (error) return { ok: false, emailOk: false, detail: `Could not queue export: ${error.message}` };
    const res = await invokeEdge('send-email');
    return { ...res, emailOk: res.ok };
  } catch (err) {
    return { ok: false, emailOk: false, detail: String(err) };
  }
}

/**
 * Tier 3: Test email — queues a `test` kind row and invokes send-email.
 * Useful to verify BREVO_API_KEY / EMAIL_FROM secrets end-to-end.
 */
export async function sendTestEmail(userId: string, email: string): Promise<NotificationActionResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, detail: 'Supabase is not configured in this build.' };
  }
  try {
    const { error } = await supabase.from('email_requests').insert({
      user_id: userId,
      kind: 'test',
      to_email: email,
      payload: { triggered_at: new Date().toISOString() },
    });
    if (error) return { ok: false, emailOk: false, detail: `Could not queue test email: ${error.message}` };
    const res = await invokeEdge('send-email');
    return { ...res, emailOk: res.ok };
  } catch (err) {
    return { ok: false, emailOk: false, detail: String(err) };
  }
}

/**
 * Tier 3: Welcome email — introduces the four community roles and SDG 10/11.
 * Sent automatically after Supabase sign-up (best-effort).
 */
export async function sendWelcomeEmail(userId: string, email: string): Promise<NotificationActionResult> {
  if (!isSupabaseConfigured) return { ok: false, detail: 'Supabase is not configured.' };
  try {
    const { error } = await supabase.from('email_requests').insert({
      user_id: userId,
      kind: 'welcome',
      to_email: email,
      payload: { triggered_at: new Date().toISOString() },
    });
    if (error) return { ok: false, emailOk: false, detail: error.message };
    const res = await invokeEdge('send-email');
    return { ...res, emailOk: res.ok };
  } catch (err) {
    return { ok: false, emailOk: false, detail: String(err) };
  }
}

export type PlaceUpdateEmailPayload = {
  place_name: string;
  address?: string;
  old_status: string;
  new_status: string;
  message?: string;
  confirm_count?: number;
  dispute_count?: number;
};

/**
 * Tier 3: Saved-place status change email (verified / pending / disputed).
 */
export async function sendPlaceUpdateEmail(
  userId: string,
  email: string,
  payload: PlaceUpdateEmailPayload
): Promise<NotificationActionResult> {
  if (!isSupabaseConfigured) return { ok: false, detail: 'Supabase is not configured.' };
  try {
    const { error } = await supabase.from('email_requests').insert({
      user_id: userId,
      kind: 'place_update',
      to_email: email,
      payload: { ...payload, triggered_at: new Date().toISOString() },
    });
    if (error) return { ok: false, emailOk: false, detail: error.message };
    const res = await invokeEdge('send-email');
    return { ...res, emailOk: res.ok };
  } catch (err) {
    return { ok: false, emailOk: false, detail: String(err) };
  }
}
