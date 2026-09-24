import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { Place, StatusType } from '@/types/accessibility';

type FilterCategory = 'all' | 'stepFree' | 'ramp' | 'elevator' | 'toilet' | 'parking' | 'tactilePaving';

export default function ExploreSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { places, toggleSavePlace, setSelectedPlaceId } = useApp();
  const { colors, isDark } = useAppTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [selectedPlaceModal, setSelectedPlaceModal] = useState<Place | null>(null);

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

  // Filter Places based on query and selected feature tag
  const filteredPlaces = places.filter((place) => {
    const matchesSearch =
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.address.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    return Boolean(place.features[activeFilter]);
  });

  const filterChips: { id: FilterCategory; label: string; icon: string }[] = [
    { id: 'all', label: 'All Places', icon: 'apps' },
    { id: 'stepFree', label: 'Step-Free', icon: 'walk' },
    { id: 'ramp', label: 'Wheelchair Ramp', icon: 'wheelchair' },
    { id: 'elevator', label: 'Elevator', icon: 'elevator-passenger' },
    { id: 'toilet', label: 'Restroom', icon: 'human-handsdown' },
    { id: 'parking', label: 'Parking', icon: 'car' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header & Search Bar */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder, paddingTop: Math.max(insets.top + 8, 16) }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Search & Filter Places</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Find verified accessible venues & step-free paths
        </Text>

        {/* Search Input Box */}
        <View style={[styles.searchBox, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
          <Ionicons name="search" size={20} color={colors.accent} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search venue name, category, or address..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filterChips.map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                  isActive && { backgroundColor: colors.segmentActiveBg, borderColor: colors.accent },
                ]}
                onPress={() => setActiveFilter(chip.id)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={chip.icon as any}
                  size={14}
                  color={isActive ? colors.filterActiveText : colors.accent}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isActive ? colors.filterActiveText : colors.textSecondary },
                    isActive && { fontWeight: '700' },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
          FOUND {filteredPlaces.length} ACCESSIBLE VENUES
        </Text>
      </View>

      {/* Venues List */}
      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const statusColor = getStatusColor(item.status);
          return (
            <TouchableOpacity
              style={[styles.placeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => {
                setSelectedPlaceId(item.id);
                setSelectedPlaceModal(item);
              }}
              activeOpacity={0.9}
            >
              <Image source={{ uri: item.photos[0] }} style={styles.placeImage} />

              <View style={styles.placeContent}>
                <View style={styles.placeTitleRow}>
                  <Text style={[styles.placeName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.bookmarkBtn}
                    onPress={() => toggleSavePlace(item.id)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={item.saved ? 'bookmark' : 'bookmark-outline'}
                      size={20}
                      color={item.saved ? '#FF5A36' : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.placeCategory, { color: colors.accentLight }]}>{item.category}</Text>
                <Text style={[styles.placeAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.address}
                </Text>

                {/* Features Badges */}
                <View style={styles.featuresRow}>
                  {item.features.ramp && (
                    <View style={[styles.featureBadge, { backgroundColor: colors.chipBg }]}>
                      <MaterialCommunityIcons name="wheelchair" size={10} color={colors.statusDotVerified} />
                      <Text style={[styles.featureText, { color: colors.textSecondary }]}>Ramp</Text>
                    </View>
                  )}
                  {item.features.elevator && (
                    <View style={[styles.featureBadge, { backgroundColor: colors.chipBg }]}>
                      <MaterialCommunityIcons name="elevator-passenger" size={10} color={colors.statusDotVerified} />
                      <Text style={[styles.featureText, { color: colors.textSecondary }]}>Elevator</Text>
                    </View>
                  )}
                  {item.features.toilet && (
                    <View style={[styles.featureBadge, { backgroundColor: colors.chipBg }]}>
                      <MaterialCommunityIcons name="human-handsdown" size={10} color={colors.statusDotVerified} />
                      <Text style={[styles.featureText, { color: colors.textSecondary }]}>Restroom</Text>
                    </View>
                  )}
                  {item.features.stepFree && (
                    <View style={[styles.featureBadge, { backgroundColor: colors.chipBg }]}>
                      <MaterialCommunityIcons name="walk" size={10} color={colors.statusDotVerified} />
                      <Text style={[styles.featureText, { color: colors.textSecondary }]}>Step-Free</Text>
                    </View>
                  )}
                </View>

                {/* Card Status Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.statusDotRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusTagText, { color: statusColor }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.confirmsText, { color: colors.textMuted }]}>
                    {item.confirmCount} confirms · {item.disputeCount} disputes
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search-outline" size={40} color={colors.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.emptyTitle }]}>No Matching Venues Found</Text>
            <Text style={[styles.emptySubtext, { color: colors.emptySubtext }]}>
              Try adjusting your search query or selecting a different feature filter pill.
            </Text>
          </View>
        }
      />

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  resultsCount: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },
  placeCard: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
  },
  placeImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  placeContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  placeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeName: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    paddingRight: 6,
  },
  bookmarkBtn: {
    padding: 2,
  },
  placeCategory: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  placeAddress: {
    fontSize: 11,
    marginTop: 2,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featureText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  confirmsText: {
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 4,
  },
});
