import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { AccessibilityAgentChat } from '@/components/AccessibilityAgentChat';
import { Place, StatusType, AccessibilityFeatures } from '@/types/accessibility';

/** Extract numeric coordinates from an AI tool result (lat/lng fields or PostGIS WKT). */
const extractLatLng = (src: any): { lat: number; lng: number } => {
  if (typeof src?.lat === 'number' && typeof src?.lng === 'number') {
    return { lat: src.lat, lng: src.lng };
  }
  if (typeof src?.latitude === 'number' && typeof src?.longitude === 'number') {
    return { lat: src.latitude, lng: src.longitude };
  }
  const wkt =
    typeof src?.location === 'string'
      ? src.location.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i)
      : null;
  if (wkt) return { lng: Number(wkt[1]), lat: Number(wkt[2]) };
  return { lat: 0, lng: 0 };
};

/** Map AI feature lists ("ramp", "elevator"...) onto the boolean feature flags. */
const extractFeatures = (features: any): AccessibilityFeatures => {
  const flags: AccessibilityFeatures = {
    ramp: false,
    elevator: false,
    toilet: false,
    parking: false,
    stepFree: false,
    tactilePaving: false,
    automaticDoor: false,
  };
  if (Array.isArray(features)) {
    const tokens: string[] = features.map((f: unknown) =>
      String(f).toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    const has = (...aliases: string[]) => aliases.some((a) => tokens.includes(a));
    flags.ramp = has('ramp', 'wheelchairramp');
    flags.elevator = has('elevator', 'lift');
    flags.toilet = has('toilet', 'restroom', 'accessibletoilet');
    flags.parking = has('parking', 'accessibleparking');
    flags.stepFree = has('stepfree');
    flags.tactilePaving = has('tactilepaving');
    flags.automaticDoor = has('automaticdoor', 'autodoor');
  } else if (features && typeof features === 'object') {
    return { ...flags, ...features };
  }
  return flags;
};

/** Normalize an AI tool payload into a Place the map & details modal can render. */
const normalizeMarker = (raw: any): Place => {
  // addAccessiblePlace wraps its row as { status: 'created', place: {...} }
  const src = raw?.place ?? raw;
  const { lat, lng } = extractLatLng(src);
  const rawStatus = String(src?.status ?? '');
  const status = (['verified', 'pending', 'disputed'] as const).some((s) => s === rawStatus)
    ? (rawStatus as StatusType)
    : 'pending';
  return {
    id: String(src?.id ?? src?.place_id ?? `ai-${lat}-${lng}-${Date.now()}`),
    name: src?.name ?? src?.place_name ?? 'Accessible Place',
    category: src?.category ?? 'AI Added',
    address: typeof src?.address === 'string' ? src.address : 'Added by the AI assistant',
    lat,
    lng,
    features: extractFeatures(src?.features),
    photos: Array.isArray(src?.photos) ? src.photos : [],
    confirmCount: Number(src?.confirmCount ?? src?.confirm_count ?? 0),
    disputeCount: Number(src?.disputeCount ?? src?.dispute_count ?? 0),
    status,
    saved: false,
    description: typeof src?.description === 'string' ? src.description : undefined,
  };
};

/**
 * Dedicated AI assistant tab.
 *
 * The chat used to float over the Map screen, where its bar covered the
 * bottom of the place list. It now owns a full screen here, and anything
 * the assistant finds or adds is written into shared app state so the Map
 * tab still renders those pins.
 */
export default function AssistantScreen() {
  const { colors } = useAppTheme();
  const { addAiMarker, setAiMarkers } = useApp();

  // Mirror the assistant's tool results into shared state for the Map tab.
  const handlePlaceAdded = (placeData: any) => addAiMarker(normalizeMarker(placeData));

  const handlePlacesFound = (placesData: any[]) =>
    setAiMarkers(
      (Array.isArray(placesData) ? placesData : []).map(normalizeMarker).filter((m) => m.lat !== 0 || m.lng !== 0)
    );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder },
        ]}
      >
        <View style={[styles.headerIcon, { backgroundColor: colors.accentBg }]}>
          <Ionicons name="sparkles" size={20} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Accessibility Assistant
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Ask about accessible places near you
          </Text>
        </View>
      </View>

      <View style={styles.chatBody}>
        <AccessibilityAgentChat
          onPlaceAdded={handlePlaceAdded}
          onPlacesFound={handlePlacesFound}
        />
      </View>
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  chatBody: {
    flex: 1,
  },
});
