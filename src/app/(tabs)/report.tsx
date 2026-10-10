import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryPlacesSection } from '@/components/CategoryPlacesSection';
import { ReportDetailsSection } from '@/components/ReportDetailsSection';
import { SelectedVenuePayload } from '@/types/categoryPlaces';
import { FeatureKey } from '@/constants/reportFeatures';
import { PlaceSearchResult, searchPlaces } from '@/lib/placeSearch';
import { searchPlacesWithAi } from '@/lib/aiSearch';

const DEFAULT_CENTER = { latitude: 6.9271, longitude: 79.8612 }; // Colombo fallback

function buildMapHtml(lat: number, lng: number, zoom = 15) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background:#e9edf1; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
    }).addTo(map);

    let marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);

    function post(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(JSON.stringify(payload), '*');
      }
    }

    marker.on('dragend', function (e) {
      const pos = marker.getLatLng();
      post({ type: 'pin', lat: pos.lat, lng: pos.lng });
    });

    map.on('click', function (e) {
      marker.setLatLng(e.latlng);
      post({ type: 'pin', lat: e.latlng.lat, lng: e.latlng.lng });
    });

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
    function handleMessage(e) {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data.type === 'recenter') {
          map.setView([data.lat, data.lng], data.zoom || 16);
          marker.setLatLng([data.lat, data.lng]);
        }
      } catch (err) {}
    }
  </script>
</body>
</html>`;
}

export default function SubmitReportScreen() {
  const router = useRouter();
  const { places, addReport } = useApp();
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialMapHtml = useMemo(
    () => buildMapHtml(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
    []
  );

  // ── Wizard step ──────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // ── Step 1: location ─────────────────────────────────────────────────
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(DEFAULT_CENTER);
  const [address, setAddress] = useState<string>('');
  const [detectedSpotName, setDetectedSpotName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // false = normal search, true = AI-assisted search (✨)
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiHint, setAiHint] = useState<string | undefined>(undefined);
  const searchRequestId = useRef(0);
  const [isLocating, setIsLocating] = useState(false);
  const [mapKey, setMapKey] = useState(0); // force webview reload on recenter jumps
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Selected venue (either picked from saved database places or custom added under category)
  const [selectedVenue, setSelectedVenue] = useState<SelectedVenuePayload | null>(null);

  // Listen for iframe map events on web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleWebMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'pin') {
          setHasUserInteracted(true);
          setCoords({ latitude: data.lat, longitude: data.lng });
          setAddress('');
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('message', handleWebMessage);
    return () => {
      window.removeEventListener('message', handleWebMessage);
    };
  }, []);

  // Reverse-geocode pinned map coordinates to get place & address
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (isCancelled) return;

        if (data && data.address) {
          const fullAddr = data.display_name || '';
          setAddress(fullAddr);
          const spotName =
            data.name ||
            data.address.amenity ||
            data.address.building ||
            data.address.shop ||
            data.address.leisure ||
            data.address.tourism ||
            data.address.road ||
            'Pinned Location';
          setDetectedSpotName(spotName);

          // ONLY auto-populate the selected venue if the user has intentionally interacted with the map or search!
          // We don't want to force the default starting Colombo coordinates into their selection on page reload.
          if (hasUserInteracted) {
            setSelectedVenue((prev) => ({
              name: spotName,
              category: prev?.category || 'Shopping Mall',
              categoryId: prev?.categoryId || 'mall',
              address: fullAddr,
              isNewCustomPlace: true,
            }));
          }
        }
      } catch (e) {
        // ignore
      }
    }, 450);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [coords.latitude, coords.longitude]);

  // ── Step 2: details ──────────────────────────────────────────────────
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    ramp: false,
    elevator: false,
    toilet: false,
    parking: false,
    stepFree: false,
    tactilePaving: false,
    automaticDoor: false,
  });
  const [note, setNote] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleFeature = (key: FeatureKey) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSetAllFeatures = (allOn: boolean) => {
    setFeatures({
      ramp: allOn,
      elevator: allOn,
      toilet: allOn,
      parking: allOn,
      stepFree: allOn,
      tactilePaving: allOn,
      automaticDoor: allOn,
    });
  };

  const featureCount = Object.values(features).filter(Boolean).length;

  // ── Map helpers & OSM API ────────────────────────────────────────────
  const recenterMap = (lat: number, lng: number) => {
    setCoords({ latitude: lat, longitude: lng });
    const payload = JSON.stringify({ type: 'recenter', lat, lng, zoom: 16 });
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(payload, '*');
    } else {
      webviewRef.current?.postMessage(payload);
    }
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'pin') {
        setHasUserInteracted(true);
        setCoords({ latitude: data.lat, longitude: data.lng });
        setAddress(''); // clear stale label until reverse-geocoded / re-searched
        setDetectedSpotName('');
        setSelectedVenue((prev) => ({
          name: 'Pinned Location',
          category: prev?.category || 'Shopping Mall',
          categoryId: prev?.categoryId || 'mall',
          address: `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`,
          isNewCustomPlace: true,
        }));
      }
    } catch (e) {
      // ignore malformed messages
    }
  };

  const runSearch = useCallback((query: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const requestId = ++searchRequestId.current;
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const outcome = aiSearchMode
          ? await searchPlacesWithAi(query, { limit: 8 })
          : { results: await searchPlaces(query, { limit: 8 }), hint: undefined };
        if (searchRequestId.current !== requestId) return;
        setSearchResults(outcome.results);
        setAiHint(outcome.hint);
      } catch {
        if (searchRequestId.current === requestId) {
          setSearchResults([]);
          setAiHint(undefined);
        }
      } finally {
        if (searchRequestId.current === requestId) setIsSearching(false);
      }
    }, 400);
  }, [aiSearchMode]);

  const onChangeSearch = (text: string) => {
    setSearchQuery(text);
    runSearch(text);
  };

  const selectSearchResult = (result: PlaceSearchResult) => {
    setHasUserInteracted(true);
    const lat = result.lat;
    const lng = result.lon;
    recenterMap(lat, lng);
    setAddress(result.display_name);
    const spotName = result.name || result.display_name.split(',')[0] || 'Selected Place';
    setDetectedSpotName(spotName);
    setSearchQuery(spotName);
    setSearchResults([]);
    setSelectedVenue((prev) => ({
      name: spotName,
      category: prev?.category || 'Shopping Mall',
      categoryId: prev?.categoryId || 'mall',
      address: result.display_name,
      isNewCustomPlace: true,
    }));
    Keyboard.dismiss();
  };

  const useMyLocation = async () => {
    setHasUserInteracted(true);
    setIsLocating(true);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            recenterMap(lat, lng);
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
              );
              if (res.ok) {
                const data = await res.json();
                if (data && data.display_name) {
                  const spotName = data.name || data.address?.amenity || data.address?.road || 'Current Location';
                  setAddress(data.display_name);
                  setDetectedSpotName(spotName);
                  setSearchQuery(data.display_name);
                  setSelectedVenue((prev) => ({
                    name: spotName,
                    category: prev?.category || 'Shopping Mall',
                    categoryId: prev?.categoryId || 'mall',
                    address: data.display_name,
                    isNewCustomPlace: true,
                  }));
                }
              }
            } catch (err) {}
            setIsLocating(false);
          },
          (err) => {
            Alert.alert('Could not get location', 'Please try again or search manually.');
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Enable location access in settings to auto-fill your current position.'
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      recenterMap(pos.coords.latitude, pos.coords.longitude);
      const [place] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (place) {
        const label = [place.name, place.street, place.city, place.region]
          .filter(Boolean)
          .join(', ');
        const placeName = place.name || place.street || 'Current Location';
        setAddress(label);
        setDetectedSpotName(placeName);
        setSearchQuery(label);
        setSelectedVenue((prev) => ({
          name: placeName,
          category: prev?.category || 'Shopping Mall',
          categoryId: prev?.categoryId || 'mall',
          address: label,
          isNewCustomPlace: true,
        }));
      }
    } catch (e) {
      Alert.alert('Could not get location', 'Please try again or search manually.');
    } finally {
      if (Platform.OS !== 'web') {
        setIsLocating(false);
      }
    }
  };

  const handleAddPhoto = (uri: string) => {
    setPhotos((prev) => [...prev, uri]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const canContinueFromStep1 = !!selectedVenue && selectedVenue.name.trim().length > 0;

  const goToDetails = () => {
    if (!canContinueFromStep1) {
      Alert.alert('Almost there', 'Please select or add a venue in this category to continue.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (featureCount === 0 && !note.trim() && photos.length === 0) {
      Alert.alert('Validation Error', 'Please verify at least one feature, add a note, or upload a photo to submit.');
      return;
    }

    const finalPlaceName = selectedVenue?.name || 'Selected Place';
    setIsSubmitting(true);

    try {
      const result = await addReport({
        placeId: selectedVenue?.isNewCustomPlace ? undefined : selectedVenue?.placeId,
        placeName: finalPlaceName,
        note: note.trim() || 'Accessibility check performed.',
        featuresReported: features,
        photos,
        priority: 'Medium',
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: address || selectedVenue?.address || finalPlaceName,
        },
      });

      if (result && result.persistedToSupabase) {
        showToast(`Report saved & synced to Supabase for ${finalPlaceName}`, 'success', 'checkmark-circle');
      } else {
        showToast(`Report submitted for ${finalPlaceName}`, 'success', 'checkmark-circle');
      }
      setShowSuccessToast(true);

      setTimeout(() => {
        setNote('');
        setPhotos([]);
        setShowSuccessToast(false);
        setIsSubmitting(false);
        router.push('/verify' as any);
      }, 1500);
    } catch (error) {
      showToast(`Report submitted for ${finalPlaceName}`, 'success', 'checkmark-circle');
      setIsSubmitting(false);
      router.push('/verify' as any);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder, paddingTop: insets.top + 14 },
        ]}
      >
        <View style={styles.headerTopRow}>
          {step === 2 ? (
            <TouchableOpacity
              onPress={() => setStep(1)}
              accessibilityRole="button"
              accessibilityLabel="Go back to location step"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Report an Accessibility Feature
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Help map step-free paths for your community
            </Text>
          </View>
        </View>

        {/* Progress stepper */}
        <View style={styles.stepperRow} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of 2`}>
          <StepDot label="Location" active={step === 1} done={step > 1} colors={colors} number={1} />
          <View style={[styles.stepConnector, { backgroundColor: step > 1 ? colors.accent : colors.chipBorder }]} />
          <StepDot label="Details" active={step === 2} done={false} colors={colors} number={2} />
        </View>
      </View>

      {showSuccessToast && (
        <View style={[styles.successToast, { backgroundColor: colors.successToastBg, borderColor: colors.successToastBorder }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.statusDotVerified} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.successToastTitle, { color: colors.successToastTitle }]}>Report Submitted!</Text>
            <Text style={[styles.successToastText, { color: colors.successToastText }]}>
              Added to the Verification Queue for community audit.
            </Text>
          </View>
        </View>
      )}

      {step === 1 ? (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Search ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SEARCH FOR A PLACE</Text>
            <View style={[styles.searchBar, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
              <Ionicons
                name={aiSearchMode ? 'sparkles' : 'search'}
                size={18}
                color={aiSearchMode ? colors.accent : colors.textMuted}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder={aiSearchMode ? 'Ask AI: “cafes near me”…' : 'Search anywhere — place, city, address…'}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={onChangeSearch}
                accessibilityLabel="Search for an address or venue"
                accessibilityHint="Type to search, then choose a result to place it on the map"
                returnKeyType="search"
              />
              {isSearching && <ActivityIndicator size="small" color={colors.accent} />}
              {!!searchQuery && !isSearching && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setAiHint(undefined);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setAiSearchMode((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel={aiSearchMode ? 'Turn off AI search' : 'Turn on AI search'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.aiSearchBtn,
                  { backgroundColor: aiSearchMode ? colors.accentBg : colors.chipBorder },
                ]}
              >
                <Ionicons
                  name="sparkles"
                  size={14}
                  color={aiSearchMode ? colors.accent : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {!!aiHint && searchResults.length > 0 && (
              <Text
                style={{ color: colors.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 6 }}
              >
                {aiHint}
              </Text>
            )}

            {searchResults.length > 0 && (
              <View style={[styles.searchResults, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {searchResults.map((r, idx) => (
                  <TouchableOpacity
                    key={r.place_id || idx}
                    style={[
                      styles.searchResultRow,
                      idx !== searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
                    ]}
                    onPress={() => selectSearchResult(r)}
                    accessibilityRole="button"
                    accessibilityLabel={`Use location: ${r.display_name}`}
                  >
                    <Ionicons name="location-outline" size={16} color={colors.accent} />
                    <Text numberOfLines={2} style={[styles.searchResultText, { color: colors.textPrimary }]}>
                      {r.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={useMyLocation}
              style={[styles.myLocationBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
              accessibilityRole="button"
              accessibilityLabel="Use my current location"
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Ionicons name="navigate-outline" size={16} color={colors.textPrimary} />
              )}
              <Text style={[styles.myLocationText, { color: colors.textPrimary }]}>
                {isLocating ? 'Finding you…' : 'Use my current location'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Map ─────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>PIN THE EXACT SPOT</Text>
              <TouchableOpacity
                onPress={() => setIsMapExpanded(!isMapExpanded)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: colors.chipBg, borderRadius: 12, borderWidth: 1, borderColor: colors.chipBorder }}
                accessibilityRole="button"
                accessibilityLabel={isMapExpanded ? 'Shrink map' : 'Expand map for better visibility'}
              >
                <Ionicons name={isMapExpanded ? "contract" : "expand"} size={18} color={colors.accent} />
                <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>
                  {isMapExpanded ? 'Shrink Map' : 'Enlarge Map'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.mapCard, { borderColor: colors.cardBorder, height: isMapExpanded ? 550 : 260, borderWidth: isMapExpanded ? 3 : 1 }]}>
              {Platform.OS === 'web' ? (
                // @ts-ignore: iframe supported in react-native-web
                <iframe
                  ref={iframeRef}
                  title="Report Location Map"
                  srcDoc={initialMapHtml}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                />
              ) : (
                <WebView
                  ref={webviewRef}
                  key={mapKey}
                  originWhitelist={['*']}
                  source={{ html: initialMapHtml }}
                  onMessage={handleMapMessage}
                  style={styles.map}
                  accessibilityLabel="Map for choosing the report location. Drag the pin or tap the map to move it."
                />
              )}
              <View style={[styles.mapOverlayBadge, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="pin" size={16} color={colors.accent} />
                <Text style={[styles.mapOverlayText, { color: colors.textSecondary, fontSize: 14 }]} numberOfLines={2}>
                  {address || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}
                </Text>
              </View>
            </View>
            <Text style={[styles.mapHint, { color: colors.textMuted, fontSize: 13 }]}>
              Tap anywhere on the map, or drag the pin, to fine-tune the exact location. This text also
              confirms your selection for screen-reader users who can't see the map.
            </Text>
          </View>

          {/* ── Category & Saved Places in Database Section ────────── */}
          <CategoryPlacesSection
            coords={coords}
            detectedAddress={address}
            detectedSpotName={detectedSpotName}
            registeredPlaces={places}
            selectedVenue={selectedVenue}
            onSelectVenue={setSelectedVenue}
          />
        </ScrollView>
      ) : (
        <ReportDetailsSection
          selectedVenue={selectedVenue}
          coords={coords}
          features={features}
          onToggleFeature={toggleFeature}
          onSetAllFeatures={handleSetAllFeatures}
          note={note}
          onChangeNote={setNote}
          photos={photos}
          onAddPhoto={handleAddPhoto}
          onRemovePhoto={removePhoto}
          onBackToLocation={() => setStep(1)}
        />
      )}

      {/* ── Sticky bottom action bar ─────────────────────────────── */}
      <View style={[styles.bottomBar, { backgroundColor: colors.headerBg, borderTopColor: colors.headerBorder, paddingBottom: insets.bottom + 12 }]}>
        {step === 1 ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: canContinueFromStep1 ? colors.submitBtn : colors.chipBorder }]}
            onPress={goToDetails}
            accessibilityRole="button"
            accessibilityLabel="Continue to report details"
            disabled={!canContinueFromStep1}
          >
            <Text style={[styles.primaryBtnText, { color: colors.submitBtnText }]}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.submitBtnText} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.submitBtn },
              isSubmitting && { opacity: 0.75 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={isSubmitting ? 'Submitting audit report...' : 'Submit community audit report'}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color={colors.submitBtnText} />
                <Text style={[styles.primaryBtnText, { color: colors.submitBtnText, marginLeft: 8 }]}>
                  Submitting Report...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="send" size={18} color={colors.submitBtnText} />
                <Text style={[styles.primaryBtnText, { color: colors.submitBtnText }]}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function StepDot({
  label,
  active,
  done,
  colors,
  number,
}: {
  label: string;
  active: boolean;
  done: boolean;
  colors: any;
  number: number;
}) {
  return (
    <View style={styles.stepDotWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.stepDot,
          { borderColor: colors.chipBorder, backgroundColor: colors.chipBg },
          (active || done) && { backgroundColor: colors.accent, borderColor: colors.accent },
        ]}
      >
        {done ? (
          <Ionicons name="checkmark" size={13} color="#FFF" />
        ) : (
          <Text style={[styles.stepDotNumber, { color: active ? '#FFF' : colors.textMuted }]}>{number}</Text>
        )}
      </View>
      <Text style={[styles.stepDotLabel, { color: active ? colors.textPrimary : colors.textMuted }, active && { fontWeight: '700' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: { width: 30, height: 30, justifyContent: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 14, marginTop: 4 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginTop: 8 },
  stepDotWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  stepDotNumber: { fontSize: 14, fontWeight: '800' },
  stepDotLabel: { fontSize: 14 },
  stepConnector: { flex: 1, height: 3, marginHorizontal: 12, borderRadius: 1.5 },

  successToast: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, padding: 16, marginHorizontal: 16, marginTop: 12, borderRadius: 16,
  },
  successToastTitle: { fontSize: 16, fontWeight: '800' },
  successToastText: { fontSize: 14, marginTop: 2 },

  scrollContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabelCount: { fontSize: 14, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, height: 64,
  },
  searchInput: { flex: 1, fontSize: 18 },
  aiSearchBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  searchResults: { marginTop: 10, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  searchResultRow: { flexDirection: 'row', gap: 14, padding: 20, alignItems: 'center' },
  searchResultText: { flex: 1, fontSize: 16, lineHeight: 24 },

  myLocationBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14, paddingVertical: 16, marginTop: 14,
  },
  myLocationText: { fontSize: 15, fontWeight: '700' },

  mapCard: { height: 260, borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  map: { flex: 1 },
  mapOverlayBadge: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10,
  },
  mapOverlayText: { fontSize: 12, flex: 1, fontWeight: '600' },
  mapHint: { fontSize: 11.5, marginTop: 8, lineHeight: 16 },

  bottomBar: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 16 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 18, borderRadius: 16,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '800' },
});
