import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { NotificationCategory, Place, StatusType } from '@/types/accessibility';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { ProfileBackground } from '@/components/profile/ProfileBackground';

type FilterKey = 'all' | NotificationCategory;

const FILTERS: Array<{ key: FilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'All', icon: 'albums-outline' },
  { key: 'verification', label: 'Verifications', icon: 'shield-checkmark-outline' },
  { key: 'saved_place', label: 'Saved Places', icon: 'bookmark-outline' },
  { key: 'badge', label: 'Badges', icon: 'ribbon-outline' },
];

/**
 * Tier 1: In-App Notification Center.
 * Dedicated inbox tab reading from public.notifications (Supabase) with
 * realtime updates handled in AppContext. Supports category filters.
 */
export default function InboxScreen() {
  const { colors, isDark } = useAppTheme();
  const {
    notifications,
    places,
    toggleSavePlace,
    clearNotifications,
    markNotificationsRead,
  } = useApp();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedPlaceModal, setSelectedPlaceModal] = useState<Place | null>(null);

  const filtered =
    filter === 'all' ? notifications : notifications.filter((n) => n.category === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getCategoryStyle = (category: NotificationCategory) => {
    switch (category) {
      case 'verification':
        return { icon: 'shield-checkmark' as const, color: colors.statusDotVerified };
      case 'badge':
        return { icon: 'ribbon' as const, color: '#FF5A36' };
      case 'dispute':
        return { icon: 'alert-circle' as const, color: colors.statusDotDisputed };
      case 'system':
        return { icon: 'settings' as const, color: colors.textMuted };
      case 'saved_place':
      default:
        return { icon: 'bookmark' as const, color: colors.statusDotPending };
    }
  };

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return colors.statusDotVerified;
      case 'disputed':
        return colors.statusDotDisputed;
      default:
        return colors.statusDotPending;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ProfileBackground theme={isDark ? 'dark' : 'light'} />

      <SafeAreaView style={styles.safeOverlay} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? 'rgba(11, 15, 25, 0.72)' : 'rgba(255, 255, 255, 0.78)',
            borderBottomColor: colors.headerBorder,
            paddingTop: 12,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.bellBadge, { backgroundColor: colors.accentBg }]}>
            <Ionicons name="notifications" size={20} color={colors.accent} />
            {unreadCount > 0 && (
              <View style={[styles.unreadDot, { backgroundColor: colors.accent }]}>
                <Text style={styles.unreadDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markNotificationsRead}
              hitSlop={6}
              style={[styles.headerIconBtn, { backgroundColor: colors.chipBg }]}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <Ionicons name="checkmark-done-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={clearNotifications}
              hitSlop={6}
              style={[styles.headerIconBtn, { backgroundColor: colors.errorBg }]}
              accessibilityRole="button"
              accessibilityLabel="Clear notifications"
            >
              <Ionicons name="trash-outline" size={17} color={colors.clearBtn} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filters */}
      <View
        style={[
          styles.filterRow,
          {
            backgroundColor: isDark ? 'rgba(11, 15, 25, 0.55)' : 'rgba(255, 255, 255, 0.55)',
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.segmentInactiveBg, borderColor: colors.chipBorder },
                  active && { backgroundColor: colors.segmentActiveBg, borderColor: colors.segmentActiveBg },
                ]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.72}
              >
                <Ionicons name={f.icon} size={13} color={active ? colors.filterActiveText : colors.textSecondary} />
                <Text style={[styles.filterText, { color: active ? colors.filterActiveText : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification List */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filtered.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.emptyTitle }]}>
              {filter === 'all' ? 'No Notifications' : 'Nothing here yet'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.emptySubtext }]}>
              Verification results, saved place updates, and badge milestones will appear here in real time.
            </Text>
          </View>
        ) : (
          filtered.map((notif) => {
            const style = getCategoryStyle(notif.category);
            const relatedPlace = places.find((p) => p.id === notif.placeId);
            const row = (
              <View
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: notif.read
                      ? isDark
                        ? 'rgba(21, 28, 44, 0.88)'
                        : 'rgba(255, 255, 255, 0.9)'
                      : colors.accentBg,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View style={[styles.notifIconBox, { backgroundColor: style.color + '22' }]}>
                  <Ionicons name={style.icon} size={19} color={style.color} />
                </View>
                <View style={styles.notifTextContainer}>
                  <View style={styles.notifTitleRow}>
                    <Text style={[styles.notifCategory, { color: style.color }]}>
                      {notif.category.replace('_', ' ').toUpperCase()}
                    </Text>
                    {!notif.read && <View style={[styles.newDot, { backgroundColor: colors.accent }]} />}
                  </View>
                  <Text style={[styles.notifMessage, { color: colors.textPrimary }]}>{notif.message}</Text>
                  <Text style={[styles.notifTimestamp, { color: colors.textMuted }]}>{notif.timestamp}</Text>
                </View>
                {relatedPlace && (
                  <Image source={{ uri: relatedPlace.photos[0] }} style={styles.placeThumb} />
                )}
              </View>
            );

            return relatedPlace ? (
              <TouchableOpacity key={notif.id} activeOpacity={0.8} onPress={() => setSelectedPlaceModal(relatedPlace)}>
                {row}
              </TouchableOpacity>
            ) : (
              <View key={notif.id}>{row}</View>
            );
          })
        )}
      </ScrollView>
      </SafeAreaView>

      <PlaceDetailsModal
        place={selectedPlaceModal}
        visible={!!selectedPlaceModal}
        onClose={() => setSelectedPlaceModal(null)}
        onToggleSave={toggleSavePlace}
        onReportUpdate={() => {
          setSelectedPlaceModal(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeOverlay: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadDotText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  filterRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: { fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  notifIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifTextContainer: { flex: 1 },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifCategory: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  newDot: { width: 7, height: 7, borderRadius: 4 },
  notifMessage: { fontSize: 12.5, lineHeight: 17, fontWeight: '600', marginTop: 3 },
  notifTimestamp: { fontSize: 10, marginTop: 4 },
  placeThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 4,
  },
});
