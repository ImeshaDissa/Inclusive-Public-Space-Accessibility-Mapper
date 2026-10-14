import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { StatusType } from '@/types/accessibility';
import { openDirections } from '@/lib/directions';
import { useToast } from '@/context/ToastContext';

/**
 * Place detail route: /place/[id]
 * Deep-linked place page, reachable from QR codes and from list/map cards.
 */
export default function PlaceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { places, toggleSavePlace } = useApp();
  const { colors, isDark } = useAppTheme();
  const { showToast } = useToast();
  const [modalVisible, setModalVisible] = React.useState(false);

  const place = useMemo(() => places.find((p) => p.id === id) ?? null, [places, id]);

  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return {
          label: 'FULLY ACCESSIBLE',
          subLabel: 'Verified by Community Audits',
          color: '#10B981',
          bg: isDark ? '#064E3B' : '#ECFDF5',
        };
      case 'disputed':
        return {
          label: 'NOT ACCESSIBLE / DISPUTED',
          subLabel: 'Barrier Reported by Community',
          color: '#EF4444',
          bg: isDark ? '#7F1D1D' : '#FEF2F2',
        };
      case 'pending':
      default:
        return {
          label: 'PARTIALLY ACCESSIBLE',
          subLabel: 'Awaiting Full Community Verification',
          color: '#F59E0B',
          bg: isDark ? '#78350F' : '#FFFBEB',
        };
    }
  };

  const handleDirections = async () => {
    if (!place) return;
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

  if (!place) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="location-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>Place not found</Text>
        <Text style={[styles.notFoundSub, { color: colors.textSecondary }]}>
          This place may have been removed or the link is invalid.
        </Text>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={16} color="#FFF" />
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(place.status);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
        <TouchableOpacity
          style={styles.backBtnPlain}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Place Details
        </Text>
        <TouchableOpacity
          style={styles.backBtnPlain}
          onPress={() => toggleSavePlace(place.id)}
          accessibilityRole="button"
          accessibilityLabel={place.saved ? 'Remove bookmark' : 'Bookmark place'}
        >
          <Ionicons
            name={place.saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={place.saved ? colors.accent : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Banner Photo */}
        {place.photos && place.photos.length > 0 ? (
          <Image source={{ uri: place.photos[0] }} style={styles.banner} />
        ) : (
          <View style={[styles.banner, styles.bannerPlaceholder, { backgroundColor: colors.chipBg }]}>
            <Ionicons name="image-outline" size={40} color={colors.textMuted} />
          </View>
        )}

        {/* Place Info */}
        <Text style={[styles.category, { color: colors.accent }]}>{place.category.toUpperCase()}</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{place.name}</Text>
        <View style={styles.addressRow}>
          <Ionicons name="location-sharp" size={16} color={colors.accent} />
          <Text style={[styles.address, { color: colors.textSecondary }]}>{place.address}</Text>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.color + '55' }]}>
          <Ionicons
            name={place.status === 'verified' ? 'checkmark-circle' : place.status === 'disputed' ? 'alert-circle' : 'time'}
            size={18}
            color={statusConfig.color}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
            <Text style={[styles.statusSubText, { color: statusConfig.color }]}>
              {statusConfig.subLabel}
            </Text>
          </View>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {place.confirmCount} Confirms · {place.disputeCount} Disputes
          </Text>
        </View>

        {place.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>{place.description}</Text>
        ) : null}

        {/* Accessibility Features Checklist */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          ACCESSIBILITY FEATURES CHECKLIST
        </Text>
        <View style={styles.grid}>
          {featureItems.map((item) => (
            <View
              key={item.key}
              style={[
                styles.gridCard,
                {
                  borderColor: item.active ? 'rgba(16,185,129,0.4)' : colors.cardBorder,
                  backgroundColor: item.active ? 'rgba(16,185,129,0.08)' : colors.card,
                },
              ]}
              accessible={true}
              accessibilityLabel={`${item.label}: ${item.active ? 'Available' : 'Unavailable'}`}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={18}
                color={item.active ? '#10B981' : colors.textMuted}
              />
              <Text
                style={[styles.gridText, { color: item.active ? colors.textPrimary : colors.textMuted }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              <Ionicons
                name={item.active ? 'checkmark-circle' : 'close-circle-outline'}
                size={14}
                color={item.active ? '#10B981' : colors.textMuted}
              />
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.directionsBtn, { backgroundColor: colors.accent }]}
          onPress={handleDirections}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Get Step-Free Directions"
        >
          <Ionicons name="navigate" size={18} color="#FFF" />
          <Text style={styles.directionsBtnText}>Get Step-Free Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.detailsBtn, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open Full Interactive Sheet"
        >
          <Ionicons name="information-circle-outline" size={18} color={colors.textPrimary} />
          <Text style={[styles.detailsBtnText, { color: colors.textPrimary }]}>View Full Reliability Sheet</Text>
        </TouchableOpacity>
      </ScrollView>

      <PlaceDetailsModal
        place={place}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onToggleSave={toggleSavePlace}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  notFoundTitle: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  notFoundSub: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtnPlain: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  scroll: { padding: 16, paddingBottom: 32 },
  banner: { width: '100%', height: 190, borderRadius: 18 },
  bannerPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  category: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 16 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 4, lineHeight: 28 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  address: { fontSize: 13, flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  statusSubText: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  countText: { fontSize: 11, marginLeft: 'auto' },
  description: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  gridText: { fontSize: 11, fontWeight: '600', flex: 1 },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 24,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  directionsBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  detailsBtnText: { fontSize: 14, fontWeight: '700' },
});
