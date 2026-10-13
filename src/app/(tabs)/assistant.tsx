import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { AccessibilityAgentChat } from '@/components/AccessibilityAgentChat';
import { sendPlaceAddedEmail } from '@/features/notifications/actions';
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
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const { addAiMarker, setAiMarkers, refreshCommunityData, userId, userProfile, authReady, isAuthenticated } =
    useApp();

  // The AI agent is a contribution feature — sign up / log in to use it.
  if (!authReady) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  // Mirror the assistant's tool results into shared state for the Map tab.
  const handlePlaceAdded = (placeData: any) => {
    addAiMarker(normalizeMarker(placeData));
    // "New place added" confirmation email — best-effort, never blocks the chat.
    const src = placeData?.place ?? placeData;
    if (userId && userProfile.email) {
      sendPlaceAddedEmail(userId, userProfile.email, {
        place_name: String(src?.name ?? src?.place_name ?? 'New accessible place'),
        address: typeof src?.address === 'string' ? src.address : undefined,
        category: typeof src?.category === 'string' ? src.category : undefined,
      }).catch(() => undefined);
    }
  };

  /**
   * Hand a customer who wants to add a place over to the Submit wizard, which
   * already pins a spot and writes the new place row (see CategoryPlacesSection's
   * "+ Add New" card). A toast tells them what to do once they arrive.
   */
  const handleAddPlace = () => {
    showToast('Add Place form opened — pin the spot, then tap "+ Add New".', 'info');
    router.push('/report' as any);
  };

  /** Same wizard, second step: pick the place, Continue, describe the issue. */
  const handleAddReport = () => {
    showToast('Report form opened — pick the place, tap Continue, describe the issue.', 'info');
    router.push('/report' as any);
  };

  const handleVerifyPlace = () => {
    showToast('Verification queue opened — confirm or dispute the places listed.', 'info');
    router.push('/verify' as any);
  };

  const handlePlacesFound = (placesData: any[]) =>
    setAiMarkers(
      (Array.isArray(placesData) ? placesData : []).map(normalizeMarker).filter((m) => m.lat !== 0 || m.lng !== 0)
    );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1F2C34' : '#008069' },
      ]}
      edges={['top', 'left', 'right']}
    >
      <AccessibilityAgentChat
        onPlaceAdded={handlePlaceAdded}
        onPlacesFound={handlePlacesFound}
        onAddPlace={handleAddPlace}
        onAddReport={handleAddReport}
        onVerifyPlace={handleVerifyPlace}
        onDataChanged={() => {
          refreshCommunityData().catch(() => undefined);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
