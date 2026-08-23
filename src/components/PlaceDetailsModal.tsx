import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Place, StatusType } from '@/types/accessibility';

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
  if (!place) return null;

  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return {
          label: 'VERIFIED ACCESSIBLE',
          color: '#10B981',
          bg: '#064E3B',
          icon: 'checkmark-circle' as const,
        };
      case 'disputed':
        return {
          label: 'ACCESS DISPUTED',
          color: '#EF4444',
          bg: '#7F1D1D',
          icon: 'alert-circle' as const,
        };
      case 'pending':
      default:
        return {
          label: 'VERIFICATION PENDING',
          color: '#F59E0B',
          bg: '#78350F',
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
        <View style={styles.modalCard}>
          {/* Header Bar */}
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, place.saved && styles.savedBtnActive]}
              onPress={() => onToggleSave(place.id)}
            >
              <Ionicons
                name={place.saved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={place.saved ? '#6366F1' : '#FFF'}
              />
              <Text style={[styles.saveBtnText, place.saved && styles.savedTextActive]}>
                {place.saved ? 'Saved' : 'Save Place'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Banner Image */}
            {place.photos && place.photos.length > 0 ? (
              <Image source={{ uri: place.photos[0] }} style={styles.bannerImage} />
            ) : (
              <View style={[styles.bannerImage, styles.placeholderBanner]}>
                <Ionicons name="image-outline" size={40} color="#475569" />
              </View>
            )}

            {/* Place Header Info */}
            <View style={styles.infoSection}>
              <Text style={styles.categoryText}>{place.category.toUpperCase()}</Text>
              <Text style={styles.titleText}>{place.name}</Text>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color="#94A3B8" />
                <Text style={styles.addressText}>{place.address}</Text>
              </View>

              {/* Status Badge */}
              <View style={[styles.statusBadgeRow, { backgroundColor: statusConfig.bg }]}>
                <Ionicons name={statusConfig.icon} size={18} color={statusConfig.color} />
                <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
                <Text style={styles.netCountText}>
                  ({place.confirmCount} Confirms · {place.disputeCount} Disputes)
                </Text>
              </View>

              {place.description && (
                <Text style={styles.descriptionText}>{place.description}</Text>
              )}
            </View>

            {/* Accessibility Checklist Grid */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>ACCESSIBILITY CHECKLIST</Text>
              <View style={styles.gridContainer}>
                {featureItems.map((item) => (
                  <View
                    key={item.key}
                    style={[
                      styles.gridCard,
                      item.active ? styles.gridCardActive : styles.gridCardInactive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={20}
                      color={item.active ? '#10B981' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.gridCardText,
                        item.active ? styles.gridTextActive : styles.gridTextInactive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Ionicons
                      name={item.active ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={item.active ? '#10B981' : '#64748B'}
                      style={styles.checkIcon}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Sample Photos Gallery */}
            {place.photos && place.photos.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>COMMUNITY PHOTOS ({place.photos.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                  {place.photos.map((url, idx) => (
                    <Image key={idx} source={{ uri: url }} style={styles.galleryImage} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Action Bar */}
            {onReportUpdate && (
              <TouchableOpacity
                style={styles.reportUpdateBtn}
                onPress={() => {
                  onClose();
                  onReportUpdate(place);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  savedBtnActive: {
    backgroundColor: '#312E81',
    borderColor: '#6366F1',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  savedTextActive: {
    color: '#818CF8',
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
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    marginTop: 16,
  },
  categoryText: {
    color: '#6366F1',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addressText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 14,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  netCountText: {
    color: '#CBD5E1',
    fontSize: 11,
    marginLeft: 'auto',
  },
  descriptionText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
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
  gridCardActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  gridCardInactive: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  gridCardText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  gridTextActive: {
    color: '#F8FAFC',
  },
  gridTextInactive: {
    color: '#64748B',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  galleryImage: {
    width: 140,
    height: 100,
    borderRadius: 12,
    marginRight: 10,
  },
  reportUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  reportUpdateText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
