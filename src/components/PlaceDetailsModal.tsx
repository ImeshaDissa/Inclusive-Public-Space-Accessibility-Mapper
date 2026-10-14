import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Place, StatusType } from '@/types/accessibility';
import { openDirections } from '@/lib/directions';
import { useToast } from '@/context/ToastContext';
import { useAppTheme } from '@/context/ThemeContext';

interface PlaceDetailsModalProps {
  place: Place | null;
  visible: boolean;
  onClose: () => void;
  onToggleSave: (placeId: string) => void;
  onReportUpdate?: (place: Place) => void;
}

export const PlaceDetailsModal: React.FC<PlaceDetailsModalProps> = ({
  place,
  visible,
  onClose,
  onToggleSave,
  onReportUpdate,
}) => {
  const { showToast } = useToast();
  const { colors, isDark } = useAppTheme();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  if (!place) return null;

  /** Hand the place off to the phone's maps app for turn-by-turn directions. */
  const handleDirections = async () => {
    const opened = await openDirections({
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    });
    if (!opened) {
      showToast('Could not open a maps app on this device.', 'warning');
    }
  };

  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return {
          label: 'FULLY ACCESSIBLE',
          subLabel: 'Verified by Community Audits',
          color: '#10B981',
          bg: isDark ? '#064E3B' : '#ECFDF5',
          border: '#10B981',
          icon: 'checkmark-circle' as const,
        };
      case 'disputed':
        return {
          label: 'NOT ACCESSIBLE / DISPUTED',
          subLabel: 'Barrier Reported by Community',
          color: '#EF4444',
          bg: isDark ? '#7F1D1D' : '#FEF2F2',
          border: '#EF4444',
          icon: 'alert-circle' as const,
        };
      case 'pending':
      default:
        return {
          label: 'PARTIALLY ACCESSIBLE',
          subLabel: 'Awaiting Full Community Verification',
          color: '#F59E0B',
          bg: isDark ? '#78350F' : '#FFFBEB',
          border: '#F59E0B',
          icon: 'time' as const,
        };
    }
  };

  const statusConfig = getStatusConfig(place.status);

  // All 8 core accessibility features specified in the requirements
  const featureItems = [
    { key: 'ramp', label: 'Wheelchair Ramps', icon: 'wheelchair', active: !!place.features.ramp },
    { key: 'elevator', label: 'Elevators', icon: 'elevator-passenger', active: !!place.features.elevator },
    { key: 'toilet', label: 'Accessible Toilets', icon: 'human-handsdown', active: !!place.features.toilet },
    { key: 'parking', label: 'Accessible Parking', icon: 'car', active: !!place.features.parking },
    { key: 'stepFree', label: 'Step-Free Entrances', icon: 'walk', active: !!place.features.stepFree },
    { key: 'tactilePaving', label: 'Tactile Paths / Paving', icon: 'dots-grid', active: !!place.features.tactilePaving },
    { key: 'brailleSignage', label: 'Braille Signage', icon: 'braille', active: !!place.features.brailleSignage },
    { key: 'automaticDoor', label: 'Automatic Doors', icon: 'door-open', active: !!place.features.automaticDoor },
  ];

  // Calculate Community Reliability Index
  const totalSubmissions = place.confirmCount + place.disputeCount;
  const reliabilityScore =
    totalSubmissions === 0
      ? 50
      : Math.round((place.confirmCount / (place.confirmCount + place.disputeCount * 1.5)) * 100);

  const getReliabilityBadge = () => {
    if (totalSubmissions === 0) {
      return {
        rating: 'Newly Added',
        desc: 'No community audits logged yet. Be the first to verify!',
        color: '#94A3B8',
        icon: 'help-circle-outline' as const,
      };
    }
    if (place.confirmCount >= 3 && place.disputeCount === 0) {
      return {
        rating: 'High Reliability',
        desc: `Consistently verified by ${place.confirmCount} independent community members.`,
        color: '#10B981',
        icon: 'shield-checkmark' as const,
      };
    }
    if (place.disputeCount > 0) {
      return {
        rating: 'Flagged with Caution',
        desc: `${place.disputeCount} community member(s) noted accessibility barriers here.`,
        color: '#EF4444',
        icon: 'warning-outline' as const,
      };
    }
    return {
      rating: 'Moderate Reliability',
      desc: `Confirmed by ${place.confirmCount} community member(s). More audits recommended.`,
      color: '#F59E0B',
      icon: 'information-circle-outline' as const,
    };
  };

  const reliabilityBadge = getReliabilityBadge();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlayContainer}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header Bar */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.headerBorder }]}>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.chipBg }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close details modal"
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                  place.saved && { backgroundColor: 'rgba(255, 90, 54, 0.15)', borderColor: '#FF5A36' },
                ]}
                onPress={() => onToggleSave(place.id)}
                accessibilityRole="button"
                accessibilityLabel={place.saved ? 'Remove from saved places' : 'Save place'}
              >
                <Ionicons
                  name={place.saved ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={place.saved ? '#FF5A36' : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: colors.textPrimary },
                    place.saved && { color: '#FF7A5C' },
                  ]}
                >
                  {place.saved ? 'Saved' : 'Save Place'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Banner Image / Community Photos */}
            {place.photos && place.photos.length > 0 ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setSelectedPhotoIndex(0)}
                accessibilityRole="image"
                accessibilityLabel={`Primary photo of ${place.name}. Tap to enlarge.`}
              >
                <Image source={{ uri: place.photos[0] }} style={styles.bannerImage} />
                <View style={styles.photoCountBadge}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                  <Text style={styles.photoCountText}>{place.photos.length} photos</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.bannerImage, styles.placeholderBanner, { backgroundColor: colors.chipBg }]}>
                <Ionicons name="image-outline" size={40} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  No community photos yet
                </Text>
              </View>
            )}

            {/* Place Header Info */}
            <View style={styles.infoSection}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{place.category.toUpperCase()}</Text>
              </View>

              <Text style={[styles.titleText, { color: colors.textPrimary }]}>{place.name}</Text>

              <View style={styles.addressRow}>
                <Ionicons name="location-sharp" size={16} color="#FF5A36" />
                <Text style={[styles.addressText, { color: colors.textSecondary }]}>{place.address}</Text>
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadgeRow,
                  { backgroundColor: statusConfig.bg, borderColor: statusConfig.border },
                ]}
                accessible={true}
                accessibilityLabel={`Status: ${statusConfig.label}. ${statusConfig.subLabel}.`}
              >
                <Ionicons name={statusConfig.icon} size={20} color={statusConfig.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                  <Text style={[styles.statusSubText, { color: statusConfig.color }]}>
                    {statusConfig.subLabel}
                  </Text>
                </View>
              </View>

              {place.description ? (
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                  {place.description}
                </Text>
              ) : null}
            </View>

            {/* Community Reliability & Verification Scorecard */}
            <View style={[styles.reliabilityCard, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
              <View style={styles.reliabilityHeader}>
                <Ionicons name={reliabilityBadge.icon} size={22} color={reliabilityBadge.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reliabilityTitle, { color: colors.textPrimary }]}>
                    Community Reliability: {reliabilityBadge.rating}
                  </Text>
                  <Text style={[styles.reliabilityDesc, { color: colors.textSecondary }]}>
                    {reliabilityBadge.desc}
                  </Text>
                </View>
              </View>

              <View style={styles.reliabilityStatsRow}>
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>
                    {place.confirmCount}
                  </Text>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>
                    Confirmations
                  </Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: colors.chipBorder }]} />

                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: place.disputeCount > 0 ? '#EF4444' : colors.textPrimary }]}>
                    {place.disputeCount}
                  </Text>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>
                    Barrier Disputes
                  </Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: colors.chipBorder }]} />

                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: colors.accent }]}>
                    {totalSubmissions}
                  </Text>
                  <Text style={[styles.statTitle, { color: colors.textMuted }]}>
                    Total Audits
                  </Text>
                </View>
              </View>
            </View>

            {/* Accessibility Checklist Grid */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                ACCESSIBILITY FEATURES CHECKLIST
              </Text>
              <View style={styles.gridContainer}>
                {featureItems.map((item) => (
                  <View
                    key={item.key}
                    style={[
                      styles.gridCard,
                      {
                        backgroundColor: item.active ? 'rgba(16, 185, 129, 0.08)' : colors.chipBg,
                        borderColor: item.active ? 'rgba(16, 185, 129, 0.35)' : colors.chipBorder,
                      },
                    ]}
                    accessible={true}
                    accessibilityLabel={`${item.label}: ${item.active ? 'Available and verified' : 'Not reported or unavailable'}`}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={20}
                      color={item.active ? '#10B981' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.gridCardText,
                        { color: item.active ? colors.textPrimary : colors.textMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    <Ionicons
                      name={item.active ? 'checkmark-circle' : 'close-circle-outline'}
                      size={15}
                      color={item.active ? '#10B981' : colors.textMuted}
                      style={styles.checkIcon}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Community Photo Gallery */}
            {place.photos && place.photos.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  COMMUNITY SUBMITTED PHOTOS ({place.photos.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                  {place.photos.map((url, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.85}
                      onPress={() => setSelectedPhotoIndex(idx)}
                      accessibilityRole="button"
                      accessibilityLabel={`View community photo ${idx + 1}`}
                    >
                      <Image source={{ uri: url }} style={styles.galleryImage} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Primary Action Button: Get Directions */}
            <TouchableOpacity
              style={styles.directionsBtn}
              onPress={handleDirections}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Get turn by turn directions to ${place.name}`}
            >
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
              <Text style={styles.directionsText}>Get Step-Free Directions</Text>
            </TouchableOpacity>

            {/* Secondary Action: Report Update if callback provided */}
            {onReportUpdate && (
              <TouchableOpacity
                style={[styles.reportUpdateBtn, { borderColor: colors.chipBorder }]}
                onPress={() => {
                  onClose();
                  onReportUpdate(place);
                }}
                accessibilityRole="button"
                accessibilityLabel="Submit audit or update for this location"
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                <Text style={[styles.reportUpdateText, { color: colors.accent }]}>
                  Submit Audit or Barrier Report
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Full Screen Photo Viewer Modal */}
      {selectedPhotoIndex !== null && place.photos && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.fullScreenPhotoOverlay}>
            <TouchableOpacity
              style={styles.fullScreenCloseBtn}
              onPress={() => setSelectedPhotoIndex(null)}
              accessibilityRole="button"
              accessibilityLabel="Close enlarged photo"
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: place.photos[selectedPhotoIndex] }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            <Text style={styles.fullScreenCounter}>
              Photo {selectedPhotoIndex + 1} of {place.photos.length}
            </Text>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  bannerImage: {
    width: '100%',
    height: 190,
    borderRadius: 18,
    marginTop: 14,
    position: 'relative',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  placeholderBanner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    marginTop: 14,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 90, 54, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    color: '#FF5A36',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
    lineHeight: 28,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  addressText: {
    fontSize: 13,
    flex: 1,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusSubText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  reliabilityCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  reliabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  reliabilityTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  reliabilityDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  reliabilityStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  gridCardText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  galleryImage: {
    width: 130,
    height: 95,
    borderRadius: 12,
    marginRight: 10,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF5A36',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 24,
    elevation: 3,
    shadowColor: '#FF5A36',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  directionsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  reportUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 16,
    marginTop: 10,
  },
  reportUpdateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fullScreenPhotoOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.75,
  },
  fullScreenCounter: {
    position: 'absolute',
    bottom: 40,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
