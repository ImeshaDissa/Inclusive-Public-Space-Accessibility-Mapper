import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DisputeModal } from '@/components/DisputeModal';
import { Report, StatusType } from '@/types/accessibility';

export default function VerificationQueueScreen() {
  const { reports, confirmReport, disputeReport } = useApp();
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [activeDisputeReport, setActiveDisputeReport] = useState<Report | null>(null);

  const getStatusBadgeConfig = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return { label: 'VERIFIED', color: colors.badgeVerifiedText, bg: colors.badgeVerifiedBg, icon: 'checkmark-circle' as const };
      case 'disputed':
        return { label: 'DISPUTED', color: colors.badgeDisputedText, bg: colors.badgeDisputedBg, icon: 'alert-circle' as const };
      case 'pending':
      default:
        return { label: 'PENDING', color: colors.badgePendingText, bg: colors.badgePendingBg, icon: 'time' as const };
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder, paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="shield-checkmark-sharp" size={24} color={colors.accent} />
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Verification Queue</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Community Trust & Consensus Engine</Text>
          </View>
        </View>
      </View>

      {/* Demo Trust Rule Banner */}
      <View style={[styles.ruleBanner, { backgroundColor: colors.ruleBannerBg, borderColor: colors.ruleBannerBorder }]}>
        <Ionicons name="information-circle" size={20} color={colors.ruleBannerTitle} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.ruleTitle, { color: colors.ruleBannerTitle }]}>LIVE TRUST THRESHOLD LOGIC:</Text>
          <Text style={[styles.ruleText, { color: colors.ruleBannerText }]}>
            • <Text style={{ color: colors.statusDotVerified, fontWeight: '800' }}>3+ Confirmations</Text> → Status becomes <Text style={{ color: colors.statusDotVerified }}>Verified (Green Pin)</Text>
            {'\n'}• <Text style={{ color: colors.statusDotDisputed, fontWeight: '800' }}>2+ Disputes</Text> → Status becomes <Text style={{ color: colors.statusDotDisputed }}>Disputed (Red Pin)</Text>
          </Text>
        </View>
      </View>

      {/* Queue List */}
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const statusConfig = getStatusBadgeConfig(item.status);
          const priorityStyle = getPriorityStyle(item.priority);
          const locked = isFinalStatus(item.status);

          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Card Header: Submitter + Priority + Status */}
              <View style={styles.cardHeader}>
                <View style={styles.submitterRow}>
                  {item.submitterAvatar ? (
                    <Image source={{ uri: item.submitterAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.chipBg }]}>
                      <Ionicons name="person" size={14} color={colors.textMuted} />
                    </View>
                  )}
                  <View>
                    <Text style={[styles.submitterName, { color: colors.textPrimary }]}>{item.submitterName}</Text>
                    <Text style={[styles.timestamp, { color: colors.textMuted }]}>{item.timestamp}</Text>
                  </View>
                </View>

                <View style={styles.badgesRight}>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: priorityStyle.bg, borderColor: priorityStyle.border },
                    ]}
                  >
                    <Text style={[styles.priorityBadgeText, { color: priorityStyle.text }]}>
                      {item.priority} Priority
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
                    <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Place Name Title */}
              <Text style={[styles.placeNameTitle, { color: colors.textPrimary }]}>{item.placeName}</Text>

              {/* Photo & Audit Note */}
              <View style={styles.contentRow}>
                {item.photos && item.photos.length > 0 && (
                  <Image source={{ uri: item.photos[0] }} style={styles.reportPhoto} />
                )}
                <View style={styles.noteContainer}>
                  <Text style={[styles.noteText, { color: colors.textSecondary }]}>{item.note}</Text>

                  <View style={styles.featuresPillRow}>
                    {item.featuresReported?.ramp && (
                      <View style={[styles.featureTag, { backgroundColor: colors.featureTagBg }]}>
                        <MaterialCommunityIcons name="wheelchair" size={10} color={colors.statusDotVerified} />
                        <Text style={[styles.featureTagText, { color: colors.featureTagText }]}>Ramp</Text>
                      </View>
                    )}
                    {item.featuresReported?.elevator && (
                      <View style={[styles.featureTag, { backgroundColor: colors.featureTagBg }]}>
                        <MaterialCommunityIcons name="elevator-passenger" size={10} color={colors.statusDotVerified} />
                        <Text style={[styles.featureTagText, { color: colors.featureTagText }]}>Elevator</Text>
                      </View>
                    )}
                    {item.featuresReported?.toilet && (
                      <View style={[styles.featureTag, { backgroundColor: colors.featureTagBg }]}>
                        <MaterialCommunityIcons name="human-handsdown" size={10} color={colors.statusDotVerified} />
                        <Text style={[styles.featureTagText, { color: colors.featureTagText }]}>Toilet</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Dispute Reasons list if any */}
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

              {/* Counts & Action Buttons Footer */}
              <View style={[styles.cardFooter, { borderTopColor: colors.divider }]}>
                <View style={styles.countsContainer}>
                  <Text style={[styles.countText, { color: colors.textSecondary }]}>
                    <Text style={{ color: colors.statusDotVerified, fontWeight: '800' }}>
                      {item.confirmCount}
                    </Text>{' '}
                    Confirms ·{' '}
                    <Text style={{ color: colors.statusDotDisputed, fontWeight: '800' }}>
                      {item.disputeCount}
                    </Text>{' '}
                    Disputes
                  </Text>
                </View>

                <View style={styles.actionButtonsRow}>
                  {/* Dispute Button */}
                  <TouchableOpacity
                    style={[
                      styles.disputeBtn,
                      { backgroundColor: colors.disputeBtn, borderColor: colors.disputeBtnBorder },
                      locked && styles.disabledBtn,
                    ]}
                    onPress={() => setActiveDisputeReport(item)}
                    disabled={locked}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={locked ? colors.textMuted : colors.disputeBtnText} />
                    <Text style={[styles.disputeBtnText, { color: locked ? colors.textMuted : colors.disputeBtnText }]}>Dispute</Text>
                  </TouchableOpacity>

                  {/* Confirm Button */}
                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      { backgroundColor: locked ? colors.chipBg : colors.confirmBtn },
                    ]}
                    onPress={() => handleConfirm(item.id, item.placeName)}
                    disabled={locked}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={locked ? colors.textMuted : colors.confirmBtnText} />
                    <Text style={[styles.confirmBtnText, { color: locked ? colors.textMuted : colors.confirmBtnText }]}>
                      {locked ? statusConfig.label : 'Confirm (+1)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Dispute Modal */}
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
  },
  ruleBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
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
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  submitterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitterName: {
    fontSize: 12,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 10,
  },
  badgesRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  placeNameTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  reportPhoto: {
    width: 80,
    height: 70,
    borderRadius: 10,
  },
  noteContainer: {
    flex: 1,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
  },
  featuresPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featureTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  disputeReasonsBox: {
    borderRadius: 10,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
    flexWrap: 'wrap',
  },
  countsContainer: {},
  countText: {
    fontSize: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
  },
  disputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 94,
    justifyContent: 'center',
  },
  disputeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 124,
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
