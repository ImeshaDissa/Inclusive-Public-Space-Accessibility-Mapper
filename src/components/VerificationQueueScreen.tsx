import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VerificationReport, DisputeSubmission } from '../types/verification';
import DisputeReasonModal from './DisputeReasonModal';

// Sample mock data as specified in prompt
const INITIAL_REPORTS: VerificationReport[] = [
  {
    id: '1',
    placeName: 'Central Library Entrance',
    photoUrl:
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
    note: 'Entrance ramp is clear, well-maintained, and appears to meet required grading standards. Automatic doors are functioning smoothly with wide clearance for power wheelchairs.',
    status: 'Pending',
    confirmations: 12,
    disputes: 1,
  },
  {
    id: '2',
    placeName: 'Riverside Park Restroom',
    photoUrl:
      'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=800&auto=format&fit=crop&q=80',
    note: 'Path to the accessible stall is slightly uneven near the threshold. Might be difficult for some manual chairs to cross without assistance.',
    status: 'Pending',
    confirmations: 8,
    disputes: 0,
  },
  {
    id: '3',
    placeName: 'Downtown Metro Station',
    photoUrl:
      'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=800&auto=format&fit=crop&q=80',
    note: 'North entrance elevator is currently out of service for scheduled maintenance. Estimated repair completion is next Monday morning.',
    status: 'Pending',
    confirmations: 24,
    disputes: 3,
  },
];

export const VerificationQueueScreen: React.FC = () => {
  const [reports, setReports] = useState<VerificationReport[]>(INITIAL_REPORTS);
  const [disputeModalVisible, setDisputeModalVisible] = useState<boolean>(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Submit');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useState(() => new Animated.Value(0))[0];

  // Helper to trigger toast alert
  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastMessage(null);
    });
  };

  // Confirm Handler
  const handleConfirm = (id: string) => {
    setReports((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isConfirmed = item.userConfirmed;
          const newConfirmCount = isConfirmed
            ? item.confirmations - 1
            : item.confirmations + 1;
          return {
            ...item,
            confirmations: newConfirmCount,
            userConfirmed: !isConfirmed,
            userDisputed: false,
          };
        }
        return item;
      })
    );
    showToast('Report confirmed! Thank you for verifying.');
  };

  // Dispute Modal Trigger
  const handleOpenDisputeModal = (id: string) => {
    setSelectedReportId(id);
    setDisputeModalVisible(true);
  };

  // Dispute Submission Handler
  const handleDisputeSubmit = (submission: DisputeSubmission) => {
    setReports((prev) =>
      prev.map((item) => {
        if (item.id === submission.reportId) {
          return {
            ...item,
            disputes: item.disputes + 1,
            userDisputed: true,
            userConfirmed: false,
          };
        }
        return item;
      })
    );
    showToast('Dispute submitted. Thank you for your feedback!');
  };

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  // Render individual Report Card
  const renderReportCard = ({ item }: { item: VerificationReport }) => {
    return (
      <View style={styles.card}>
        {/* Header: Location Pin + Name & Pinned Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.locationTitleContainer}>
            <Ionicons
              name="location"
              size={18}
              color="#1B2A4A"
              style={styles.pinIcon}
            />
            <Text style={styles.placeName} numberOfLines={1}>
              {item.placeName}
            </Text>
          </View>

          <View style={styles.pendingBadge}>
            <Ionicons
              name="time-outline"
              size={12}
              color="#C9822E"
              style={styles.badgeIcon}
            />
            <Text style={styles.pendingBadgeText}>{item.status}</Text>
          </View>
        </View>

        {/* Location Photo */}
        <Image
          source={{ uri: item.photoUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        {/* Accessibility Note Section */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteHeader}>ACCESSIBILITY NOTE:</Text>
          <Text style={styles.noteText} numberOfLines={3}>
            {item.note}
          </Text>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.buttonRow}>
          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.confirmButton,
              item.userConfirmed && styles.confirmButtonActive,
            ]}
            onPress={() => handleConfirm(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.userConfirmed ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={18}
              color={item.userConfirmed ? '#FFFFFF' : '#2E7D32'}
            />
            <Text
              style={[
                styles.confirmText,
                item.userConfirmed && styles.confirmTextActive,
              ]}
            >
              {item.userConfirmed ? 'Confirmed' : 'Confirm'}
            </Text>
            {item.confirmations > 0 && (
              <View style={[styles.countBadge, item.userConfirmed && styles.countBadgeActive]}>
                <Text style={[styles.countText, item.userConfirmed && styles.countTextActive]}>
                  {item.confirmations}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Dispute Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.disputeButton,
              item.userDisputed && styles.disputeButtonActive,
            ]}
            onPress={() => handleOpenDisputeModal(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.userDisputed ? 'flag' : 'flag-outline'}
              size={17}
              color={item.userDisputed ? '#FFFFFF' : '#C62828'}
            />
            <Text
              style={[
                styles.disputeText,
                item.userDisputed && styles.disputeTextActive,
              ]}
            >
              {item.userDisputed ? 'Disputed' : 'Dispute'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.barButton} activeOpacity={0.7}>
          <Ionicons name="menu-outline" size={26} color="#1B2A4A" />
        </TouchableOpacity>

        <Text style={styles.appTitle}>AccessMap</Text>

        <TouchableOpacity style={styles.barButton} activeOpacity={0.7}>
          <Ionicons name="search-outline" size={22} color="#1B2A4A" />
        </TouchableOpacity>
      </View>

      {/* Toast Notification */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="information-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Scrollable Report Queue List */}
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReportCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color="#94A3B8" />
            <Text style={styles.emptyText}>No reports awaiting confirmation</Text>
          </View>
        }
      />

      {/* Dispute Reason Modal Component */}
      <DisputeReasonModal
        visible={disputeModalVisible}
        reportId={selectedReportId}
        placeName={selectedReport?.placeName}
        onClose={() => setDisputeModalVisible(false)}
        onSubmit={handleDisputeSubmit}
      />

      {/* Fixed Bottom Tab Navigation Bar */}
      <View style={styles.bottomTabBar}>
        {/* Map Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Map')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'Map' ? 'map' : 'map-outline'}
            size={22}
            color={activeTab === 'Map' ? '#1B2A4A' : '#64748B'}
          />
          <Text style={[styles.tabLabel, activeTab === 'Map' && styles.tabLabelActive]}>
            Map
          </Text>
        </TouchableOpacity>

        {/* Submit Tab (Prominent Floating Navy Circle) */}
        <TouchableOpacity
          style={styles.submitTabContainer}
          onPress={() => setActiveTab('Submit')}
          activeOpacity={0.85}
        >
          <View style={styles.submitCircleButton}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.submitTabLabel}>Submit</Text>
        </TouchableOpacity>

        {/* Saved Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Saved')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'Saved' ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={activeTab === 'Saved' ? '#1B2A4A' : '#64748B'}
          />
          <Text style={[styles.tabLabel, activeTab === 'Saved' && styles.tabLabelActive]}>
            Saved
          </Text>
        </TouchableOpacity>

        {/* Profile Tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Profile')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'Profile' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'Profile' ? '#1B2A4A' : '#64748B'}
          />
          <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.tabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default VerificationQueueScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  // Top App Bar
  topBar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  barButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B2A4A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: -0.3,
  },
  // Toast Alert
  toastContainer: {
    position: 'absolute',
    top: 66,
    left: 20,
    right: 20,
    backgroundColor: '#1B2A4A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  // Scroll List Content
  listContent: {
    padding: 16,
    paddingBottom: 100, // Account for fixed tab bar height
  },
  // Report Card Styling
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F5F5F7',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  pinIcon: {
    marginRight: 6,
  },
  placeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1B2A4A',
    flex: 1,
  },
  // Status Badge
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECD8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  badgeIcon: {
    marginRight: 2,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C9822E',
  },
  // Image
  cardImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 14,
  },
  // Note Section
  noteContainer: {
    marginBottom: 16,
  },
  noteHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1B2A4A',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  // Button Row
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  confirmButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  confirmButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  confirmTextActive: {
    color: '#FFFFFF',
  },
  disputeButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  disputeButtonActive: {
    backgroundColor: '#C62828',
    borderColor: '#C62828',
  },
  disputeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
  },
  disputeTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  // Fixed Bottom Tab Navigation Bar
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingBottom: Platform.OS === 'ios' ? 16 : 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#1B2A4A',
    fontWeight: '700',
  },
  submitTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -22, // Float above bar line
  },
  submitCircleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1B2A4A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  submitTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B2A4A',
    marginTop: 3,
  },
});
