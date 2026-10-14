import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  ActivityIndicator,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { AnimatedCard } from '@/components/AnimatedComponents';
import { InteractiveMap } from '@/components/InteractiveMap';
import { PlaceDetailsModal } from '@/components/PlaceDetailsModal';
import { Place, StatusType } from '@/types/accessibility';
import { PlaceSearchResult, matchesQuery, searchPlaces } from '@/lib/placeSearch';
import { searchPlacesWithAi } from '@/lib/aiSearch';
import { useUserLocation } from '@/hooks/useUserLocation';

type FilterType =
  | 'all'
  | 'verified'
  | 'pending'
  | 'disputed'
  | 'ramp'
  | 'stepFree'
  | 'elevator'
  | 'toilet'
  | 'braille';

const EMPTY_FEATURES = {
  ramp: false,
  elevator: false,
  toilet: false,
  parking: false,
  stepFree: false,
  tactilePaving: false,
  automaticDoor: false,
  brailleSignage: false,
};

const geoResultToPlace = (result: PlaceSearchResult): Place => ({
  id: `geo-${result.place_id}`,
  name: result.name || result.display_name.split(',')[0] || 'Search Result',
  category: 'Searched Area',
  address: result.display_name,
  lat: result.lat,
  lng: result.lon,
  features: { ...EMPTY_FEATURES },
  photos: [],
  confirmCount: 0,
  disputeCount: 0,
  status: 'pending',
  saved: false,
  description: 'Community-searched location on the interactive map.',
});

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { places, selectedPlaceId, setSelectedPlaceId, toggleSavePlace, aiMarkers } = useApp();
  const { colors, isDark } = useAppTheme();
  const { showToast } = useToast();
  const { location: userLocation, refreshLocation, isLoading: locationLoading } = useUserLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [activeModalPlace, setActiveModalPlace] = useState<Place | null>(null);

  // Worldwide geocoding results when searching manually for other areas
  const [worldResults, setWorldResults] = useState<PlaceSearchResult[]>([]);
  const [isWorldSearching, setIsWorldSearching] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState<Place | null>(null);
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiHint, setAiHint] = useState<string | undefined>(undefined);
  const worldSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const worldSearchRequestId = useRef(0);

  // Filter places based on search query and accessibility filters
  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      const matchesSearch = matchesQuery(
        `${place.name} ${place.category} ${place.address}`,
        searchQuery
      );

      if (!matchesSearch) return false;

      switch (activeFilter) {
        case 'verified':
          return place.status === 'verified';
        case 'pending':
          return place.status === 'pending';
        case 'disputed':
          return place.status === 'disputed';
        case 'ramp':
          return !!place.features.ramp;
        case 'stepFree':
          return !!place.features.stepFree;
        case 'elevator':
          return !!place.features.elevator;
        case 'toilet':
          return !!place.features.toilet;
        case 'braille':
          return !!place.features.brailleSignage || !!place.features.tactilePaving;
        case 'all':
        default:
          return true;
      }
    });
  }, [places, searchQuery, activeFilter]);

  // Geocoding fallback: search external open places if query has no local matches
  useEffect(() => {
    if (worldSearchDebounce.current) clearTimeout(worldSearchDebounce.current);
    const requestId = ++worldSearchRequestId.current;
    const trimmed = searchQuery.trim();

    if (trimmed.length < 2 || filteredPlaces.length > 0) {
      setWorldResults([]);
      setIsWorldSearching(false);
      return;
    }

    setIsWorldSearching(true);
    worldSearchDebounce.current = setTimeout(async () => {
      try {
        const outcome = aiSearchMode
          ? await searchPlacesWithAi(trimmed, { limit: 6 })
          : { results: await searchPlaces(trimmed, { limit: 6 }), hint: undefined };
        if (worldSearchRequestId.current !== requestId) return;
        setWorldResults(outcome.results);
        setAiHint(outcome.hint);
      } catch {
        if (worldSearchRequestId.current === requestId) {
          setWorldResults([]);
          setAiHint(undefined);
        }
      } finally {
        if (worldSearchRequestId.current === requestId) setIsWorldSearching(false);
      }
    }, 450);

    return () => {
      if (worldSearchDebounce.current) clearTimeout(worldSearchDebounce.current);
    };
  }, [searchQuery, filteredPlaces.length, aiSearchMode]);

  const clearSearch = () => {
    setSearchQuery('');
    setWorldResults([]);
    setAiHint(undefined);
    setSearchedPlace(null);
    setIsWorldSearching(false);
    if (worldSearchDebounce.current) clearTimeout(worldSearchDebounce.current);
  };

  const handleSelectWorldResult = (result: PlaceSearchResult) => {
    const newPlace = geoResultToPlace(result);
    setSearchedPlace(newPlace);
    setWorldResults([]);
    setViewMode('map');
    showToast(`Centered map on ${result.name || result.display_name.split(',')[0]}`, 'success');
  };

  // Base places + AI markers + manual searched place, deduped by ID
  const mapPlaces = useMemo(() => {
    const seen = new Set<string>();
    return [...filteredPlaces, ...aiMarkers, ...(searchedPlace ? [searchedPlace] : [])].filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [filteredPlaces, aiMarkers, searchedPlace]);

  // Handle marker selection -> Opens Place Details Screen / Modal
  const handleSelectPlace = useCallback(
    (place: Place) => {
      setSelectedPlaceId(place.id);
      setActiveModalPlace(place);

      // Announce for accessibility screen readers
      const accessibilityStatusText =
        place.status === 'verified'
          ? 'Fully accessible'
          : place.status === 'disputed'
          ? 'Not accessible or disputed'
          : 'Partially accessible';

      AccessibilityInfo.announceForAccessibility(
        `Selected ${place.name}, ${accessibilityStatusText}. Opening details.`
      );
    },
    [setSelectedPlaceId]
  );

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

  const handleLocateMe = async () => {
    showToast('Locating your position...', 'info', 'navigate');
    const loc = await refreshLocation();
    if (loc) {
      showToast('Centered on your location', 'success', 'location-sharp');
    } else {
      showToast('Could not access GPS location. Check device permissions.', 'warning', 'alert-circle');
    }
  };

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return '#10B981'; // Green: Fully Accessible
      case 'disputed':
        return '#EF4444'; // Red: Not Accessible / Disputed
      case 'pending':
      default:
        return '#F59E0B'; // Yellow: Partially Accessible / Pending
    }
  };

  const getStatusLabel = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return 'FULLY ACCESSIBLE';
      case 'disputed':
        return 'NOT ACCESSIBLE';
      case 'pending':
      default:
        return 'PARTIALLY ACCESSIBLE';
    }
  };

  // User location formatted object for InteractiveMap
  const userCoords = userLocation
    ? { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude }
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Bar */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.headerBorder,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <View style={styles.headerTitleContainer}>
          <View style={styles.appIconBadge}>
            <Ionicons name="accessibility" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.appTitle, { color: colors.textPrimary }]}>Accessibility Map</Text>
            <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>
              {places.length} public spaces mapped • Step-free routes
            </Text>
          </View>
        </View>

        {/* View Mode Toggle Button: Map View vs Accessible List View */}
        <TouchableOpacity
          style={[
            styles.viewToggleBtn,
            { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
          ]}
          onPress={() => setViewMode((prev) => (prev === 'map' ? 'list' : 'map'))}
          accessibilityRole="button"
          accessibilityLabel={viewMode === 'map' ? 'Switch to accessible list view' : 'Switch to interactive map view'}
          accessibilityHint="Toggles between interactive map view and card list view"
        >
          <Ionicons
            name={viewMode === 'map' ? 'list' : 'map'}
            size={16}
            color={colors.accent}
          />
          <Text style={[styles.viewToggleText, { color: colors.accent }]}>
            {viewMode === 'map' ? 'List View' : 'Map View'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Area Selection Section */}
      <View style={[styles.searchSection, { backgroundColor: colors.headerBg }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
          ]}
        >
          <Ionicons
            name={aiSearchMode ? 'sparkles' : 'search'}
            size={18}
            color={aiSearchMode ? colors.accent : colors.textMuted}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={
              aiSearchMode
                ? 'Ask AI: "parks with ramps near Colombo"...'
                : 'Search places, transit, parks, or areas...'
            }
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (searchedPlace) setSearchedPlace(null);
            }}
            accessibilityLabel="Search public places or areas"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={clearSearch}
              accessibilityRole="button"
              accessibilityLabel="Clear search input"
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* AI Search Assistant Toggle */}
          <TouchableOpacity
            onPress={() => setAiSearchMode((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={aiSearchMode ? 'Disable AI search' : 'Enable AI semantic search'}
            style={[
              styles.aiSearchBtn,
              { backgroundColor: aiSearchMode ? colors.accent : colors.chipBorder },
            ]}
          >
            <Ionicons
              name="sparkles"
              size={13}
              color={aiSearchMode ? '#FFFFFF' : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Global Area Search Dropdown */}
        {searchQuery.trim().length >= 2 && filteredPlaces.length === 0 && !searchedPlace && (
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                marginTop: 8,
                height: 'auto',
                paddingVertical: 10,
              },
            ]}
          >
            {isWorldSearching ? (
              <View style={styles.searchingRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 8 }}>
                  Searching public spaces & areas globally...
                </Text>
              </View>
            ) : worldResults.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 12, paddingVertical: 4 }}>
                {`No places found for "${searchQuery.trim()}". Try zooming or typing another area.`}
              </Text>
            ) : (
              <View style={{ width: '100%' }}>
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 0.6,
                    marginBottom: 6,
                  }}
                >
                  {aiSearchMode ? 'AI SUGGESTED PLACES' : 'PLACES IN THIS AREA (TAP TO VIEW)'}
                </Text>
                {!!aiHint && (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 11,
                      marginBottom: 8,
                      fontStyle: 'italic',
                    }}
                  >
                    {aiHint}
                  </Text>
                )}
                {worldResults.map((r) => (
                  <TouchableOpacity
                    key={r.place_id}
                    onPress={() => handleSelectWorldResult(r)}
                    style={styles.searchResultItem}
                    accessibilityRole="button"
                    accessibilityLabel={`Move map to ${r.display_name}`}
                  >
                    <Ionicons
                      name="location"
                      size={16}
                      color="#FF5A36"
                      style={{ marginTop: 2, marginRight: 8 }}
                    />
                    <Text
                      numberOfLines={2}
                      style={{ color: colors.textPrimary, fontSize: 13, flex: 1, fontWeight: '500' }}
                    >
                      {r.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Accessibility Status & Feature Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {/* All */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
              activeFilter === 'all' && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => setActiveFilter('all')}
            accessibilityRole="button"
            accessibilityLabel={`Show all ${places.length} places`}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'all' ? '#FFFFFF' : colors.textSecondary },
                activeFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All ({places.length})
            </Text>
          </TouchableOpacity>

          {/* Fully Accessible (Green) */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
              activeFilter === 'verified' && { backgroundColor: '#10B981', borderColor: '#10B981' },
            ]}
            onPress={() => setActiveFilter('verified')}
            accessibilityRole="button"
            accessibilityLabel="Filter by fully accessible verified places"
          >
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={activeFilter === 'verified' ? '#FFFFFF' : '#10B981'}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'verified' ? '#FFFFFF' : colors.textSecondary },
                activeFilter === 'verified' && styles.filterChipTextActive,
              ]}
            >
              Fully Accessible
            </Text>
          </TouchableOpacity>

          {/* Partially Accessible (Yellow) */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
              activeFilter === 'pending' && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
            ]}
            onPress={() => setActiveFilter('pending')}
            accessibilityRole="button"
            accessibilityLabel="Filter by partially accessible places"
          >
            <Ionicons
              name="time"
              size={14}
              color={activeFilter === 'pending' ? '#FFFFFF' : '#F59E0B'}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'pending' ? '#FFFFFF' : colors.textSecondary },
                activeFilter === 'pending' && styles.filterChipTextActive,
              ]}
            >
              Partially Accessible
            </Text>
          </TouchableOpacity>

          {/* Wheelchair Ramps */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
              activeFilter === 'ramp' && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => setActiveFilter('ramp')}
            accessibilityRole="button"
            accessibilityLabel="Filter places with wheelchair ramps"
          >
            <MaterialCommunityIcons
              name="wheelchair"
              size={14}
              color={activeFilter === 'ramp' ? '#FFFFFF' : colors.accent}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'ramp' ? '#FFFFFF' : colors.textSecondary },
                activeFilter === 'ramp' && styles.filterChipTextActive,
              ]}
            >
              Wheelchair Ramps
            </Text>
          </TouchableOpacity>

          {/* Elevators */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
              activeFilter === 'elevator' && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => setActiveFilter('elevator')}
            accessibilityRole="button"
            accessibilityLabel="Filter places with elevators"
          >
            <MaterialCommunityIcons
              name="elevator-passenger"
              size={14}
              color={activeFilter === 'elevator' ? '#FFFFFF' : colors.accent}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'elevator' ? '#FFFFFF' : colors.textSecondary },
                activeFilter === 'elevator' && styles.filterChipTextActive,
              ]}
            >
              Elevators
            </Text>
          </TouchableOpacity>

          {/* Accessible Restrooms */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
              activeFilter === 'toilet' && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => setActiveFilter('toilet')}
            accessibilityRole="button"
            accessibilityLabel="Filter places with accessible restrooms"
          >
            <MaterialCommunityIcons
              name="human-handsdown"
              size={14}
              color={activeFilter === 'toilet' ? '#FFFFFF' : colors.accent}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'toilet' ? '#FFFFFF' : colors.textSecondary },
                activeFilter === 'toilet' && styles.filterChipTextActive,
              ]}
            >
              Accessible Toilets
            </Text>
          </TouchableOpacity>

          {/* Braille & Tactile Signage */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
              activeFilter === 'braille' && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => setActiveFilter('braille')}
            accessibilityRole="button"
            accessibilityLabel="Filter places with braille signage or tactile paths"
          >
            <MaterialCommunityIcons
              name="braille"
              size={14}
              color={activeFilter === 'braille' ? '#FFFFFF' : colors.accent}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'braille' ? '#FFFFFF' : colors.textSecondary },
                activeFilter === 'braille' && styles.filterChipTextActive,
              ]}
            >
              Braille & Tactile
            </Text>
          </TouchableOpacity>

          {/* Step-Free */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
              activeFilter === 'stepFree' && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => setActiveFilter('stepFree')}
            accessibilityRole="button"
            accessibilityLabel="Filter places with step-free entrances"
          >
            <MaterialCommunityIcons
              name="walk"
              size={14}
              color={activeFilter === 'stepFree' ? '#FFFFFF' : colors.accent}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'stepFree' ? '#FFFFFF' : colors.textSecondary },
                activeFilter === 'stepFree' && styles.filterChipTextActive,
              ]}
            >
              Step-Free
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main View: Interactive Map or Accessible List */}
      {viewMode === 'map' ? (
        <ScrollView style={styles.scrollWrapper} showsVerticalScrollIndicator={false}>
          {/* Component 1 Interactive Map Canvas */}
          <InteractiveMap
            places={mapPlaces}
            selectedPlaceId={selectedPlaceId || searchedPlace?.id || null}
            userLocation={userCoords}
            onSelectPlace={handleSelectPlace}
            onLocateMe={handleLocateMe}
          />

          {/* Public Places Feed Below Map */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
              EXPLORE PUBLIC SPACES ({filteredPlaces.length})
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
              Tap pin or card to inspect
            </Text>
          </View>

          {filteredPlaces.map((item, index) => {
            const statusColor = getStatusColor(item.status);
            const statusLabel = getStatusLabel(item.status);
            return (
              <AnimatedCard key={item.id} delay={index * 60}>
                <TouchableOpacity
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    selectedPlaceId === item.id && {
                      borderColor: '#FF5A36',
                      borderWidth: 2,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleSelectPlace(item)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${item.category}, located at ${item.address}. Status: ${statusLabel}. ${item.confirmCount} community confirmations.`}
                >
                  <Image source={{ uri: item.photos[0] }} style={styles.cardImage} />

                  <View style={styles.cardInfo}>
                    <View style={styles.cardTitleRow}>
                      <Text
                        style={[styles.cardTitle, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleToggleSave(item.id)}
                        style={styles.cardSaveBtn}
                        accessibilityRole="button"
                        accessibilityLabel={item.saved ? 'Remove bookmark' : 'Bookmark place'}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={item.saved ? 'bookmark' : 'bookmark-outline'}
                          size={18}
                          color={item.saved ? colors.accent : colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text
                      style={[styles.cardAddress, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.address}
                    </Text>

                    {/* Accessibility feature chips */}
                    <View style={styles.featureRow}>
                      {item.features.ramp && (
                        <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                          <MaterialCommunityIcons name="wheelchair" size={12} color="#10B981" />
                          <Text style={[styles.badgeText, { color: '#10B981' }]}>Ramp</Text>
                        </View>
                      )}
                      {item.features.elevator && (
                        <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                          <MaterialCommunityIcons name="elevator-passenger" size={12} color="#10B981" />
                          <Text style={[styles.badgeText, { color: '#10B981' }]}>Elevator</Text>
                        </View>
                      )}
                      {item.features.toilet && (
                        <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                          <MaterialCommunityIcons name="human-handsdown" size={12} color="#10B981" />
                          <Text style={[styles.badgeText, { color: '#10B981' }]}>Toilet</Text>
                        </View>
                      )}
                      {item.features.brailleSignage && (
                        <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                          <MaterialCommunityIcons name="braille" size={12} color="#10B981" />
                          <Text style={[styles.badgeText, { color: '#10B981' }]}>Braille</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                      <Text style={[styles.confirmsText, { color: colors.textMuted }]}>
                        • {item.confirmCount} Confirms
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </AnimatedCard>
            );
          })}
        </ScrollView>
      ) : (
        /* Accessible Full List View for Screen Reader Users */
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const statusColor = getStatusColor(item.status);
            const statusLabel = getStatusLabel(item.status);
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                activeOpacity={0.85}
                onPress={() => handleSelectPlace(item)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.address}. Accessibility: ${statusLabel}. Confirmed by ${item.confirmCount} people.`}
              >
                <Image source={{ uri: item.photos[0] }} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleToggleSave(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Save place"
                    >
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
                      <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>Ramp</Text>
                      </View>
                    )}
                    {item.features.elevator && (
                      <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>Elevator</Text>
                      </View>
                    )}
                    {item.features.toilet && (
                      <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>Toilet</Text>
                      </View>
                    )}
                    {item.features.brailleSignage && (
                      <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>Braille</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                    <Text style={[styles.confirmsText, { color: colors.textMuted }]}>
                      • {item.confirmCount} Confirmations ({item.disputeCount} flags)
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Place Details Modal on Pin Tap */}
      <PlaceDetailsModal
        place={activeModalPlace}
        visible={!!activeModalPlace}
        onClose={() => setActiveModalPlace(null)}
        onToggleSave={handleToggleSave}
        onReportUpdate={() => {
          setActiveModalPlace(null);
          router.push({
            pathname: '/report-issue',
            params: {
              placeId: activeModalPlace?.id,
              placeName: activeModalPlace?.name,
              category: activeModalPlace?.category,
              address: activeModalPlace?.address,
              lat: activeModalPlace?.lat,
              lng: activeModalPlace?.lng,
              step: '2',
            },
          } as any);
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
  appIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FF5A36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  appSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  aiSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  searchResultItem: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    fontWeight: '800',
  },
  scrollWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardImage: {
    width: 105,
    height: '100%',
    minHeight: 115,
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
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  cardSaveBtn: {
    padding: 2,
  },
  cardAddress: {
    fontSize: 11,
    marginTop: 3,
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
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
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
