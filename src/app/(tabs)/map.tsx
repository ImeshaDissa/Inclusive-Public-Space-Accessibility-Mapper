import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { AnimatedCard } from '@/components/AnimatedComponents';
import { InteractiveMap } from '@/components/InteractiveMap';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { Place, StatusType } from '@/types/accessibility';

type FilterType = 'all' | 'verified' | 'ramp' | 'stepFree' | 'toilet';

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { places, selectedPlaceId, setSelectedPlaceId, toggleSavePlace } = useApp();
  const { colors } = useAppTheme();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [activeModalPlace, setActiveModalPlace] = useState<Place | null>(null);

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      const matchesSearch =
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.address.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      switch (activeFilter) {
        case 'verified':
          return place.status === 'verified';
        case 'ramp':
          return place.features.ramp;
        case 'stepFree':
          return place.features.stepFree;
        case 'toilet':
          return place.features.toilet;
        case 'all':
        default:
          return true;
      }
    });
  }, [places, searchQuery, activeFilter]);

  const handleSelectPlace = (place: Place) => {
    setSelectedPlaceId(place.id);
    setActiveModalPlace(place);
  };

  const handleToggleSave = (placeId: string) => {
    const place = places.find((p) => p.id === placeId);
    toggleSavePlace(placeId);
    if (place) {
      showToast(
        place.saved ? `Removed ${place.name} from saved` : `Saved ${place.name}`,
        place.saved ? 'info' : 'success',
        place.saved ? 'bookmark-outline' : 'bookmark'
      );
    }
  };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder, paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="accessibility" size={24} color={colors.accent} />
          <View>
            <Text style={[styles.appTitle, { color: colors.textPrimary }]}>InclusiveMapper</Text>
            <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>Public Space Accessibility</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.viewToggleBtn, { backgroundColor: colors.accentBg, borderColor: colors.ruleBannerBorder }]}
          onPress={() => setViewMode((prev) => (prev === 'map' ? 'list' : 'map'))}
        >
          <Ionicons
            name={viewMode === 'map' ? 'list' : 'map-outline'}
            size={18}
            color={colors.accent}
          />
          <Text style={[styles.viewToggleText, { color: colors.accent }]}>
            {viewMode === 'map' ? 'List View' : 'Map View'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchSection, { backgroundColor: colors.headerBg }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search venue, transit, park..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }, activeFilter === 'all' && { backgroundColor: colors.filterActiveBg, borderColor: colors.accent }]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterChipText, { color: activeFilter === 'all' ? colors.filterActiveText : colors.textSecondary }, activeFilter === 'all' && { color: colors.filterActiveText, fontWeight: '700' }]}>
              All Places ({places.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }, activeFilter === 'verified' && { backgroundColor: colors.filterActiveBg, borderColor: colors.accent }]}
            onPress={() => setActiveFilter('verified')}
          >
            <Ionicons name="checkmark-circle" size={14} color={activeFilter === 'verified' ? colors.filterActiveText : colors.statusDotVerified} />
            <Text style={[styles.filterChipText, { color: activeFilter === 'verified' ? colors.filterActiveText : colors.textSecondary }, activeFilter === 'verified' && { color: colors.filterActiveText, fontWeight: '700' }]}>
              Verified Only
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }, activeFilter === 'ramp' && { backgroundColor: colors.filterActiveBg, borderColor: colors.accent }]}
            onPress={() => setActiveFilter('ramp')}
          >
            <MaterialCommunityIcons name="wheelchair" size={14} color={activeFilter === 'ramp' ? colors.filterActiveText : colors.accentLight} />
            <Text style={[styles.filterChipText, { color: activeFilter === 'ramp' ? colors.filterActiveText : colors.textSecondary }, activeFilter === 'ramp' && { color: colors.filterActiveText, fontWeight: '700' }]}>
              Wheelchair Ramp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }, activeFilter === 'stepFree' && { backgroundColor: colors.filterActiveBg, borderColor: colors.accent }]}
            onPress={() => setActiveFilter('stepFree')}
          >
            <MaterialCommunityIcons name="walk" size={14} color={activeFilter === 'stepFree' ? colors.filterActiveText : colors.accentLight} />
            <Text style={[styles.filterChipText, { color: activeFilter === 'stepFree' ? colors.filterActiveText : colors.textSecondary }, activeFilter === 'stepFree' && { color: colors.filterActiveText, fontWeight: '700' }]}>
              Step-free Entrance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }, activeFilter === 'toilet' && { backgroundColor: colors.filterActiveBg, borderColor: colors.accent }]}
            onPress={() => setActiveFilter('toilet')}
          >
            <MaterialCommunityIcons name="human-handsdown" size={14} color={activeFilter === 'toilet' ? colors.filterActiveText : colors.accentLight} />
            <Text style={[styles.filterChipText, { color: activeFilter === 'toilet' ? colors.filterActiveText : colors.textSecondary }, activeFilter === 'toilet' && { color: colors.filterActiveText, fontWeight: '700' }]}>
              Accessible Toilet
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {viewMode === 'map' ? (
        <ScrollView style={styles.scrollWrapper} showsVerticalScrollIndicator={false}>
          <InteractiveMap
            places={filteredPlaces}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={handleSelectPlace}
          />

          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>DISCOVER PLACES ({filteredPlaces.length})</Text>
          {filteredPlaces.map((item, index) => {
            const statusColor = getStatusColor(item.status);
            return (
              <AnimatedCard key={item.id} delay={index * 80}>
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                activeOpacity={0.85}
                onPress={() => handleSelectPlace(item)}
              >
                <Image source={{ uri: item.photos[0] }} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleToggleSave(item.id)}
                      style={styles.cardSaveBtn}
                    >
                      <Ionicons
                        name={item.saved ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={item.saved ? colors.accent : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.cardAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.address}
                  </Text>

                  <View style={styles.featureRow}>
                    {item.features.ramp && (
                      <View style={[styles.badgePill, { backgroundColor: colors.featureTagBg }]}>
                        <MaterialCommunityIcons name="wheelchair" size={12} color={colors.statusDotVerified} />
                        <Text style={[styles.badgeText, { color: colors.featureTagText }]}>Ramp</Text>
                      </View>
                    )}
                    {item.features.elevator && (
                      <View style={[styles.badgePill, { backgroundColor: colors.featureTagBg }]}>
                        <MaterialCommunityIcons name="elevator-passenger" size={12} color={colors.statusDotVerified} />
                        <Text style={[styles.badgeText, { color: colors.featureTagText }]}>Elevator</Text>
                      </View>
                    )}
                    {item.features.toilet && (
                      <View style={[styles.badgePill, { backgroundColor: colors.featureTagBg }]}>
                        <MaterialCommunityIcons name="human-handsdown" size={12} color={colors.statusDotVerified} />
                        <Text style={[styles.badgeText, { color: colors.featureTagText }]}>Toilet</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {item.status.toUpperCase()}
                    </Text>
                    <Text style={[styles.confirmsText, { color: colors.textMuted }]}>
                      • {item.confirmCount} Confirms ({item.disputeCount} Disputes)
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              </AnimatedCard>
            );
          })}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const statusColor = getStatusColor(item.status);
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                activeOpacity={0.85}
                onPress={() => handleSelectPlace(item)}
              >
                <Image source={{ uri: item.photos[0] }} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                    <TouchableOpacity onPress={() => handleToggleSave(item.id)}>
                      <Ionicons
                        name={item.saved ? 'bookmark' : 'bookmark-outline'}
                        size={20}
                        color={item.saved ? colors.accent : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.cardAddress, { color: colors.textSecondary }]}>{item.address}</Text>
                  <View style={styles.featureRow}>
                    {item.features.ramp && (
                      <View style={[styles.badgePill, { backgroundColor: colors.featureTagBg }]}>
                        <Text style={[styles.badgeText, { color: colors.featureTagText }]}>Ramp</Text>
                      </View>
                    )}
                    {item.features.elevator && (
                      <View style={[styles.badgePill, { backgroundColor: colors.featureTagBg }]}>
                        <Text style={[styles.badgeText, { color: colors.featureTagText }]}>Elevator</Text>
                      </View>
                    )}
                    {item.features.toilet && (
                      <View style={[styles.badgePill, { backgroundColor: colors.featureTagBg }]}>
                        <Text style={[styles.badgeText, { color: colors.featureTagText }]}>Accessible Restroom</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {item.status.toUpperCase()}
                    </Text>
                    <Text style={[styles.confirmsText, { color: colors.textMuted }]}>
                      {item.confirmCount} confirmations
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <PlaceDetailsModal
        place={activeModalPlace}
        visible={!!activeModalPlace}
        onClose={() => setActiveModalPlace(null)}
        onToggleSave={handleToggleSave}
        onReportUpdate={() => {
          setActiveModalPlace(null);
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  viewToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterScroll: {
    marginTop: 10,
    marginBottom: 4,
  },
  filterContainer: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardImage: {
    width: 100,
    height: '100%',
    minHeight: 110,
  },
  cardInfo: {
    flex: 1,
    padding: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  cardSaveBtn: {
    padding: 2,
  },
  cardAddress: {
    fontSize: 11,
    marginTop: 2,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  confirmsText: {
    fontSize: 10,
  },
});
