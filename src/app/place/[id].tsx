import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { StatusType } from '@/types/accessibility';

/**
 * Place detail route: /place/[id]
 * Deep-linked place page, reachable from QR codes and from list/map cards.
 * Reuses PlaceDetailsModal in "page" mode so the design stays consistent.
 */
export default function PlaceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { places, toggleSavePlace } = useApp();
  const { colors } = useAppTheme();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const place = useMemo(() => places.find((p) => p.id === id) ?? null, [places, id]);

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return '#10B981';
      case 'disputed':
        return '#EF4444';
      default:
        return '#F59E0B';
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

  const statusColor = getStatusColor(place.status);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
        <TouchableOpacity style={styles.backBtnPlain} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Place Details
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Banner */}
        {place.photos && place.photos.length > 0 ? (
          <Image source={{ uri: place.photos[0] }} style={styles.banner} />
        ) : (
          <View style={[styles.banner, styles.bannerPlaceholder, { backgroundColor: colors.chipBg }]}>
            <Ionicons name="image-outline" size={40} color={colors.textMuted} />
          </View>
        )}

        {/* Info */}
        <Text style={[styles.category, { color: colors.accent }]}>{place.category.toUpperCase()}</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{place.name}</Text>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.address, { color: colors.textSecondary }]}>{place.address}</Text>
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
          <Ionicons
            name={place.status === 'verified' ? 'checkmark-circle' : place.status === 'disputed' ? 'alert-circle' : 'time'}
            size={16}
            color={statusColor}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {place.status === 'verified'
              ? 'VERIFIED ACCESSIBLE'
              : place.status === 'disputed'
                ? 'ACCESS DISPUTED'
                : 'VERIFICATION PENDING'}
          </Text>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            ({place.confirmCount} Confirms · {place.disputeCount} Disputes)
          </Text>
        </View>

        {place.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>{place.description}</Text>
        ) : null}

        {/* Accessibility features */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCESSIBILITY CHECKLIST</Text>
        <View style={styles.grid}>
          {[
            { key: 'ramp', label: 'Wheelchair Ramp', icon: 'wheelchair', active: place.features.ramp },
            { key: 'elevator', label: 'Elevator Access', icon: 'elevator-passenger', active: place.features.elevator },
            { key: 'toilet', label: 'Accessible Toilet', icon: 'human-handsdown', active: place.features.toilet },
            { key: 'parking', label: 'Reserved Parking', icon: 'car', active: place.features.parking },
            { key: 'stepFree', label: 'Step-Free Entrance', icon: 'walk', active: place.features.stepFree },
            { key: 'tactilePaving', label: 'Tactile Paving', icon: 'dots-grid', active: place.features.tactilePaving },
            { key: 'automaticDoor', label: 'Automatic Doors', icon: 'door-open', active: place.features.automaticDoor },
          ].map((item) => (
            <View
              key={item.key}
              style={[
                styles.gridCard,
                { borderColor: item.active ? 'rgba(16,185,129,0.4)' : colors.cardBorder },
                { backgroundColor: item.active ? 'rgba(16,185,129,0.08)' : colors.card },
              ]}
            >
              <MaterialCommunityIcons name={item.icon as any} size={18} color={item.active ? '#10B981' : colors.textMuted} />
              <Text style={[styles.gridText, { color: item.active ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                {item.label}
              </Text>
              <Ionicons name={item.active ? 'checkmark-circle' : 'close-circle'} size={13} color={item.active ? '#10B981' : colors.textMuted} />
            </View>
          ))}
        </View>

        {/* Open full details */}
        <TouchableOpacity
          style={[styles.detailsBtn, { backgroundColor: colors.accent }]}
          onPress={() => setSelectedId(place.id)}
        >
          <Ionicons name="information-circle-outline" size={18} color="#FFF" />
          <Text style={styles.detailsBtnText}>Open Full Details</Text>
        </TouchableOpacity>
      </ScrollView>

      <PlaceDetailsModal
        place={places.find((p) => p.id === selectedId) ?? null}
        visible={!!selectedId}
        onClose={() => setSelectedId(null)}
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
  banner: { width: '100%', height: 170, borderRadius: 16 },
  bannerPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  category: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 16 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  address: { fontSize: 13 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  countText: { fontSize: 11, marginLeft: 'auto' },
  description: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 20, marginBottom: 10 },
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
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  detailsBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
