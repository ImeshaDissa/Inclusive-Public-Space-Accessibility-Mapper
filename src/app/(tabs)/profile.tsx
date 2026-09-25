import { DisabilityTypeDropdown } from '@/components/DisabilityTypeDropdown';
import { EditProfileModal } from '@/components/EditProfileModal';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { ProfileBackground } from '@/components/profile/ProfileBackground';
import { DEFAULT_ROLE_LABEL, ROLE_LABELS } from '@/constants/profile';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { requestAccountExport, sendSavedPlaceAlert } from '@/features/notifications/actions';
import { Place, StatusType } from '@/types/accessibility';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ProfileMenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  isDestructive?: boolean;
  badgeCount?: number;
  rightElement?: React.ReactNode;
}

export function ProfileMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  isDestructive = false,
  badgeCount,
  rightElement,
}: ProfileMenuItemProps) {
  const { colors } = useAppTheme();
  const [pressed, setPressed] = useState(false);

  const iconColor = isDestructive ? colors.error : colors.accent;
  const iconBg = isDestructive ? colors.errorBg : colors.accentBg;
  const titleColor = isDestructive ? colors.error : colors.textPrimary;

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        {
          backgroundColor: pressed ? colors.chipBg : colors.card,
          borderBottomColor: colors.cardBorder,
        },
        pressed && styles.menuItemPressed,
      ]}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      activeOpacity={0.72}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: pressed }}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <View style={styles.menuTextGroup}>
          <Text style={[styles.menuTitle, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.menuItemRight}>
        {badgeCount !== undefined && badgeCount > 0 ? (
          <View style={[styles.badgeContainer, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        ) : null}
        {rightElement ?? (
          <View style={[styles.chevronChip, { backgroundColor: colors.chipBg }]}>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    userProfile,
    updateUserProfile,
    places,
    toggleSavePlace,
    signOut,
    userId,
  } = useApp();
  const { colors, isDark, toggleTheme } = useAppTheme();

  const [activeModal, setActiveModal] = useState<'saved' | 'preferences' | 'help' | null>(null);
  const [selectedPlaceModal, setSelectedPlaceModal] = useState<Place | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [sosPressed, setSosPressed] = useState(false);
  const [signOutPressed, setSignOutPressed] = useState(false);

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

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEmergencyAlert = async () => {
    if (!userId) {
      showToast('Sign in to send an alert.', 'warning');
      return;
    }
    const result = await sendSavedPlaceAlert(userId, userProfile.email);
    const emailAttempted = result.emailOk !== undefined;
    if (result.ok && (!emailAttempted || result.emailOk)) {
      showToast('Emergency alert sent to your devices and email.', 'success');
    } else if (result.ok && emailAttempted) {
      showToast(`Alert on device, but email failed: ${result.detail ?? 'unknown error'}`, 'error');
    } else if (result.detail) {
      showToast(`Alert problem: ${result.detail}`, 'error');
    } else {
      showToast('Could not send the alert. Try again.', 'error');
    }
  };

  const handleExportData = async () => {
    if (!userId) {
      showToast('Sign in to export your data.', 'warning');
      return;
    }
    const result = await requestAccountExport(userId, userProfile.email, places.filter((p) => p.saved));
    if (result.ok) {
      showToast('Export email sent — check your inbox.', 'success');
    } else {
      showToast(`Export failed: ${result.detail ?? 'unknown error'}`, 'error');
    }
  };

  const roleLabel = ROLE_LABELS[userProfile.role || ''] || DEFAULT_ROLE_LABEL;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ProfileBackground theme={isDark ? 'dark' : 'light'} />

      <SafeAreaView style={styles.safeOverlay} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 12, paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ========== HEADER: avatar + identity, cleanly aligned ========== */}
        <View
          style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          accessible
          accessibilityRole="header"
          accessibilityLabel={`Profile for ${userProfile.name}`}
        >
          <View style={styles.headerTopRow}>
            <View style={[styles.avatarRing, { borderColor: colors.accent }]}>
              {userProfile.avatar ? (
                <Image source={{ uri: userProfile.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarFallback, { backgroundColor: colors.accentBg }]}>
                  <Ionicons name="person" size={32} color={colors.accent} />
                </View>
              )}
            </View>

            <View style={styles.headerIdentity}>
              <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                {userProfile.name}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="middle">
                {userProfile.email}
              </Text>
              <View style={styles.headerBadgeRow}>
                <View style={[styles.roleBadge, { backgroundColor: colors.accentBg }]}>
                  <Ionicons name="ribbon" size={12} color={colors.accent} />
                  <Text style={[styles.roleBadgeText, { color: colors.accent }]} numberOfLines={1}>
                    {roleLabel}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.editChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                  onPress={() => setEditModalVisible(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                >
                  <Ionicons name="create-outline" size={14} color={colors.textPrimary} />
                  <Text style={[styles.editChipText, { color: colors.textPrimary }]}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.signOutHeaderBtn,
              {
                backgroundColor: signOutPressed ? colors.errorBorder : colors.signOutBg,
                borderColor: colors.signOutBorder,
              },
            ]}
            onPress={handleSignOut}
            onPressIn={() => setSignOutPressed(true)}
            onPressOut={() => setSignOutPressed(false)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={16} color={colors.signOutText} />
            <Text style={[styles.signOutHeaderText, { color: colors.signOutText }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ========== ACCOUNT MENU ========== */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>ACCOUNT & PREFERENCES</Text>
          <View
            style={[
              styles.menuGroup,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <ProfileMenuItem
              icon="bookmark"
              title="Saved Places"
              subtitle={`${savedPlaces.length} locations saved`}
              badgeCount={savedPlaces.length}
              onPress={() => setActiveModal('saved')}
              accessibilityLabel={`Saved Places, ${savedPlaces.length} locations saved`}
              accessibilityHint="Tap to view and manage your saved accessible places"
            />

            <ProfileMenuItem
              icon="person-circle-outline"
              title="Account Settings"
              subtitle="Edit profile details, role & contact info"
              onPress={() => setEditModalVisible(true)}
              accessibilityLabel="Account Settings"
              accessibilityHint="Tap to edit your personal profile and account details"
            />

            <ProfileMenuItem
              icon="accessibility"
              title="Accessibility Preferences"
              subtitle="Wheelchair ramp, elevator & toilet preferences"
              onPress={() => setActiveModal('preferences')}
              accessibilityLabel="Accessibility Preferences"
              accessibilityHint="Tap to customize disability status and accessibility requirements"
            />

            <ProfileMenuItem
              icon="help-buoy-outline"
              title="Help & Support"
              subtitle="Data export, app info & assistance"
              onPress={() => setActiveModal('help')}
              accessibilityLabel="Help and Support"
              accessibilityHint="Tap to access data export and app information"
            />

            <ProfileMenuItem
              icon={isDark ? 'moon' : 'sunny'}
              title="Appearance Mode"
              subtitle={isDark ? 'Dark mode active' : 'Light mode active'}
              onPress={toggleTheme}
              accessibilityLabel={`Appearance mode, currently ${isDark ? 'Dark' : 'Light'} mode`}
              accessibilityHint="Tap to switch between light and dark themes"
              rightElement={
                <View style={[styles.themeBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.themeBadgeText}>{isDark ? 'Dark' : 'Light'}</Text>
                </View>
              }
            />
          </View>
        </View>

        {/* ========== SINGLE SOS — sits lower so the top stays calm ========== */}
        <View style={styles.sosSection}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>EMERGENCY</Text>
          <TouchableOpacity
            style={[
              styles.sosButton,
              {
                backgroundColor: sosPressed ? colors.errorBorder : colors.errorBg,
                borderColor: colors.errorBorder,
                shadowColor: colors.error,
              },
            ]}
            onPress={handleEmergencyAlert}
            onPressIn={() => setSosPressed(true)}
            onPressOut={() => setSosPressed(false)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Emergency SOS"
            accessibilityHint="Sends an alert to your devices and email"
          >
            <View style={[styles.sosIconCircle, { backgroundColor: colors.error + '22' }]}>
              <Ionicons name="warning" size={26} color={colors.error} />
            </View>
            <View style={styles.sosTextWrap}>
              <Text style={[styles.sosTitle, { color: colors.error }]}>Emergency SOS</Text>
              <Text style={[styles.sosSub, { color: colors.textSecondary }]}>
                Device alert + inbox + email in one tap
              </Text>
            </View>
            <View style={[styles.sosChevron, { backgroundColor: colors.error + '18' }]}>
              <Ionicons name="arrow-forward" size={18} color={colors.error} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.sosHint, { color: colors.textMuted }]}>
            Use only when you need urgent help at a barrier or inaccessible entrance.
          </Text>
        </View>

        {/* ========== BOTTOM SIGN OUT ========== */}
        <TouchableOpacity
          style={[
            styles.bottomSignOutBtn,
            {
              backgroundColor: signOutPressed ? colors.errorBorder : colors.signOutBg,
              borderColor: colors.signOutBorder,
            },
          ]}
          onPress={handleSignOut}
          onPressIn={() => setSignOutPressed(true)}
          onPressOut={() => setSignOutPressed(false)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Sign out of account"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.signOutText} />
          <Text style={[styles.bottomSignOutText, { color: colors.signOutText }]}>
            Sign Out of Account
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL: Saved Places */}
      <Modal
        visible={activeModal === 'saved'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Saved Places ({savedPlaces.length})
            </Text>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.chipBg }]}
              onPress={() => setActiveModal(null)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close Saved Places"
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {savedPlaces.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bookmark-outline" size={48} color={colors.emptyIcon} />
                <Text style={[styles.emptyTitle, { color: colors.emptyTitle }]}>No Saved Places Yet</Text>
                <Text style={[styles.emptySubtext, { color: colors.emptySubtext }]}>
                  Tap Save on any place card on the Map to collect accessible locations here.
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
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    accessibilityLabel={`${place.name}, status ${place.status}`}
                  >
                    <Image source={{ uri: place.photos[0] }} style={styles.savedImage} />
                    <View style={styles.savedCardInfo}>
                      <Text style={[styles.savedName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {place.name}
                      </Text>
                      <Text style={[styles.savedAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                        {place.address}
                      </Text>
                      <View style={styles.savedStatusRow}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusTagText, { color: statusColor }]}>
                          {place.status.toUpperCase()}
                        </Text>
                        <Text style={[styles.savedConfirms, { color: colors.textMuted }]}>
                          ({place.confirmCount} ✓ · {place.disputeCount} ✕)
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.removeSavedBtn, { backgroundColor: colors.errorBg }]}
                      onPress={() => toggleSavePlace(place.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${place.name}`}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL: Accessibility Preferences */}
      <Modal
        visible={activeModal === 'preferences'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Accessibility Preferences</Text>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.chipBg }]}
              onPress={() => setActiveModal(null)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close Accessibility Preferences"
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.preferenceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextGroup}>
                  <Text style={[styles.prefCardTitle, { color: colors.textPrimary }]}>Disability Status</Text>
                  <Text style={[styles.prefCardSubtext, { color: colors.textSecondary }]}>
                    Enables tailored step-free & accessible navigation alerts
                  </Text>
                </View>
                <Switch
                  value={userProfile.hasDisability}
                  onValueChange={(val) => updateUserProfile({ hasDisability: val })}
                  trackColor={{ false: colors.toggleTrack, true: colors.accent }}
                  thumbColor={colors.toggleThumb}
                  accessibilityLabel="Disability Status"
                />
              </View>

              {userProfile.hasDisability && (
                <View style={[styles.disabilityTypeBox, { backgroundColor: colors.chipBg }]}>
                  <Text style={[styles.disabilityTypeLabel, { color: colors.textSecondary }]}>
                    Disability Type / Mobility Note:
                  </Text>
                  <DisabilityTypeDropdown
                    value={userProfile.disabilityType}
                    onChange={(type) => updateUserProfile({ disabilityType: type })}
                  />
                </View>
              )}
            </View>

            <View style={[styles.preferenceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.prefCardHeader, { color: colors.textMuted }]}>SPECIFIC REQUIREMENTS</Text>

              {(
                [
                  { key: 'requireRamp', label: 'Require Wheelchair Ramp', icon: 'accessibility-outline' },
                  { key: 'requireElevator', label: 'Require Elevator Access', icon: 'hardware-chip-outline' },
                  { key: 'requireAccessibleToilet', label: 'Require Accessible Restroom', icon: 'man-outline' },
                  { key: 'requireStepFree', label: 'Require Step-Free Entrance', icon: 'walk-outline' },
                ] as const
              ).map((row, index, arr) => (
                <View
                  key={row.key}
                  style={[
                    styles.prefRow,
                    { borderBottomColor: colors.cardBorder },
                    index === arr.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.prefLeft}>
                    <Ionicons name={row.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.accent} />
                    <Text style={[styles.prefText, { color: colors.textPrimary }]}>{row.label}</Text>
                  </View>
                  <Switch
                    value={userProfile.preferences[row.key]}
                    onValueChange={() => togglePreference(row.key)}
                    trackColor={{ false: colors.toggleTrack, true: colors.success }}
                    thumbColor={colors.toggleThumb}
                    accessibilityLabel={row.label}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL: Help — export only; SOS lives on the main page (no duplicate) */}
      <Modal
        visible={activeModal === 'help'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Help & Support</Text>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.chipBg }]}
              onPress={() => setActiveModal(null)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close Help and Support"
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={handleExportData}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel="Email My Data Export"
            >
              <View style={[styles.actionIconBox, { backgroundColor: colors.accentBg }]}>
                <Ionicons name="mail-outline" size={24} color={colors.accent} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Email My Data Export</Text>
                <Text style={[styles.actionSubtext, { color: colors.textSecondary }]}>
                  Receive saved places & profile summary in your inbox.
                </Text>
              </View>
              <View style={[styles.chevronChip, { backgroundColor: colors.chipBg }]}>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>InclusiveMapper</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Version 1.0.0 — Community-verified accessibility for public spaces (SDG 10 & SDG 11).
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeOverlay: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 18,
  },

  /* Header */
  headerCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    marginTop: 1,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: '70%',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  editChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  signOutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  signOutHeaderText: {
    fontSize: 14,
    fontWeight: '800',
  },

  /* Menu */
  sectionContainer: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  menuGroup: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    backgroundColor: 'transparent',
  },
  menuItem: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  menuItemPressed: {
    transform: [{ scale: 0.995 }],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  chevronChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    borderRadius: 12,
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  themeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  themeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* SOS */
  sosSection: {
    gap: 10,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    minHeight: 76,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  sosIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sosTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  sosTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  sosSub: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  sosChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sosHint: {
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 4,
  },

  /* Bottom sign out */
  bottomSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 4,
  },
  bottomSignOutText: {
    fontSize: 14,
    fontWeight: '800',
  },

  /* Modals shared */
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },

  /* Saved places */
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
    minHeight: 72,
  },
  savedImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  savedCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  savedName: {
    fontSize: 14,
    fontWeight: '700',
  },
  savedAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  savedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  savedConfirms: {
    fontSize: 10,
  },
  removeSavedBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 19,
  },

  /* Preferences */
  preferenceCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  prefCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  prefCardSubtext: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  prefCardHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  disabilityTypeBox: {
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  disabilityTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  prefText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  /* Help */
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    gap: 14,
    minHeight: 72,
  },
  actionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  actionSubtext: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
});
