import { DisabilityTypeDropdown } from '@/components/DisabilityTypeDropdown';
import { EditProfileModal } from '@/components/EditProfileModal';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { DEFAULT_ROLE_LABEL, ROLE_LABELS } from '@/constants/profile';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { requestAccountExport, sendSavedPlaceAlert } from '@/features/notifications/actions';
import { Place, StatusType } from '@/types/accessibility';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    userProfile,
    updateUserProfile,
    places,
    toggleSavePlace,
    notifications,
    clearNotifications,
    markNotificationsRead,
    signOut,
    userId,
  } = useApp();
  const { colors, isDark, toggleTheme } = useAppTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'saved' | 'notifications'>('profile');
  const [selectedPlaceModal, setSelectedPlaceModal] = useState<Place | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const savedPlaces = places.filter((p) => p.saved);

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return colors.statusDotVerified;
      case 'disputed':
        return colors.statusDotDisputed;
      case 'pending':
      default:
        return colors.statusDotPending;
    }
  };

  const togglePreference = (key: keyof typeof userProfile.preferences) => {
    updateUserProfile({
      preferences: {
        ...userProfile.preferences,
        [key]: !userProfile.preferences[key],
      },
    });
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  // Tier 2: emergency push to every device registered on this account.
  const handleEmergencyAlert = async () => {
    if (!userId) {
      showToast('Sign in to send an alert.', 'warning');
      return;
    }
    const ok = await sendSavedPlaceAlert(userId, userProfile.email);
    showToast(
      ok ? 'Emergency alert sent to your devices and email.' : 'Could not send the alert. Try again.',
      ok ? 'success' : 'error'
    );
  };

  // Tier 3: email yourself a copy of saved places + profile data.
  const handleExportData = async () => {
    if (!userId) {
      showToast('Sign in to export your data.', 'warning');
      return;
    }
    const ok = await requestAccountExport(userId, userProfile.email, places.filter((p) => p.saved));
    showToast(
      ok ? 'Export email sent — check your inbox.' : 'Could not queue the export email.',
      ok ? 'success' : 'error'
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder, paddingTop: insets.top + 16 }]}>
        <Image source={{ uri: userProfile.avatar }} style={[styles.avatar, { borderColor: colors.accent }]} />
        <View style={styles.headerInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{userProfile.name}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{userProfile.email}</Text>            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: colors.stepBadgeBg }]}>
                <Ionicons name="ribbon" size={12} color={colors.accentLight} />
                <Text style={[styles.roleBadgeText, { color: colors.stepBadgeText }]}>
                  {ROLE_LABELS[userProfile.role || ''] || DEFAULT_ROLE_LABEL}
                </Text>
              </View>
              <TouchableOpacity style={[styles.editBadgeBtn, { backgroundColor: colors.accentBg }]}
                onPress={() => setEditModalVisible(true)}>
                <Ionicons name="create-outline" size={12} color={colors.accentLight} />
                <Text style={[styles.editBadgeText, { color: colors.accentLight }]}>Edit</Text>
              </TouchableOpacity>
            </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutHeaderBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutHeaderText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.sessionCardRow}>
          <View style={[styles.sessionBadge, { backgroundColor: colors.sessionBadgeBg, borderColor: colors.sessionBadgeBorder }]}>
            <Ionicons name="lock-closed" size={14} color={colors.sessionBadgeText} />
            <Text style={[styles.sessionBadgeText, { color: colors.sessionBadgeText }]}>Local frontend account</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.sosPrimaryButton, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}
          onPress={handleEmergencyAlert}
          activeOpacity={0.9}
        >
          <View style={[styles.sosPrimaryIcon, { backgroundColor: colors.error + '22' }]}>
            <Ionicons name="warning" size={22} color={colors.error} />
          </View>
          <View style={styles.sosPrimaryTextWrap}>
            <Text style={[styles.sosPrimaryTitle, { color: colors.error }]}>SOS</Text>
            <Text style={[styles.sosPrimarySub, { color: colors.textSecondary }]}>
              Send emergency alert + email notification
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.sessionText, { color: colors.textSecondary }]}>
          Your profile, saved places, and reports are stored on this device only.
        </Text>
      </View>

      {/* Theme Toggle Row */}
      <View style={[styles.themeToggleRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.themeToggleLeft}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.accent} />
          <Text style={[styles.themeToggleLabel, { color: colors.textPrimary }]}>Appearance</Text>
        </View>
        <TouchableOpacity
          style={[styles.themeToggleBtn, { backgroundColor: isDark ? colors.accent : colors.chipBg, borderColor: colors.accent }]}
          onPress={toggleTheme}
        >
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={16} color={isDark ? '#FFF' : colors.accent} />
          <Text style={[styles.themeToggleBtnText, { color: isDark ? '#FFF' : colors.accent }]}>
            {isDark ? 'Dark' : 'Light'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-Navigation Segment Tabs */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, { backgroundColor: colors.segmentInactiveBg }, activeTab === 'profile' && { backgroundColor: colors.segmentActiveBg }]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons name="person" size={14} color={activeTab === 'profile' ? colors.filterActiveText : colors.textSecondary} />
          <Text style={[styles.segmentText, { color: activeTab === 'profile' ? colors.filterActiveText : colors.textSecondary }]}>
            Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, { backgroundColor: colors.segmentInactiveBg }, activeTab === 'saved' && { backgroundColor: colors.segmentActiveBg }]}
          onPress={() => setActiveTab('saved')}
        >
          <Ionicons name="bookmark" size={14} color={activeTab === 'saved' ? colors.filterActiveText : colors.textSecondary} />
          <Text style={[styles.segmentText, { color: activeTab === 'saved' ? colors.filterActiveText : colors.textSecondary }]}>
            Saved ({savedPlaces.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, { backgroundColor: colors.segmentInactiveBg }, activeTab === 'notifications' && { backgroundColor: colors.segmentActiveBg }]}
          onPress={() => setActiveTab('notifications')}
        >
          <Ionicons name="notifications" size={14} color={activeTab === 'notifications' ? colors.filterActiveText : colors.textSecondary} />
          <Text style={[styles.segmentText, { color: activeTab === 'notifications' ? colors.filterActiveText : colors.textSecondary }]}>
            Alerts ({notifications.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Tab 1: Profile & Preferences */}
        {activeTab === 'profile' && (
          <View style={styles.tabContent}>
            {/* Tier 2: Emergency alert — kept at the TOP so it's always visible */}
            <TouchableOpacity
              style={[styles.sosBtn, { borderColor: colors.errorBorder, backgroundColor: colors.errorBg }]}
              onPress={handleEmergencyAlert}
              activeOpacity={0.85}
            >
              <View style={[styles.sosIconBox, { backgroundColor: colors.error + '22' }]}>
                <Ionicons name="warning" size={22} color={colors.error} />
              </View>
              <View style={styles.sosTextWrap}>
                <Text style={[styles.sosTitle, { color: colors.error }]}>Send Emergency Alert</Text>
                <Text style={[styles.sosSub, { color: colors.textSecondary }]}>
                  Instant device alert + Inbox message — reports a barrier needing urgent help.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.cardSection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextGroup}>
                  <View style={styles.iconTitleRow}>
                    <Ionicons name="accessibility" size={18} color={colors.accent} />
                    <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>Disability Status</Text>
                  </View>
                  <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>
                    Enables tailored step-free & accessible navigation alerts
                  </Text>
                </View>
                <Switch
                  value={userProfile.hasDisability}
                  onValueChange={(val) => updateUserProfile({ hasDisability: val })}
                  trackColor={{ false: colors.toggleTrack, true: colors.accent }}
                  thumbColor={userProfile.hasDisability ? colors.accentLight : colors.toggleThumb}
                />
              </View>

              {userProfile.hasDisability && (
                <View style={[styles.disabilityTypeBox, { backgroundColor: colors.chipBg }]}>
                  <Text style={[styles.disabilityTypeLabel, { color: colors.textSecondary }]}>
                    Disability Type / Mobility Note (tap to change):
                  </Text>
                  <DisabilityTypeDropdown
                    value={userProfile.disabilityType}
                    onChange={(type) => updateUserProfile({ disabilityType: type })}
                  />
                </View>
              )}
            </View>

            <View style={[styles.cardSection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>ACCESSIBILITY PREFERENCES</Text>
              <View style={styles.prefList}>
                <View style={[styles.prefRow, { borderBottomColor: colors.divider }]}>
                  <View style={styles.prefLeft}>
                    <MaterialCommunityIcons name="wheelchair" size={18} color={colors.statusDotVerified} />
                    <Text style={[styles.prefText, { color: colors.textPrimary }]}>Require Wheelchair Ramp</Text>
                  </View>
                  <Switch value={userProfile.preferences.requireRamp} onValueChange={() => togglePreference('requireRamp')} trackColor={{ false: colors.toggleTrack, true: colors.success }} />
                </View>

                <View style={[styles.prefRow, { borderBottomColor: colors.divider }]}>
                  <View style={styles.prefLeft}>
                    <MaterialCommunityIcons name="elevator-passenger" size={18} color={colors.statusDotVerified} />
                    <Text style={[styles.prefText, { color: colors.textPrimary }]}>Require Elevator Access</Text>
                  </View>
                  <Switch value={userProfile.preferences.requireElevator} onValueChange={() => togglePreference('requireElevator')} trackColor={{ false: colors.toggleTrack, true: colors.success }} />
                </View>

                <View style={[styles.prefRow, { borderBottomColor: colors.divider }]}>
                  <View style={styles.prefLeft}>
                    <MaterialCommunityIcons name="human-handsdown" size={18} color={colors.statusDotVerified} />
                    <Text style={[styles.prefText, { color: colors.textPrimary }]}>Require Accessible Restroom</Text>
                  </View>
                  <Switch value={userProfile.preferences.requireAccessibleToilet} onValueChange={() => togglePreference('requireAccessibleToilet')} trackColor={{ false: colors.toggleTrack, true: colors.success }} />
                </View>

                <View style={styles.prefRow}>
                  <View style={styles.prefLeft}>
                    <MaterialCommunityIcons name="walk" size={18} color={colors.statusDotVerified} />
                    <Text style={[styles.prefText, { color: colors.textPrimary }]}>Require Step-Free Entrance</Text>
                  </View>
                  <Switch value={userProfile.preferences.requireStepFree} onValueChange={() => togglePreference('requireStepFree')} trackColor={{ false: colors.toggleTrack, true: colors.success }} />
                </View>
              </View>
            </View>

            {/* Tier 3: Email data export */}
            <TouchableOpacity
              style={[styles.sosBtn, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
              onPress={handleExportData}
              activeOpacity={0.85}
            >
              <Ionicons name="mail-outline" size={20} color={colors.accent} />
              <View style={styles.sosTextWrap}>
                <Text style={[styles.sosTitle, { color: colors.textPrimary }]}>Email My Data Export</Text>
                <Text style={[styles.sosSub, { color: colors.textSecondary }]}>
                  Sends saved places & profile summary to your email.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Bottom Sign Out Card */}
            <TouchableOpacity style={styles.bottomSignOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.bottomSignOutText}>Sign Out of Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 2: Saved Places */}
        {activeTab === 'saved' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>SAVED PLACES ({savedPlaces.length})</Text>

            {savedPlaces.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="bookmark-outline" size={36} color={colors.emptyIcon} />
                <Text style={[styles.emptyTitle, { color: colors.emptyTitle }]}>No Saved Places Yet</Text>
                <Text style={[styles.emptySubtext, { color: colors.emptySubtext }]}>
                  Tap the Save button on any place card on the Map screen to save locations here.
                </Text>
              </View>
            ) : (
              savedPlaces.map((place) => {
                const statusColor = getStatusColor(place.status);
                return (
                  <TouchableOpacity
                    key={place.id}
                    style={[styles.savedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => setSelectedPlaceModal(place)}
                  >
                    <Image source={{ uri: place.photos[0] }} style={styles.savedImage} />
                    <View style={styles.savedCardInfo}>
                      <Text style={[styles.savedName, { color: colors.textPrimary }]}>{place.name}</Text>
                      <Text style={[styles.savedAddress, { color: colors.textSecondary }]}>{place.address}</Text>

                      <View style={styles.savedStatusRow}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusTagText, { color: statusColor }]}>
                          {place.status.toUpperCase()}
                        </Text>
                        <Text style={[styles.savedConfirms, { color: colors.textMuted }]}>
                          ({place.confirmCount} confirms · {place.disputeCount} disputes)
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.removeSavedBtn}
                      onPress={() => toggleSavePlace(place.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Tab 3: Notifications — moved to the dedicated Inbox tab */}
        {activeTab === 'notifications' && (
          <View style={styles.tabContent}>
            <View style={[styles.inboxRedirectCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.inboxRedirectIcon, { backgroundColor: colors.accentBg }]}>
                <Ionicons name="notifications" size={22} color={colors.accent} />
              </View>
              <View style={styles.inboxRedirectText}>
                <Text style={[styles.inboxRedirectTitle, { color: colors.textPrimary }]}>Notifications have moved</Text>
                <Text style={[styles.inboxRedirectSub, { color: colors.textSecondary }]}>
                  Visit the Inbox tab in the bottom navigation for real-time updates.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.inboxRedirectBtn, { backgroundColor: colors.accent }]}
                onPress={() => router.push('/inbox' as any)}
              >
                <Text style={styles.inboxRedirectBtnText}>Open</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <EditProfileModal visible={editModalVisible} onClose={() => setEditModalVisible(false)} />

      <PlaceDetailsModal
        place={selectedPlaceModal}
        visible={!!selectedPlaceModal}
        onClose={() => setSelectedPlaceModal(null)}
        onToggleSave={toggleSavePlace}
        onReportUpdate={() => {
          setSelectedPlaceModal(null);
          router.push('/report' as any);
        }}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
  },
  headerInfo: {
    flex: 1,
  },
  sessionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  sessionCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sosPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  sosPrimaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosPrimaryTextWrap: {
    flex: 1,
  },
  sosPrimaryTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sosPrimarySub: {
    fontSize: 11,
    marginTop: 2,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    flexShrink: 1,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sessionText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  signOutBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  editBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  editBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  themeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeToggleLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  tabContent: {
    gap: 14,
  },
  cardSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  disabilityTypeBox: {
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  disabilityTypeLabel: {
    fontSize: 11,
  },
  disabilityTypeValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  prefList: {
    gap: 8,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prefText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  sosIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTextWrap: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  sosSub: {
    fontSize: 11,
    marginTop: 2,
  },
  bottomSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 20,
  },
  bottomSignOutText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  savedCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  savedImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  savedCardInfo: {
    flex: 1,
  },
  savedName: {
    fontSize: 14,
    fontWeight: '700',
  },
  savedAddress: {
    fontSize: 11,
    marginTop: 2,
  },
  savedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  savedConfirms: {
    fontSize: 10,
  },
  removeSavedBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 4,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inboxRedirectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  inboxRedirectIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxRedirectText: {
    flex: 1,
  },
  inboxRedirectTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  inboxRedirectSub: {
    fontSize: 11,
    marginTop: 2,
  },
  inboxRedirectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  inboxRedirectBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  notifCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  notifIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifTextContainer: {
    flex: 1,
  },
  notifMessage: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  notifTimestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  signOutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  signOutHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
