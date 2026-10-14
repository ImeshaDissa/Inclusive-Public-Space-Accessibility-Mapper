import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
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
          label: 'VERIFIED ACCESSIBLE',
          color: isDark ? '#10B981' : '#059669',
          bg: isDark ? '#064E3B' : '#ECFDF5',
          border: isDark ? '#065F46' : '#A7F3D0',
          icon: 'checkmark-circle' as const,
        };
      case 'disputed':
        return {
          label: 'ACCESS DISPUTED',
          color: isDark ? '#EF4444' : '#DC2626',
          bg: isDark ? '#7F1D1D' : '#FEF2F2',
          border: isDark ? '#991B1B' : '#FECACA',
          icon: 'alert-circle' as const,
        };
      case 'pending':
      default:
        return {
          label: 'VERIFICATION PENDING',
          color: isDark ? '#F59E0B' : '#D97706',
          bg: isDark ? '#78350F' : '#FFFBEB',
          border: isDark ? '#92400E' : '#FDE68A',
          icon: 'time' as const,
        };
    }
  };

  const statusConfig = getStatusConfig(place.status);

  const featureItems = [
    { key: 'ramp', label: 'Wheelchair Ramp', icon: 'wheelchair', active: place.features.ramp },
    { key: 'elevator', label: 'Elevator Access', icon: 'elevator-passenger', active: place.features.elevator },
    { key: 'toilet', label: 'Accessible Toilet', icon: 'human-handsdown', active: place.features.toilet },
    { key: 'parking', label: 'Reserved Parking', icon: 'car', active: place.features.parking },
    { key: 'stepFree', label: 'Step-Free Entrance', icon: 'walk', active: place.features.stepFree },
    { key: 'tactilePaving', label: 'Tactile Paving', icon: 'dots-grid', active: place.features.tactilePaving },
    { key: 'automaticDoor', label: 'Automatic Doors', icon: 'door-open', active: place.features.automaticDoor },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlayContainer}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header Bar */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: place.saved ? colors.accentBg : (isDark ? '#1E293B' : '#F1F5F9') },
                { borderColor: place.saved ? colors.accent : colors.cardBorder },
              ]}
              onPress={() => onToggleSave(place.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={place.saved ? 'Unsave place' : 'Save place'}
            >
              <Ionicons
                name={place.saved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={place.saved ? colors.accent : colors.textPrimary}
              />
              <Text
                style={[
                  styles.saveBtnText,
                  { color: place.saved ? colors.accent : colors.textPrimary },
                ]}
              >
                {place.saved ? 'Saved' : 'Save Place'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Banner Image */}
            {place.photos && place.photos.length > 0 ? (
              <Image source={{ uri: place.photos[0] }} style={styles.bannerImage} />
            ) : (
              <View
                style={[
                  styles.bannerImage,
                  styles.placeholderBanner,
                  { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                ]}
              >
                <Ionicons name="image-outline" size={40} color={colors.textMuted} />
              </View>
            )}

            {/* Place Header Info */}
            <View style={styles.infoSection}>
              <Text style={[styles.categoryText, { color: colors.accent }]}>
                {place.category.toUpperCase()}
              </Text>

              <Text style={[styles.titleText, { color: colors.textPrimary }]}>
                {place.name}
              </Text>

              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={15} color={colors.accent} />
                <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                  {place.address}
                </Text>
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadgeRow,
                  { backgroundColor: statusConfig.bg, borderColor: statusConfig.border },
                ]}
              >
                <Ionicons name={statusConfig.icon} size={18} color={statusConfig.color} />
                <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
                <Text style={[styles.netCountText, { color: statusConfig.color }]}>
                  ({place.confirmCount} Confirms · {place.disputeCount} Disputes)
                </Text>
              </View>

              {place.description && (
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                  {place.description}
                </Text>
              )}
            </View>

            {/* Accessibility Checklist Grid */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="shield-checkmark" size={15} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  ACCESSIBILITY CHECKLIST
                </Text>
              </View>

              <View style={styles.gridContainer}>
                {featureItems.map((item) => (
                  <View
                    key={item.key}
                    style={[
                      styles.gridCard,
                      {
                        backgroundColor: item.active
                          ? (isDark ? '#064E3B' : '#ECFDF5')
                          : (isDark ? '#1E293B' : '#F1F5F9'),
                        borderColor: item.active
                          ? (isDark ? '#065F46' : '#A7F3D0')
                          : (isDark ? '#334155' : '#E2E8F0'),
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={20}
                      color={item.active ? (isDark ? '#34D399' : '#059669') : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.gridCardText,
                        {
                          color: item.active
                            ? (isDark ? '#A7F3D0' : '#065F46')
                            : colors.textMuted,
                          fontWeight: item.active ? '700' : '500',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Ionicons
                      name={item.active ? 'checkmark-circle' : 'close-circle'}
                      size={15}
                      color={item.active ? (isDark ? '#34D399' : '#059669') : colors.textMuted}
                      style={styles.checkIcon}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Sample Photos Gallery */}
            {place.photos && place.photos.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="images-outline" size={15} color={colors.accent} />
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    COMMUNITY PHOTOS ({place.photos.length})
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                  {place.photos.map((url, idx) => (
                    <Image key={idx} source={{ uri: url }} style={styles.galleryImage} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Turn-by-Turn Directions Action Button */}
            <TouchableOpacity
              style={[
                styles.directionsBtn,
                { backgroundColor: isDark ? 'rgba(0, 168, 132, 0.16)' : '#ECFDF5', borderColor: '#10B981' },
              ]}
              onPress={handleDirections}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Get directions to ${place.name}`}
            >
              <Ionicons name="navigate" size={18} color="#059669" />
              <Text style={styles.directionsText}>Get Turn-by-Turn Directions</Text>
              <Ionicons name="open-outline" size={15} color="#059669" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Report Update Action */}
            {onReportUpdate && (
              <TouchableOpacity
                style={[styles.reportUpdateBtn, { backgroundColor: colors.accent }]}
                onPress={() => {
                  onClose();
                  onReportUpdate(place);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Report accessibility update"
              >
                <Ionicons name="add-circle-outline" size={19} color="#FFF" />
                <Text style={styles.reportUpdateText}>Report Status Update for this Location</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 7,
    borderRadius: 20,
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
    paddingBottom: 24,
  },
  bannerImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginTop: 16,
  },
  placeholderBanner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    marginTop: 16,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  titleText: {
    fontSize: 21,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 27,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  addressText: {
    fontSize: 13,
    flex: 1,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  netCountText: {
    fontSize: 11,
    marginLeft: 'auto',
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  gridContainer: {
    gap: 8,
  },
  gridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridCardText: {
    fontSize: 13,
    flex: 1,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  photoRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  galleryImage: {
    width: 100,
    height: 75,
    borderRadius: 10,
    marginRight: 8,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
  },
  directionsText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#059669',
  },
  reportUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 10,
  },
  reportUpdateText: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});

export default PlaceDetailsModal;
