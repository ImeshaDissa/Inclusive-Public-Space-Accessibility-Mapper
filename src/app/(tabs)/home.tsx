import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { Place, StatusType } from '@/types/accessibility';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';

const LOCAL_FALLBACK_IMAGES = [
  require('@/assets/images/train_station.jpg'),
  require('@/assets/images/botanical_gardens.jpg'),
  require('@/assets/images/public_restroom.jpg'),
];

const SafeActivityImage = ({ uri, seed, style }: { uri?: string; seed: string; style: any }) => {
  const [failed, setFailed] = useState(false);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const fallback = LOCAL_FALLBACK_IMAGES[Math.abs(hash) % LOCAL_FALLBACK_IMAGES.length];

  return (
    <Image
      source={!failed && uri ? { uri } : fallback}
      style={style}
      onError={() => setFailed(true)}
    />
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile, places, reports, toggleSavePlace } = useApp();
  const { colors, isDark, toggleTheme } = useAppTheme();

  const [savedModalOpen, setSavedModalOpen] = useState(false);
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);

  const savedPlaces = places.filter((p) => p.saved);

  const statusDotColor = (status: StatusType) =>
    status === 'verified'
      ? colors.statusDotVerified
      : status === 'disputed'
      ? colors.statusDotDisputed
      : colors.statusDotPending;

  const statusLabel = (status: StatusType) =>
    status === 'verified' ? 'Verified' : status === 'disputed' ? 'Disputed' : 'Pending';

  const verifiedCount = places.filter((p) => p.status === 'verified').length;
  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const totalConfirms = places.reduce((acc, p) => acc + p.confirmCount, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* App Top Header Bar */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
        <View style={styles.userInfoRow}>
          <Image source={{ uri: userProfile.avatar }} style={[styles.avatar, { borderColor: colors.accent }]} />
          <View>
            <Text style={[styles.greetingText, { color: colors.textMuted }]}>Welcome back 👋</Text>
            <Text style={[styles.userNameText, { color: colors.textPrimary }]}>{userProfile.name}</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          {/* Quick Theme Mode Toggle Button */}
          <TouchableOpacity
            style={[
              styles.themeToggleBtn,
              { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${isDark ? 'Light' : 'Dark'} theme`}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={15}
              color={isDark ? '#F59E0B' : '#0284C7'}
            />
            <Text style={[styles.themeToggleText, { color: colors.textPrimary }]}>
              {isDark ? 'Light' : 'Dark'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.profileBadgeBtn, { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
            onPress={() => router.push('/profile' as any)}
            accessibilityRole="button"
            accessibilityLabel="View profile"
          >
            <Ionicons name="ribbon-outline" size={15} color={colors.accent} />
            <Text style={[styles.profileBadgeText, { color: colors.accent }]}>Member</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Hero Card Banner */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.heroContent}>
            <View style={[styles.heroTag, { backgroundColor: colors.accentBg }]}>
              <Ionicons name="sparkles" size={13} color={colors.accent} />
              <Text style={[styles.heroTagText, { color: colors.accent }]}>WHERE ACCESSIBILITY MEETS FREEDOM</Text>
            </View>

            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              Your easiest path, every day.
            </Text>

            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Discover verified ramps, step-free entrances, and accessible restrooms so you can navigate every public space with total confidence.
            </Text>

            <View style={styles.heroButtonRow}>
              <TouchableOpacity
                style={[styles.heroCTA, { backgroundColor: colors.accent }]}
                onPress={() => router.push('/map' as any)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Explore Interactive Map"
              >
                <Text style={styles.heroCTAText}>Explore Map</Text>
                <View style={styles.heroArrowCircle}>
                  <Ionicons name="arrow-forward" size={13} color={colors.accent} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.heroSecondaryCTA, { backgroundColor: colors.secondaryButtonBg, borderColor: colors.secondaryButtonBorder }]}
                onPress={() => router.push('/assistant' as any)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Open AI Assistant"
              >
                <Ionicons name="sparkles" size={14} color={colors.accent} />
                <Text style={[styles.heroSecondaryText, { color: colors.secondaryButtonText }]}>AI Assistant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Triple Stat Card — Inspired by the Reference Design */}
        <View
          style={[
            styles.tripleStatsCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.tripleStatCol}>
            <Ionicons name="sparkles-outline" size={18} color="#C2A482" />
            <Text style={[styles.tripleStatValue, { color: colors.textPrimary }]}>{verifiedCount}+</Text>
            <Text style={[styles.tripleStatLabel, { color: colors.textMuted }]}>Verified Places</Text>
          </View>

          <View style={[styles.tripleStatDivider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.tripleStatCol}>
            <MaterialCommunityIcons name="wheelchair" size={20} color={colors.accent} />
            <Text style={[styles.tripleStatValue, { color: colors.textPrimary }]}>{totalConfirms}+</Text>
            <Text style={[styles.tripleStatLabel, { color: colors.textMuted }]}>Confirms</Text>
          </View>

          <View style={[styles.tripleStatDivider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.tripleStatCol}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.statusDotVerified} />
            <Text style={[styles.tripleStatValue, { color: colors.textPrimary }]}>{pendingCount > 0 ? pendingCount : places.length}</Text>
            <Text style={[styles.tripleStatLabel, { color: colors.textMuted }]}>Audited Spots</Text>
          </View>
        </View>

        {/* Quick Action Shortcut Buttons */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="flash-outline" size={14} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            QUICK ACTIONS
          </Text>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[
              styles.actionCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => router.push('/map' as any)}
            activeOpacity={0.82}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accentBg }]}>
              <Ionicons name="map-outline" size={22} color={colors.accent} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Discover Map</Text>
            <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
              Find step-free routes & color-coded pins
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => router.push('/report' as any)}
            activeOpacity={0.82}
          >
            <View style={[styles.actionIcon, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="add-circle-outline" size={22} color="#059669" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Submit Audit</Text>
            <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
              Log a venue ramp, elevator or restroom
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => router.push('/verify' as any)}
            activeOpacity={0.82}
          >
            <View style={[styles.actionIcon, { backgroundColor: isDark ? '#78350F' : '#FFFBEB' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#D97706" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Verify Queue</Text>
            <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
              Confirm or dispute community reports
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => setSavedModalOpen(true)}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Saved Places, ${savedPlaces.length} locations saved`}
          >
            <View style={[styles.actionIcon, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Ionicons name="bookmark-outline" size={22} color={colors.textSecondary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Saved Places</Text>
            <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
              {savedPlaces.length > 0
                ? `${savedPlaces.length} place${savedPlaces.length === 1 ? '' : 's'} saved for quick access`
                : 'Places you save appear here'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Community Activity Stream */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="time-outline" size={14} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            RECENT COMMUNITY AUDITS
          </Text>
        </View>

        <View style={styles.activityList}>
          {reports.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.activityCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
              onPress={() => router.push('/verify' as any)}
              activeOpacity={0.85}
            >
              <SafeActivityImage uri={item.photos[0]} seed={item.id} style={styles.activityImage} />
              <View style={styles.activityInfo}>
                <Text style={[styles.activityPlace, { color: colors.textPrimary }]}>{item.placeName}</Text>
                <Text style={[styles.activityNote, { color: colors.textSecondary }]} numberOfLines={2}>
                  &ldquo;{item.note}&rdquo;
                </Text>
                <View style={styles.activityMetaRow}>
                  <Text style={[styles.activitySubmitter, { color: colors.textMuted }]}>By {item.submitterName}</Text>
                  <Text style={[styles.activityTime, { color: colors.textMuted }]}>• {item.timestamp}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Community Tip Card */}
        <View
          style={[
            styles.tipCard,
            {
              backgroundColor: isDark ? '#1F2937' : '#FFFBEB',
              borderColor: isDark ? '#374151' : '#FDE68A',
            },
          ]}
        >
          <MaterialCommunityIcons name="lightbulb-on" size={24} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
              Accessibility Pro-Tip
            </Text>
            <Text style={[styles.tipText, { color: isDark ? '#CBD5E1' : '#78350F' }]}>
              Ramp slopes should ideally not exceed 1:12 (8.3% grade) for safe manual wheelchair navigation. Always note automatic door status when submitting an audit!
            </Text>
          </View>
        </View>

        {/* Luxury Signature Accessibility Strip (Mirroring the Reference Image Bottom Strip) */}
        <View
          style={[
            styles.featuresStrip,
            { backgroundColor: colors.accentBg, borderColor: colors.ruleBannerBorder },
          ]}
        >
          <View style={styles.stripItem}>
            <MaterialCommunityIcons name="wheelchair" size={16} color={colors.accent} />
            <Text style={[styles.stripItemText, { color: colors.textSecondary }]}>Step-Free</Text>
          </View>
          <View style={styles.stripItem}>
            <MaterialCommunityIcons name="elevator-passenger" size={16} color={colors.accent} />
            <Text style={[styles.stripItemText, { color: colors.textSecondary }]}>Elevators</Text>
          </View>
          <View style={styles.stripItem}>
            <MaterialCommunityIcons name="human-handsdown" size={16} color={colors.accent} />
            <Text style={[styles.stripItemText, { color: colors.textSecondary }]}>Restrooms</Text>
          </View>
          <View style={styles.stripItem}>
            <MaterialCommunityIcons name="dots-grid" size={16} color={colors.accent} />
            <Text style={[styles.stripItemText, { color: colors.textSecondary }]}>Tactile Paths</Text>
          </View>
        </View>
      </ScrollView>

      {/* Saved Places — visible to everyone, no login required */}
      <Modal
        visible={savedModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSavedModalOpen(false)}
      >
        <View style={styles.savedOverlay}>
          <View style={[styles.savedPanel, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.savedHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[styles.savedTitle, { color: colors.textPrimary }]}>
                Saved Places ({savedPlaces.length})
              </Text>
              <TouchableOpacity
                onPress={() => setSavedModalOpen(false)}
                style={[styles.savedCloseBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                accessibilityRole="button"
                accessibilityLabel="Close Saved Places"
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {savedPlaces.length === 0 ? (
              <View style={styles.savedEmpty}>
                <Ionicons name="bookmark-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.savedEmptyTitle, { color: colors.textPrimary }]}>
                  No Saved Places Yet
                </Text>
                <Text style={[styles.savedEmptyText, { color: colors.textMuted }]}>
                  Tap the bookmark on any place and it will show up here.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSavedModalOpen(false);
                    router.push('/map' as any);
                  }}
                  style={[styles.savedBrowseBtn, { backgroundColor: colors.accent }]}
                  accessibilityRole="button"
                  accessibilityLabel="Browse places on the map"
                >
                  <Text style={styles.savedBrowseBtnText}>Browse Places</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.savedList}>
                {savedPlaces.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    style={[styles.savedRow, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                    onPress={() => setDetailPlace(place)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`${place.name}, ${statusLabel(place.status)}`}
                  >
                    <SafeActivityImage
                      uri={place.photos[0]}
                      seed={place.id}
                      style={styles.savedRowImage}
                    />
                    <View style={styles.savedRowInfo}>
                      <Text style={[styles.savedRowName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {place.name}
                      </Text>
                      <Text style={[styles.savedRowAddress, { color: colors.textMuted }]} numberOfLines={1}>
                        {place.address}
                      </Text>
                      <View style={styles.savedRowStatus}>
                        <View
                          style={[styles.savedStatusDot, { backgroundColor: statusDotColor(place.status) }]}
                        />
                        <Text style={[styles.savedStatusLabel, { color: statusDotColor(place.status) }]}>
                          {statusLabel(place.status)}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <PlaceDetailsModal
        place={detailPlace}
        visible={!!detailPlace}
        onClose={() => setDetailPlace(null)}
        onToggleSave={toggleSavePlace}
        onReportUpdate={() => setDetailPlace(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profileBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#2D2327',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  heroContent: {},
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  heroButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  heroCTAText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  heroArrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSecondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  heroSecondaryText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  tripleStatsCard: {
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 18,
    shadowColor: '#2D2327',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tripleStatCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripleStatValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  tripleStatLabel: {
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '600',
  },
  tripleStatDivider: {
    width: 1,
    height: 36,
  },
  featuresStrip: {
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 16,
  },
  stripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stripItemText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    width: '48%',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 2,
  },
  activityList: {
    gap: 10,
    marginBottom: 16,
  },
  activityCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  activityImage: {
    width: 62,
    height: 62,
    borderRadius: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityPlace: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  activityNote: {
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 2,
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  activitySubmitter: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 10.5,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  tipText: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  },
  savedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  savedPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  savedTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  savedCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedList: {
    padding: 16,
    gap: 12,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  savedRowImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  savedRowInfo: {
    flex: 1,
    gap: 2,
  },
  savedRowName: {
    fontSize: 14,
    fontWeight: '700',
  },
  savedRowAddress: {
    fontSize: 12,
  },
  savedRowStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  savedStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  savedStatusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  savedEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  savedEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  savedEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  savedBrowseBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  savedBrowseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
