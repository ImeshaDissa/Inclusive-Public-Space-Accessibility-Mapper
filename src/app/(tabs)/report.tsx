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
  SafeAreaView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * SUBMIT ACCESSIBILITY REPORT — 2 STEP WIZARD
 * Step 1: "Where"    → map, search, existing venue chips, custom venue
 * Step 2: "Details"  → feature checklist, priority, notes, photos, submit
 *
 * MAP: Free, no-API-key OpenStreetMap tiles rendered via Leaflet inside a
 * WebView. Geocoding/search uses OpenStreetMap's free Nominatim service.
 * No backend exists yet — selected coordinates + address are kept in local
 * state and passed into addReport() as a `location` field. Extend the
 * AppContext report type to persist it once the API/DB layer exists.
 *
 * Requires: `react-native-webview`, `expo-location`
 *   npx expo install react-native-webview expo-location
 * ─────────────────────────────────────────────────────────────────────────
 */

type FeatureKey =
  | 'ramp'
  | 'elevator'
  | 'toilet'
  | 'parking'
  | 'stepFree'
  | 'tactilePaving'
  | 'automaticDoor';

const FEATURE_META: Record<
  FeatureKey,
  { label: string; icon: string; iconSet: 'mci'; hint: string }
> = {
  ramp: { label: 'Wheelchair Ramp', icon: 'wheelchair', iconSet: 'mci', hint: 'wheelchair ramp availability' },
  elevator: { label: 'Elevator Access', icon: 'elevator-passenger', iconSet: 'mci', hint: 'elevator access' },
  toilet: { label: 'Accessible Restroom', icon: 'human-wheelchair', iconSet: 'mci', hint: 'accessible restroom' },
  parking: { label: 'Disabled Parking', icon: 'car', iconSet: 'mci', hint: 'reserved disabled parking' },
  stepFree: { label: 'Step-Free Entrance', icon: 'walk', iconSet: 'mci', hint: 'step-free entrance' },
  tactilePaving: { label: 'Tactile Paving', icon: 'road-variant', iconSet: 'mci', hint: 'tactile paving for visually impaired visitors' },
  automaticDoor: { label: 'Automatic Door', icon: 'door', iconSet: 'mci', hint: 'automatic door' },
};

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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
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

  // Listen for iframe map events on web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleWebMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'pin') {
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

  // ── Wizard step ──────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // ── Step 1: location ─────────────────────────────────────────────────
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(places[0]?.id || '');
  const [customPlaceName, setCustomPlaceName] = useState<string>('');
  const [isCustomPlace, setIsCustomPlace] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(DEFAULT_CENTER);
  const [address, setAddress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapKey, setMapKey] = useState(0); // force webview reload on recenter jumps

  // ── Step 2: details ──────────────────────────────────────────────────
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    ramp: true,
    elevator: false,
    toilet: true,
    parking: true,
    stepFree: true,
    tactilePaving: false,
    automaticDoor: false,
  });
  const [note, setNote] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80',
  ]);
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  const toggleFeature = (key: FeatureKey) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const featureCount = Object.values(features).filter(Boolean).length;

  // ── Map helpers & OSM API ────────────────────────────────────────────
  const fetchReportMapData = async () => {
    try {
      const response = await fetch('http://wiki.openstreetmap.org/wiki/API', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response;
    } catch (error) {
      console.warn('Failed to fetch OpenStreetMap API for report map:', error);
      return null;
    }
  };

  useEffect(() => {
    const initReportMapData = async () => {
      try {
        const response = await fetch('http://wiki.openstreetmap.org/wiki/API', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.warn('Failed to fetch OpenStreetMap API for report map:', error);
      }
    };

    initReportMapData();
  }, []);

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
        setCoords({ latitude: data.lat, longitude: data.lng });
        setAddress(''); // clear stale label until reverse-geocoded / re-searched
      }
    } catch (e) {
      // ignore malformed messages
    }
  };

  const runSearch = useCallback((query: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=6`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const json = await res.json();
        setSearchResults(json || []);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);
  }, []);

  const onChangeSearch = (text: string) => {
    setSearchQuery(text);
    runSearch(text);
  };

  const selectSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    recenterMap(lat, lng);
    setAddress(result.display_name);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const useMyLocation = async () => {
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
                  setAddress(data.display_name);
                  setSearchQuery(data.display_name);
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
        setAddress(label);
        setSearchQuery(label);
      }
    } catch (e) {
      Alert.alert('Could not get location', 'Please try again or search manually.');
    } finally {
      if (Platform.OS !== 'web') {
        setIsLocating(false);
      }
    }
  };

  const handleAddSamplePhoto = () => {
    const samplePhotos = [
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
    ];
    const nextPhoto = samplePhotos[photos.length % samplePhotos.length];
    setPhotos((prev) => [...prev, nextPhoto]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const targetPlace = places.find((p) => p.id === selectedPlaceId);
  const placeName = isCustomPlace ? customPlaceName.trim() : targetPlace ? targetPlace.name : '';

  const canContinueFromStep1 = isCustomPlace ? customPlaceName.trim().length > 0 : !!targetPlace;

  const goToDetails = () => {
    if (!canContinueFromStep1) {
      Alert.alert('Almost there', 'Please choose a venue or enter a custom venue name to continue.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = () => {
    const finalPlaceName = isCustomPlace ? customPlaceName.trim() : targetPlace ? targetPlace.name : 'Unknown Place';

    addReport({
      placeId: isCustomPlace ? undefined : selectedPlaceId,
      placeName: finalPlaceName,
      note: note.trim() || 'Accessibility check performed.',
      featuresReported: features,
      photos,
      priority,
      // TODO: persist once the reports API/DB supports coordinates:
      location: { latitude: coords.latitude, longitude: coords.longitude, address },
    } as any);

    showToast(`Report submitted for ${finalPlaceName}`, 'success', 'checkmark-circle');
    setShowSuccessToast(true);

    setTimeout(() => {
      setNote('');
      setShowSuccessToast(false);
      router.push('/verify' as any);
    }, 1500);
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
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search an address, venue, or landmark…"
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
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {searchResults.length > 0 && (
              <View style={[styles.searchResults, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {searchResults.map((r, idx) => (
                  <TouchableOpacity
                    key={idx}
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
              style={[styles.myLocationBtn, { backgroundColor: colors.segmentActiveBg, borderColor: colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Use my current location"
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="navigate" size={16} color={colors.accent} />
              )}
              <Text style={[styles.myLocationText, { color: colors.accent }]}>
                {isLocating ? 'Finding you…' : 'Use my current location'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Map ─────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PIN THE EXACT SPOT</Text>
            <View style={[styles.mapCard, { borderColor: colors.cardBorder }]}>
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
                <Ionicons name="pin" size={14} color={colors.accent} />
                <Text style={[styles.mapOverlayText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {address || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}
                </Text>
              </View>
            </View>
            <Text style={[styles.mapHint, { color: colors.textMuted }]}>
              Tap anywhere on the map, or drag the pin, to fine-tune the exact location. This text also
              confirms your selection for screen-reader users who can't see the map.
            </Text>
          </View>

          {/* ── Venue picker ────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT VENUE OR LOCATION</Text>

            {!isCustomPlace ? (
              <View style={{ gap: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {places.map((place) => {
                    const isSelected = selectedPlaceId === place.id;
                    return (
                      <TouchableOpacity
                        key={place.id}
                        style={[
                          styles.venueChip,
                          { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                          isSelected && { backgroundColor: colors.segmentActiveBg, borderColor: colors.accent },
                        ]}
                        onPress={() => setSelectedPlaceId(place.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`Select venue ${place.name}`}
                      >
                        <Ionicons
                          name={isSelected ? 'location' : 'location-outline'}
                          size={14}
                          color={isSelected ? colors.filterActiveText : colors.accent}
                        />
                        <Text
                          style={[
                            styles.venueChipText,
                            { color: isSelected ? colors.filterActiveText : colors.textSecondary },
                            isSelected && { fontWeight: '700' },
                          ]}
                        >
                          {place.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={styles.customToggleBtn}
                  onPress={() => setIsCustomPlace(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Enter a new venue name instead of picking from the list"
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.accentLight} />
                  <Text style={[styles.customToggleText, { color: colors.accentLight }]}>Enter a new venue name</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder, color: colors.textPrimary }]}
                  placeholder="e.g. Metro West Library, Grand Cinema…"
                  placeholderTextColor={colors.textMuted}
                  value={customPlaceName}
                  onChangeText={setCustomPlaceName}
                  accessibilityLabel="Custom venue name"
                />
                <TouchableOpacity
                  style={styles.customToggleBtn}
                  onPress={() => setIsCustomPlace(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Pick from existing places list instead"
                >
                  <Ionicons name="arrow-back-circle-outline" size={16} color={colors.accentLight} />
                  <Text style={[styles.customToggleText, { color: colors.accentLight }]}>Pick from existing places</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Context summary chip carried over from step 1 */}
          <View style={[styles.contextBanner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="location" size={16} color={colors.accent} />
            <Text style={[styles.contextBannerText, { color: colors.textPrimary }]} numberOfLines={1}>
              {placeName || 'Selected venue'}
            </Text>
          </View>

          {/* ── Feature checklist as a grid of cards ───────────── */}
          <View style={styles.section}>
            <View style={styles.sectionLabelRow}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCESSIBILITY FEATURES</Text>
              <Text style={[styles.sectionLabelCount, { color: colors.accent }]}>{featureCount} selected</Text>
            </View>
            <View style={styles.featureGrid}>
              {(Object.keys(FEATURE_META) as FeatureKey[]).map((key) => {
                const meta = FEATURE_META[key];
                const isOn = features[key];
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => toggleFeature(key)}
                    style={[
                      styles.featureCard,
                      { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                      isOn && { backgroundColor: colors.segmentActiveBg, borderColor: colors.accent },
                    ]}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: isOn }}
                    accessibilityLabel={meta.label}
                    accessibilityHint={`Double tap to toggle ${meta.hint}`}
                  >
                    <MaterialCommunityIcons
                      name={meta.icon as any}
                      size={22}
                      color={isOn ? colors.accent : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.featureCardLabel,
                        { color: isOn ? colors.textPrimary : colors.textSecondary },
                        isOn && { fontWeight: '700' },
                      ]}
                    >
                      {meta.label}
                    </Text>
                    <View
                      style={[
                        styles.featureCheckDot,
                        { borderColor: colors.chipBorder },
                        isOn && { backgroundColor: colors.accent, borderColor: colors.accent },
                      ]}
                    >
                      {isOn && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Priority ────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>REPORT PRIORITY</Text>
            <View style={styles.priorityRow}>
              {(['High', 'Medium', 'Low'] as const).map((p) => {
                const isSelected = priority === p;
                const colorMap = { High: colors.priorityHighBorder, Medium: colors.priorityMediumBorder, Low: colors.priorityLowBorder };
                const bgMap = { High: colors.priorityHighBg, Medium: colors.priorityMediumBg, Low: colors.priorityLowBg };
                const textMap = { High: colors.priorityHighText, Medium: colors.priorityMediumText, Low: colors.priorityLowText };
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityChip,
                      { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                      isSelected && { backgroundColor: bgMap[p], borderColor: colorMap[p] },
                    ]}
                    onPress={() => setPriority(p)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${p} priority`}
                  >
                    <Text
                      style={[
                        styles.priorityChipText,
                        { color: isSelected ? textMap[p] : colors.textSecondary },
                        isSelected && { fontWeight: '800' },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Notes ───────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>AUDIT NOTES</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder, color: colors.textPrimary }]}
              placeholder="Describe condition, maintenance status, door width, slope steepness, etc…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={note}
              onChangeText={setNote}
              accessibilityLabel="Audit notes"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>{note.length}/500</Text>
          </View>

          {/* ── Photos ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PHOTO EVIDENCE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((uri, idx) => (
                <View key={idx} style={styles.photoItem}>
                  <Image source={{ uri }} style={styles.photoThumbnail} accessibilityLabel={`Attached photo ${idx + 1}`} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => removePhoto(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${idx + 1}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addPhotoBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                onPress={handleAddSamplePhoto}
                accessibilityRole="button"
                accessibilityLabel="Attach a photo"
              >
                <Ionicons name="camera-outline" size={24} color={colors.accent} />
                <Text style={[styles.addPhotoText, { color: colors.accentLight }]}>Attach</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </ScrollView>
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
            style={[styles.primaryBtn, { backgroundColor: colors.submitBtn }]}
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel="Submit community audit report"
          >
            <Ionicons name="send" size={18} color={colors.submitBtnText} />
            <Text style={[styles.primaryBtnText, { color: colors.submitBtnText }]}>Submit Report</Text>
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
  headerTitle: { fontSize: 21, fontWeight: '800', letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 12.5, marginTop: 3 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  stepDotWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  stepDotNumber: { fontSize: 12, fontWeight: '800' },
  stepDotLabel: { fontSize: 12.5 },
  stepConnector: { flex: 1, height: 2, marginHorizontal: 10, borderRadius: 1 },

  successToast: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, padding: 14, marginHorizontal: 16, marginTop: 12, borderRadius: 14,
  },
  successToastTitle: { fontSize: 14, fontWeight: '800' },
  successToastText: { fontSize: 12 },

  scrollContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 22 },
  sectionLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabelCount: { fontSize: 12, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchResults: { marginTop: 8, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  searchResultRow: { flexDirection: 'row', gap: 10, padding: 12, alignItems: 'flex-start' },
  searchResultText: { flex: 1, fontSize: 12.5, lineHeight: 17 },

  myLocationBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingVertical: 12, marginTop: 10,
  },
  myLocationText: { fontSize: 13, fontWeight: '700' },

  mapCard: { height: 220, borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  map: { flex: 1 },
  mapOverlayBadge: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10,
  },
  mapOverlayText: { fontSize: 12, flex: 1, fontWeight: '600' },
  mapHint: { fontSize: 11.5, marginTop: 8, lineHeight: 16 },

  venueChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1,
  },
  venueChipText: { fontSize: 12.5, fontWeight: '600' },
  customToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 4 },
  customToggleText: { fontSize: 12.5, fontWeight: '700' },

  textInput: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, borderWidth: 1 },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 6 },

  contextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 18,
  },
  contextBannerText: { flex: 1, fontSize: 13, fontWeight: '700' },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard: {
    width: '47.5%', borderWidth: 1, borderRadius: 16, padding: 14,
    gap: 8, minHeight: 96, justifyContent: 'space-between',
  },
  featureCardLabel: { fontSize: 12.5, lineHeight: 16 },
  featureCheckDot: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },

  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityChip: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  priorityChipText: { fontSize: 13, fontWeight: '700' },

  photoItem: { position: 'relative', marginRight: 10 },
  photoThumbnail: { width: 84, height: 84, borderRadius: 14 },
  removePhotoBtn: {
    position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444',
    borderRadius: 11, width: 22, height: 22, justifyContent: 'center', alignItems: 'center',
  },
  addPhotoBtn: {
    width: 84, height: 84, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderStyle: 'dashed',
  },
  addPhotoText: { fontSize: 10.5, fontWeight: '700', marginTop: 4 },

  bottomBar: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800' },
});