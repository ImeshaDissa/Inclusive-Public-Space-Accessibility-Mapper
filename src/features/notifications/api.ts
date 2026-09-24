import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AppNotification, NotificationCategory, StatusType } from '@/types/accessibility';
import { INITIAL_NOTIFICATIONS } from '@/constants/mockData';

const VALID_CATEGORIES: NotificationCategory[] = [
  'verification',
  'saved_place',
  'badge',
  'dispute',
  'system',
];

const toCategory = (value: unknown): NotificationCategory =>
  VALID_CATEGORIES.includes(value as NotificationCategory)
    ? (value as NotificationCategory)
    : 'saved_place';

/**
 * Fetch user notifications from Supabase `notifications` table.
 */
export async function fetchNotificationsFromSupabase(userId?: string): Promise<AppNotification[]> {
  if (!isSupabaseConfigured || !userId) {
    return INITIAL_NOTIFICATIONS;
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return INITIAL_NOTIFICATIONS;
    }

    return data.map((n) => ({
      id: n.id,
      placeId: n.place_id,
      placeName: n.place_name,
      oldStatus: (n.old_status as StatusType) || null,
      newStatus: (n.new_status as StatusType) || 'verified',
      message: n.message,
      timestamp: formatTimeAgo(n.created_at),
      read: Boolean(n.read),
      category: toCategory(n.category),
    }));
  } catch (err) {
    console.error('Error fetching notifications from Supabase:', err);
    return INITIAL_NOTIFICATIONS;
  }
}

/**
 * Insert a new status notification into Supabase `notifications` table.
 */
export async function insertNotificationToSupabase(
  notification: AppNotification,
  userId: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return true;

  try {
    const { error } = await supabase.from('notifications').insert({
      id: notification.id,
      user_id: userId,
      place_id: notification.placeId,
      place_name: notification.placeName,
      old_status: notification.oldStatus,
      new_status: notification.newStatus,
      message: notification.message,
      category: notification.category,
      read: notification.read,
    });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read in Supabase for a user.
 */
export async function markNotificationsReadInSupabase(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return true;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Clear/delete all notifications for a user in Supabase.
 */
export async function clearNotificationsInSupabase(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return true;

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}
