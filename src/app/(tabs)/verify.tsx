import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DisputeModal } from '@/components/DisputeModal';
import { Report, StatusType } from '@/types/accessibility';

// Bundled local image assets to guarantee 100% reliable rendering without network block issues
const LOCAL_REPORT_IMAGES: Record<string, any> = {
  'report-1': require('@/assets/images/train_station.jpg'),
  'report-2': require('@/assets/images/botanical_gardens.jpg'),
  'report-3': require('@/assets/images/public_restroom.jpg'),
};

const ReportCardImage = ({ photoUri, reportId }: { photoUri?: string; reportId: string }) => {
  const localImage = LOCAL_REPORT_IMAGES[reportId] || LOCAL_REPORT_IMAGES['report-1'];
  const [useFallback, setUseFallback] = useState(false);
  const imageSource = (!useFallback && photoUri && photoUri.startsWith('http')) 
    ? { uri: photoUri } 
    : localImage;

  return (
    <Image
      source={imageSource}
      style={styles.fullWidthPhoto}
      contentFit="cover"
      transition={300}
      onError={() => setUseFallback(true)}
    />
  );
};

export default function VerificationQueueScreen() {
  const router = useRouter();
  const { reports, confirmReport, disputeReport, userProfile, signOut } = useApp();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [activeDisputeReport, setActiveDisputeReport] = useState<Report | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Filter queue reports based on search query
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase().trim();
    return reports.filter(
      (r) =>
        r.placeName.toLowerCase().includes(q) ||
        r.submitterName.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  const getStatusBadgeConfig = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return {
          label: 'VERIFIED',
          color: colors.badgeVerifiedText || '#10B981',
          bg: colors.badgeVerifiedBg || '#064E3B',
          icon: 'checkmark-circle-outline' as const,
        };
      case 'disputed':
        return {
          label: 'DISPUTED',
          color: colors.badgeDisputedText || '#EF4444',
          bg: colors.badgeDisputedBg || '#7F1D1D',
          icon: 'alert-circle-outline' as const,
        };
      case 'pending':
      default:
        return {
          label: 'PENDING',
          color: colors.badgePendingText || '#F59E0B',
          bg: colors.badgePendingBg || '#78350F',
          icon: 'time-outline' as const,
        };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'High':
        return { bg: colors.priorityHighBg, border: colors.priorityHighBorder, text: colors.priorityHighText };
      case 'Medium':
        return { bg: colors.priorityMediumBg, border: colors.priorityMediumBorder, text: colors.priorityMediumText };
      case 'Low':
      default:
        return { bg: colors.priorityLowBg, border: colors.priorityLowBorder, text: colors.priorityLowText };
    }
  };

  const isFinalStatus = (status: StatusType) => status === 'verified' || status === 'disputed';

  const handleConfirm = (reportId: string, placeName: string) => {
    confirmReport(reportId);
    showToast(`Confirmed report for ${placeName}`, 'success', 'checkmark-circle');
  };

  const handleDisputeSubmit = (reason: string, note?: string) => {
    if (activeDisputeReport) {
      disputeReport(activeDisputeReport.id, reason, note);
      showToast(`Disputed report for ${activeDisputeReport.placeName}`, 'warning', 'alert-circle');
    }
  };

  const handleMenuNavigate = (path: string) => {
    setIsMenuOpen(false);
    router.push(path as any);
  };

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top App Bar */}
      <View style={[styles.topAppBar, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder, paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          style={styles.topIconBtn}
          activeOpacity={0.7}
          onPress={() => setIsMenuOpen(true)}
        >
          <Ionicons name="menu-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.appTitle, { color: colors.textPrimary }]}>InclusiveMapper</Text>
          <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>Public Space Accessibility</Text>
        </View>

        <TouchableOpacity
          style={styles.topIconBtn}
          activeOpacity={0.7}
          onPress={() => {
            setIsSearchOpen((prev) => !prev);
            if (isSearchOpen) setSearchQuery('');
          }}
        >
          <Ionicons
            name={isSearchOpen ? 'close' : 'search-outline'}
            size={22}
            color={isSearchOpen ? colors.accent : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Interactive Search Bar (Toggled by Search Button) */}
      {isSearchOpen && (
        <View style={[styles.searchSection, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search verification reports..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Queue List */}
      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.ruleBanner, { backgroundColor: colors.ruleBannerBg, borderColor: colors.ruleBannerBorder }]}>
            <Ionicons name="shield-checkmark" size={18} color={colors.ruleBannerTitle} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ruleTitle, { color: colors.ruleBannerTitle }]}>VERIFICATION THRESHOLD LOGIC:</Text>
              <Text style={[styles.ruleText, { color: colors.ruleBannerText }]}>
                • <Text style={{ color: colors.statusDotVerified, fontWeight: '700' }}>3+ Confirmations</Text> → Status becomes Verified (Green Pin){'\n'}
                • <Text style={{ color: colors.statusDotDisputed, fontWeight: '700' }}>2+ Disputes</Text> → Status becomes Disputed (Red Pin)
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search-outline" size={36} color={colors.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Matching Reports</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              No verification entries found matching "{searchQuery}". Try a different location or keyword.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusConfig = getStatusBadgeConfig(item.status);
          const priorityStyle = getPriorityStyle(item.priority);
          const locked = isFinalStatus(item.status);
          const photoUri = item.photos && item.photos.length > 0 ? item.photos[0] : undefined;

          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Header: Location Pin + Place Name + Pill Status Badge */}
              <View style={styles.cardHeader}>
                <View style={styles.locationTitleRow}>
                  <Ionicons name="location-sharp" size={22} color={colors.accent} />
                  <Text style={[styles.placeName, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                    {item.placeName}
                  </Text>
                </View>

                {/* Pill Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                  <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
                  <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>

              {/* Submitter & Priority Meta Info */}
              <View style={styles.submitterMetaRow}>
                <View style={styles.submitterInfo}>
                  {item.submitterAvatar ? (
                    <Image source={{ uri: item.submitterAvatar }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.chipBg }]}>
                      <Ionicons name="person" size={12} color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={[styles.submitterName, { color: colors.textPrimary }]}>{item.submitterName}</Text>
                  <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.timestamp, { color: colors.textMuted }]}>{item.timestamp}</Text>
                </View>

                <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg, borderColor: priorityStyle.border }]}>
                  <Text style={[styles.priorityBadgeText, { color: priorityStyle.text }]}>
                    {item.priority}
                  </Text>
                </View>
              </View>

              {/* Full-width Photo (~180px height, cover) */}
              <ReportCardImage photoUri={photoUri} reportId={item.id} />

              {/* Accessibility Note Section */}
              <View style={styles.noteContainer}>
                <Text style={[styles.noteHeaderLabel, { color: colors.textPrimary }]}>ACCESSIBILITY NOTE:</Text>
                <Text style={[styles.noteBodyText, { color: colors.textSecondary }]} numberOfLines={3} ellipsizeMode="tail">
                  {item.note || 'No accessibility audit details provided for this location report.'}
                </Text>

                {/* Features Tags */}
                <View style={styles.featuresPillRow}>
                  {item.featuresReported?.ramp && (
                    <View style={[styles.featureTag, { backgroundColor: colors.featureTagBg }]}>
                      <MaterialCommunityIcons name="wheelchair" size={12} color={colors.statusDotVerified} />
                      <Text style={[styles.featureTagText, { color: colors.featureTagText }]}>Ramp</Text>
                    </View>
                  )}
                  {item.featuresReported?.elevator && (
                    <View style={[styles.featureTag, { backgroundColor: colors.featureTagBg }]}>
                      <MaterialCommunityIcons name="elevator-passenger" size={12} color={colors.statusDotVerified} />
                      <Text style={[styles.featureTagText, { color: colors.featureTagText }]}>Elevator</Text>
                    </View>
                  )}
                  {item.featuresReported?.toilet && (
                    <View style={[styles.featureTag, { backgroundColor: colors.featureTagBg }]}>
                      <MaterialCommunityIcons name="human-handsdown" size={12} color={colors.statusDotVerified} />
                      <Text style={[styles.featureTagText, { color: colors.featureTagText }]}>Accessible Toilet</Text>
                    </View>
                  )}
                </View>

                {/* Reported Disputes List */}
                {item.disputeReasons && item.disputeReasons.length > 0 && (
                  <View style={[styles.disputeReasonsBox, { backgroundColor: colors.disputeReasonBg, borderColor: colors.disputeReasonBorder }]}>
                    <Text style={[styles.disputeReasonHeader, { color: colors.disputeReasonHeaderText }]}>Reported Disputes:</Text>
                    {item.disputeReasons.map((r, i) => (
                      <Text key={i} style={[styles.disputeReasonItem, { color: colors.disputeReasonText }]}>
                        • {r}
                      </Text>
                    ))}
                  </View>
                )}
              </View>

              {/* Card Footer: Counts & Equal-Width Outlined Action Buttons */}
              <View style={[styles.cardFooter, { borderTopColor: colors.divider }]}>
                <View style={styles.countsContainer}>
                  <Text style={[styles.countText, { color: colors.textSecondary }]}>
                    <Text style={{ color: colors.statusDotVerified, fontWeight: '700' }}>{item.confirmCount}</Text> Confirms ·{' '}
                    <Text style={{ color: colors.statusDotDisputed, fontWeight: '700' }}>{item.disputeCount}</Text> Disputes
                  </Text>
                </View>

                <View style={styles.buttonRow}>
                  {/* Confirm Button */}
                  <TouchableOpacity
                    style={[
                      styles.outlinedButton,
                      {
                        borderColor: colors.statusDotVerified,
                        backgroundColor: isDark ? colors.chipBg : '#FFFFFF',
                      },
                      locked && { borderColor: colors.cardBorder, backgroundColor: colors.chipBg },
                    ]}
                    onPress={() => handleConfirm(item.id, item.placeName)}
                    disabled={locked}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={locked ? colors.textMuted : colors.statusDotVerified}
                    />
                    <Text style={[styles.confirmBtnText, { color: locked ? colors.textMuted : colors.statusDotVerified }]}>
                      {locked ? statusConfig.label : 'Confirm'}
                    </Text>
                  </TouchableOpacity>

                  {/* Dispute Button */}
                  <TouchableOpacity
                    style={[
                      styles.outlinedButton,
                      {
                        borderColor: colors.statusDotDisputed,
                        backgroundColor: isDark ? colors.chipBg : '#FFFFFF',
                      },
                      locked && { borderColor: colors.cardBorder, backgroundColor: colors.chipBg },
                    ]}
                    onPress={() => setActiveDisputeReport(item)}
                    disabled={locked}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="flag-outline"
                      size={18}
                      color={locked ? colors.textMuted : colors.statusDotDisputed}
                    />
                    <Text style={[styles.disputeBtnText, { color: locked ? colors.textMuted : colors.statusDotDisputed }]}>
                      Dispute
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Hamburger Navigation Drawer Modal */}
      <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
        <View style={[styles.drawerBackdrop, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity style={styles.drawerBackdropDismiss} activeOpacity={1} onPress={() => setIsMenuOpen(false)} />
          <View style={[styles.drawerContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Drawer Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: colors.divider }]}>
              <Image source={{ uri: userProfile.avatar }} style={styles.drawerAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.drawerUserName, { color: colors.textPrimary }]}>{userProfile.name}</Text>
                <Text style={[styles.drawerUserRole, { color: colors.textSecondary }]}>Auditor Level 3</Text>
              </View>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Navigation Options */}
            <View style={styles.drawerNavList}>
              <TouchableOpacity style={styles.drawerNavItem} onPress={() => handleMenuNavigate('/home')}>
                <Ionicons name="home-outline" size={20} color={colors.accent} />
                <Text style={[styles.drawerNavText, { color: colors.textPrimary }]}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerNavItem} onPress={() => handleMenuNavigate('/map')}>
                <Ionicons name="map-outline" size={20} color={colors.accent} />
                <Text style={[styles.drawerNavText, { color: colors.textPrimary }]}>Map & Explore</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerNavItem} onPress={() => handleMenuNavigate('/report')}>
                <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                <Text style={[styles.drawerNavText, { color: colors.textPrimary }]}>Submit Audit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.drawerNavItem, styles.drawerNavActive]} onPress={() => setIsMenuOpen(false)}>
                <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                <Text style={[styles.drawerNavText, { color: colors.accent, fontWeight: '700' }]}>Verification Queue</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerNavItem} onPress={() => handleMenuNavigate('/profile')}>
                <Ionicons name="person-outline" size={20} color={colors.accent} />
                <Text style={[styles.drawerNavText, { color: colors.textPrimary }]}>Profile & Saved</Text>
              </TouchableOpacity>
            </View>

            {/* Theme Toggle & Sign Out Footer */}
            <View style={[styles.drawerFooter, { borderTopColor: colors.divider }]}>
              <TouchableOpacity style={[styles.drawerThemeToggle, { backgroundColor: colors.chipBg }]} onPress={toggleTheme}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.accent} />
                <Text style={[styles.drawerNavText, { color: colors.textPrimary, flex: 1 }]}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Toggle</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerSignOut} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
                <Text style={[styles.drawerSignOutText, { color: colors.error }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dispute Modal Component */}
      <DisputeModal
        visible={!!activeDisputeReport}
        placeName={activeDisputeReport ? activeDisputeReport.placeName : ''}
        onClose={() => setActiveDisputeReport(null)}
        onSubmitDispute={handleDisputeSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  appSubtitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  topIconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  ruleBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    borderRadius: 12,
  },
  ruleTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ruleText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },
  emptyContainer: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  submitterMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  submitterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  avatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitterName: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 12,
  },
  timestamp: {
    fontSize: 11,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fullWidthPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  noteContainer: {
    marginBottom: 12,
  },
  noteHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  noteBodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  featuresPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  featureTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  disputeReasonsBox: {
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
  },
  disputeReasonHeader: {
    fontSize: 11,
    fontWeight: '700',
  },
  disputeReasonItem: {
    fontSize: 11,
    marginTop: 2,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  countsContainer: {
    marginBottom: 10,
  },
  countText: {
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  outlinedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  disputeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  drawerBackdrop: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdropDismiss: {
    flex: 1,
  },
  drawerContent: {
    width: 280,
    height: '100%',
    padding: 20,
    borderRightWidth: 1,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  drawerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  drawerUserName: {
    fontSize: 15,
    fontWeight: '800',
  },
  drawerUserRole: {
    fontSize: 11,
  },
  drawerNavList: {
    gap: 10,
    marginVertical: 20,
    flex: 1,
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  drawerNavActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  drawerNavText: {
    fontSize: 14,
    fontWeight: '600',
  },
  drawerFooter: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 10,
  },
  drawerThemeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  drawerSignOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  drawerSignOutText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
