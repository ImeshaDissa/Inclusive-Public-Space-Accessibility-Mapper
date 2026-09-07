import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { PlaceCategory, SavedCategoryPlace, SelectedVenuePayload } from '@/types/categoryPlaces';
import { PLACE_CATEGORIES } from '@/constants/placeCategories';
import { SAVED_DATABASE_PLACES } from '@/constants/savedCategoryPlaces';
import { calculateDistanceMeters, formatDistanceLabel } from '@/lib/geoUtils';
import { Place } from '@/types/accessibility';

interface CategoryPlacesSectionProps {
  coords: { latitude: number; longitude: number };
  detectedAddress: string;
  detectedSpotName?: string;
  registeredPlaces?: Place[];
  selectedVenue: SelectedVenuePayload | null;
  onSelectVenue: (payload: SelectedVenuePayload) => void;
}

export function CategoryPlacesSection({
  coords,
  detectedAddress,
  detectedSpotName = '',
  registeredPlaces = [],
  selectedVenue,
  onSelectVenue,
}: CategoryPlacesSectionProps) {
  const { colors } = useAppTheme();

  // Active selected category
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    selectedVenue?.categoryId || 'mall'
  );
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [customNameInput, setCustomNameInput] = useState<string>('');

  // Keep activeCategoryId in sync if selectedVenue categoryId changes externally
  React.useEffect(() => {
    if (selectedVenue?.categoryId && selectedVenue.categoryId !== activeCategoryId) {
      setActiveCategoryId(selectedVenue.categoryId);
    }
  }, [selectedVenue?.categoryId]);

  const activeCategory = useMemo(() => {
    return PLACE_CATEGORIES.find((c) => c.id === activeCategoryId) || PLACE_CATEGORIES[0];
  }, [activeCategoryId]);

  // Combine database places with any app registered places matching this category
  const matchingSavedPlaces = useMemo(() => {
    // 1. Places from our saved database mock
    const dbPlaces = SAVED_DATABASE_PLACES.filter((p) => p.categoryId === activeCategoryId);

    // 2. Any additional places from AppContext matching category name
    const extraContextPlaces = registeredPlaces.filter((p) => {
      const pCat = p.category.toLowerCase();
      const matchCat = activeCategory.name.toLowerCase();
      return pCat.includes(matchCat) || matchCat.includes(pCat);
    });

    // Merge by id
    const all = [...dbPlaces];
    extraContextPlaces.forEach((ep) => {
      if (!all.some((p) => p.id === ep.id)) {
        all.push({
          ...ep,
          categoryId: activeCategoryId,
        });
      }
    });

    // Compute distance to pinned map coordinate
    return all.map((place) => {
      const distance = calculateDistanceMeters(coords.latitude, coords.longitude, place.lat, place.lng);
      return {
        ...place,
        distanceMeters: distance,
      };
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [activeCategoryId, activeCategory, coords, registeredPlaces]);

  // Handle choosing a category: update category and sync selected location & category together
  const handleSelectCategory = (category: PlaceCategory) => {
    setActiveCategoryId(category.id);
    setIsAddingCustom(false);

    const placeName =
      detectedSpotName ||
      (selectedVenue && selectedVenue.isNewCustomPlace && selectedVenue.name !== 'Pinned Map Spot' && selectedVenue.name !== 'Pinned Location'
        ? selectedVenue.name
        : `${category.name} at Selected Location`);

    onSelectVenue({
      placeId: undefined,
      name: placeName,
      category: category.name,
      categoryId: category.id,
      address: detectedAddress || (selectedVenue?.address ?? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`),
      isNewCustomPlace: true,
    });
  };

  // Handle picking a saved database place
  const handlePickSavedPlace = (place: SavedCategoryPlace & { distanceMeters: number }) => {
    setIsAddingCustom(false);
    onSelectVenue({
      placeId: place.id,
      name: place.name,
      category: place.category,
      categoryId: activeCategoryId,
      address: place.address,
      isNewCustomPlace: false,
    });
  };

  // Handle submitting a new custom place under this category
  const handleConfirmCustomPlace = () => {
    const trimmed = customNameInput.trim();
    if (!trimmed) return;

    onSelectVenue({
      name: trimmed,
      category: activeCategory.name,
      categoryId: activeCategoryId,
      address: detectedAddress || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      isNewCustomPlace: true,
    });
    setIsAddingCustom(false);
  };

  return (
    <View style={styles.container}>
      {/* ── 1. Category Selector Header ──────────────────────────── */}
      <View style={styles.sectionHeaderBlock}>
        <View style={styles.titleRow}>
          <Ionicons name="grid-outline" size={16} color={colors.accent} />
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            SELECT VENUE CATEGORY
          </Text>
        </View>
        <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
          Choose a category to explore mapped locations
        </Text>
      </View>

      {/* ── 2. Category Chips Carousel ───────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {PLACE_CATEGORIES.map((cat) => {
          const isSelected = activeCategoryId === cat.id;
          const count = SAVED_DATABASE_PLACES.filter((p) => p.categoryId === cat.id).length;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handleSelectCategory(cat)}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: isSelected ? colors.accentBg : colors.card,
                  borderColor: isSelected ? colors.accent : colors.cardBorder,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Category: ${cat.name}`}
            >
              <View
                style={[
                  styles.categoryIconWrap,
                  { backgroundColor: isSelected ? colors.card : cat.bgColor },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={20}
                  color={isSelected ? colors.accent : cat.color}
                />
              </View>
              <Text
                style={[
                  styles.categoryCardName,
                  {
                    color: isSelected ? colors.accent : colors.textPrimary,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
                numberOfLines={1}
              >
                {cat.shortLabel}
              </Text>
              <Text style={[styles.categoryCardCount, { color: colors.textMuted }]}>
                {count} {count === 1 ? 'place' : 'places'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── 3. Active / Currently Selected Venue Banner ──────────── */}
      {selectedVenue && (
        <View
          style={[
            styles.selectedHeroCard,
            { backgroundColor: colors.card, borderColor: colors.accent },
          ]}
        >
          <View style={styles.selectedHeroHeader}>
            <View style={[styles.heroIconWrap, { backgroundColor: colors.accentBg }]}>
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.heroCategoryTag, { color: colors.accent }]}>
                  {selectedVenue.category.toUpperCase()}
                </Text>
                {selectedVenue.isNewCustomPlace ? (
                  <View style={[styles.pillBadge, { backgroundColor: colors.chipBg }]}>
                    <Text style={[styles.pillBadgeText, { color: colors.textSecondary }]}>Pinned Location</Text>
                  </View>
                ) : (
                  <View style={[styles.pillBadge, { backgroundColor: colors.badgeVerifiedBg }]}>
                    <Text style={[styles.pillBadgeText, { color: colors.badgeVerifiedText }]}>Verified Place</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.heroVenueTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {selectedVenue.name}
              </Text>
            </View>
            <View style={[styles.selectedPill, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
              <Ionicons name="checkmark" size={13} color={colors.statusDotVerified} />
              <Text style={[styles.selectedPillText, { color: colors.statusDotVerified }]}>Selected</Text>
            </View>
          </View>
          <Text style={[styles.heroVenueAddress, { color: colors.textMuted }]} numberOfLines={1}>
            {selectedVenue.address}
          </Text>
        </View>
      )}

      {/* ── 4. Mapped Places Nearby for Category ─────────────────── */}
      <View style={styles.subSectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="file-tray-full-outline" size={15} color={colors.accent} />
          <Text style={[styles.subSectionTitle, { color: colors.textPrimary }]}>
            Mapped {activeCategory.name}s Nearby
          </Text>
        </View>
        <Text style={[styles.savedDbCount, { color: colors.textMuted }]}>
          {matchingSavedPlaces.length} mapped
        </Text>
      </View>

      <Text style={[styles.subSectionHint, { color: colors.textMuted }]}>
        Select a verified location or confirm accessibility for your pinned spot:
      </Text>

      {/* ── Horizontal list of mapped places ─────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.savedPlacesScroll}
      >
        {/* "+ Add New Place at Pin" Card */}
        <TouchableOpacity
          onPress={() => {
            setIsAddingCustom(true);
            if (!customNameInput && detectedSpotName) {
              setCustomNameInput(detectedSpotName);
            }
          }}
          style={[
            styles.savedPlaceCard,
            styles.addNewPlaceCard,
            {
              backgroundColor: isAddingCustom ? colors.accentBg : colors.chipBg,
              borderColor: isAddingCustom ? colors.accent : colors.chipBorder,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Add new ${activeCategory.name} at this location`}
        >
          <View style={[styles.addNewIconWrap, { backgroundColor: colors.card }]}>
            <Ionicons name="add" size={22} color={colors.accent} />
          </View>
          <Text style={[styles.addNewTitle, { color: colors.textPrimary }]}>
            + Add New {activeCategory.shortLabel}
          </Text>
          <Text style={[styles.addNewSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
            Pin a new {activeCategory.name.toLowerCase()} at this map spot
          </Text>
        </TouchableOpacity>

        {/* Existing Saved Database Places */}
        {matchingSavedPlaces.map((place) => {
          const isSelected = selectedVenue?.placeId === place.id;
          return (
            <TouchableOpacity
              key={place.id}
              onPress={() => handlePickSavedPlace(place)}
              style={[
                styles.savedPlaceCard,
                {
                  backgroundColor: isSelected ? colors.accentBg : colors.card,
                  borderColor: isSelected ? colors.accent : colors.cardBorder,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Select saved venue: ${place.name}`}
            >
              {/* Top Row: Verified badge & Distance */}
              <View style={styles.cardTopRow}>
                <View style={[styles.dbSavedPill, { backgroundColor: colors.chipBg }]}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.statusDotVerified} />
                  <Text style={[styles.dbSavedPillText, { color: colors.textSecondary }]}>Verified</Text>
                </View>
                <View style={[styles.distancePill, { backgroundColor: colors.chipBg }]}>
                  <Text style={[styles.distancePillText, { color: colors.textSecondary }]}>
                    {formatDistanceLabel(place.distanceMeters)}
                  </Text>
                </View>
              </View>

              {/* Title & Address */}
              <View>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: colors.textPrimary, fontWeight: isSelected ? '800' : '700' },
                  ]}
                  numberOfLines={2}
                >
                  {place.name}
                </Text>
                <Text style={[styles.cardAddress, { color: colors.textMuted }]} numberOfLines={1}>
                  {place.address}
                </Text>
              </View>

              {/* Accessibility Feature Icons Preview */}
              <View style={styles.cardFeaturesRow}>
                {place.features.ramp && (
                  <View style={[styles.featureDot, { backgroundColor: colors.chipBg }]}>
                    <MaterialCommunityIcons name="wheelchair" size={12} color={colors.accent} />
                  </View>
                )}
                {place.features.elevator && (
                  <View style={[styles.featureDot, { backgroundColor: colors.chipBg }]}>
                    <MaterialCommunityIcons name="elevator-passenger" size={12} color={colors.accent} />
                  </View>
                )}
                {place.features.toilet && (
                  <View style={[styles.featureDot, { backgroundColor: colors.chipBg }]}>
                    <MaterialCommunityIcons name="human-wheelchair" size={12} color={colors.accent} />
                  </View>
                )}
                {place.features.automaticDoor && (
                  <View style={[styles.featureDot, { backgroundColor: colors.chipBg }]}>
                    <MaterialCommunityIcons name="door" size={12} color={colors.accent} />
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        place.status === 'verified' ? colors.badgeVerifiedBg : colors.badgePendingBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          place.status === 'verified' ? colors.badgeVerifiedText : colors.badgePendingText,
                      },
                    ]}
                  >
                    {place.status === 'verified' ? 'Verified' : 'Pending'}
                  </Text>
                </View>
              </View>

              {isSelected && (
                <View style={[styles.cardCheckCircle, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Inline Custom Place Input Box ────────────────────────── */}
      {isAddingCustom && (
        <View style={[styles.customPlaceBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.customPlaceHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="add-circle" size={18} color={colors.accent} />
              <Text style={[styles.customPlaceTitle, { color: colors.textPrimary }]}>
                Add New {activeCategory.name} at Pinned Spot
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsAddingCustom(false)}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.customPlaceSubtitle, { color: colors.textMuted }]}>
            Pinned spot: {detectedAddress || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}
          </Text>

          <TextInput
            style={[
              styles.customInput,
              {
                backgroundColor: colors.chipBg,
                borderColor: colors.chipBorder,
                color: colors.textPrimary,
              },
            ]}
            placeholder={`Enter ${activeCategory.name} name (e.g. Liberty Plaza, Grand Mall)…`}
            placeholderTextColor={colors.textMuted}
            value={customNameInput}
            onChangeText={setCustomNameInput}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
            onPress={handleConfirmCustomPlace}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>Set as Report Venue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  sectionHeaderBlock: {
    marginBottom: 10,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stepSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  selectedHeroCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    marginBottom: 16,
  },
  selectedHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  heroIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCategoryTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  pillBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  heroVenueTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectedPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroVenueAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryScroll: {
    paddingBottom: 6,
    gap: 8,
  },
  categoryCard: {
    width: 100,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryCardName: {
    fontSize: 12,
    textAlign: 'center',
  },
  categoryCardCount: {
    fontSize: 10,
    fontWeight: '600',
  },
  subSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  savedDbCount: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  subSectionHint: {
    fontSize: 11.5,
    marginBottom: 10,
    lineHeight: 16,
  },
  savedPlacesScroll: {
    paddingBottom: 4,
    gap: 12,
  },
  savedPlaceCard: {
    width: 210,
    minHeight: 140,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    justifyContent: 'space-between',
    position: 'relative',
  },
  addNewPlaceCard: {
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: 16,
  },
  addNewIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addNewTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  addNewSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dbSavedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dbSavedPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  distancePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distancePillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 2,
  },
  cardAddress: {
    fontSize: 11,
  },
  cardFeaturesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  featureDot: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  cardCheckCircle: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPlaceBox: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  customPlaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customPlaceTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  customPlaceSubtitle: {
    fontSize: 11,
  },
  customInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    marginTop: 4,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
