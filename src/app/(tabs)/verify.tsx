import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { DisputeModal } from '@/components/DisputeModal';
import { Report, StatusType } from '@/types/accessibility';

export default function VerificationQueueScreen() {
  const { reports, confirmReport, disputeReport } = useApp();

  const [activeDisputeReport, setActiveDisputeReport] = useState<Report | null>(null);

  const getStatusBadgeConfig = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return { label: 'VERIFIED', color: '#10B981', bg: '#064E3B', icon: 'checkmark-circle' as const };
      case 'disputed':
        return { label: 'DISPUTED', color: '#EF4444', bg: '#7F1D1D', icon: 'alert-circle' as const };
      case 'pending':
      default:
        return { label: 'PENDING', color: '#F59E0B', bg: '#78350F', icon: 'time' as const };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'High':
        return { bg: '#450A0A', border: '#EF4444', text: '#FCA5A5' };
      case 'Medium':
        return { bg: '#451A03', border: '#F59E0B', text: '#FDE68A' };
      case 'Low':
      default:
        return { bg: '#064E3B', border: '#10B981', text: '#A7F3D0' };
    }
  };

  const handleConfirm = (reportId: string) => {
    confirmReport(reportId);
  };

  const handleDisputeSubmit = (reason: string, note?: string) => {
    if (activeDisputeReport) {
      disputeReport(activeDisputeReport.id, reason, note);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="shield-checkmark-sharp" size={24} color="#6366F1" />
          <View>
            <Text style={styles.headerTitle}>Verification Queue</Text>
            <Text style={styles.headerSubtitle}>Community Trust & Consensus Engine</Text>
          </View>
        </View>
      </View>

      {/* Demo Trust Rule Banner */}
      <View style={styles.ruleBanner}>
        <Ionicons name="information-circle" size={20} color="#818CF8" />
        <View style={{ flex: 1 }}>
          <Text style={styles.ruleTitle}>LIVE TRUST THRESHOLD LOGIC:</Text>
          <Text style={styles.ruleText}>
            • <Text style={{ color: '#10B981', fontWeight: '800' }}>3+ Confirmations</Text> → Status becomes <Text style={{ color: '#10B981' }}>Verified (Green Pin)</Text>
            {'\n'}• <Text style={{ color: '#EF4444', fontWeight: '800' }}>2+ Disputes</Text> → Status becomes <Text style={{ color: '#EF4444' }}>Disputed (Red Pin)</Text>
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

          return (
            <View style={styles.card}>
              {/* Card Header: Submitter + Priority + Status */}
              <View style={styles.cardHeader}>
                <View style={styles.submitterRow}>
                  {item.submitterAvatar ? (
                    <Image source={{ uri: item.submitterAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={14} color="#94A3B8" />
                    </View>
                  )}
                  <View>
                    <Text style={styles.submitterName}>{item.submitterName}</Text>
                    <Text style={styles.timestamp}>{item.timestamp}</Text>
                  </View>
                </View>

                <View style={styles.badgesRight}>
                  {/* Priority Badge */}
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

                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
                    <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Place Name Title */}
              <Text style={styles.placeNameTitle}>{item.placeName}</Text>

              {/* Photo & Audit Note */}
              <View style={styles.contentRow}>
                {item.photos && item.photos.length > 0 && (
                  <Image source={{ uri: item.photos[0] }} style={styles.reportPhoto} />
                )}
                <View style={styles.noteContainer}>
                  <Text style={styles.noteText}>{item.note}</Text>

                  {/* Reported features pills */}
                  <View style={styles.featuresPillRow}>
                    {item.featuresReported?.ramp && (
                      <View style={styles.featureTag}>
                        <MaterialCommunityIcons name="wheelchair" size={10} color="#10B981" />
                        <Text style={styles.featureTagText}>Ramp</Text>
                      </View>
                    )}
                    {item.featuresReported?.elevator && (
                      <View style={styles.featureTag}>
                        <MaterialCommunityIcons name="elevator-passenger" size={10} color="#10B981" />
                        <Text style={styles.featureTagText}>Elevator</Text>
                      </View>
                    )}
                    {item.featuresReported?.toilet && (
                      <View style={styles.featureTag}>
                        <MaterialCommunityIcons name="human-handsdown" size={10} color="#10B981" />
                        <Text style={styles.featureTagText}>Toilet</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Dispute Reasons list if any */}
              {item.disputeReasons && item.disputeReasons.length > 0 && (
                <View style={styles.disputeReasonsBox}>
                  <Text style={styles.disputeReasonHeader}>Reported Disputes:</Text>
                  {item.disputeReasons.map((r, i) => (
                    <Text key={i} style={styles.disputeReasonItem}>
                      • {r}
                    </Text>
                  ))}
                </View>
              )}

              {/* Counts & Action Buttons Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.countsContainer}>
                  <Text style={styles.countText}>
                    <Text style={{ color: '#10B981', fontWeight: '800' }}>
                      {item.confirmCount}
                    </Text>{' '}
                    Confirms ·{' '}
                    <Text style={{ color: '#EF4444', fontWeight: '800' }}>
                      {item.disputeCount}
                    </Text>{' '}
                    Disputes
                  </Text>
                </View>

                <View style={styles.actionButtonsRow}>
                  {/* Dispute Button */}
                  <TouchableOpacity
                    style={styles.disputeBtn}
                    onPress={() => setActiveDisputeReport(item)}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.disputeBtnText}>Dispute</Text>
                  </TouchableOpacity>

                  {/* Confirm Button */}
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={() => handleConfirm(item.id)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                    <Text style={styles.confirmBtnText}>Confirm (+1)</Text>
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
    backgroundColor: '#090D16',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  ruleBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#1E1B4B',
    borderColor: '#4338CA',
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
  },
  ruleTitle: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ruleText: {
    color: '#E0E7FF',
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
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitterName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  timestamp: {
    color: '#64748B',
    fontSize: 10,
  },
  badgesRight: {
    alignItems: 'flex-end',
    gap: 4,
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
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
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
    color: '#CBD5E1',
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featureTagText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  disputeReasonsBox: {
    backgroundColor: '#450A0A',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  disputeReasonHeader: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
  },
  disputeReasonItem: {
    color: '#FECDD3',
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
    borderTopColor: '#1E293B',
  },
  countsContainer: {},
  countText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  disputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  disputeBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
