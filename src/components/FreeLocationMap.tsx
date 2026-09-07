import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

interface FreeLocationMapProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (lat: number, lng: number, address?: string, displayName?: string) => void;
  selectedAddress?: string;
  selectedPlaceName?: string;
  height?: number;
  largeFont?: boolean;
  highContrast?: boolean;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export const FreeLocationMap: React.FC<FreeLocationMapProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  selectedAddress = '',
  selectedPlaceName = '',
  height = 320,
  largeFont = false,
  highContrast = false,
}) => {
  const { isDark, colors } = useAppTheme();
  const [currentLat, setCurrentLat] = useState<number>(latitude);
  const [currentLng, setCurrentLng] = useState<number>(longitude);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>(selectedAddress);
  const [mapTheme, setMapTheme] = useState<'standard' | 'dark' | 'contrast'>(
    isDark ? 'dark' : 'standard'
  );

  const iframeRef = useRef<any>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Sync state if props change from outside
  useEffect(() => {
    setCurrentLat(latitude);
    setCurrentLng(longitude);
  }, [latitude, longitude]);

  useEffect(() => {
    if (selectedAddress) {
      setResolvedAddress(selectedAddress);
    }
  }, [selectedAddress]);

  useEffect(() => {
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

    fetchReportMapData();
  }, []);

  // Handle incoming messages from the embedded Leaflet OpenStreetMap
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleWindowMessage = (event: MessageEvent) => {
      try {
        if (!event.data || typeof event.data !== 'object') return;
        if (event.data.type === 'OSM_PIN_MOVED') {
          const { lat, lng } = event.data;
          const newLat = parseFloat(lat.toFixed(5));
          const newLng = parseFloat(lng.toFixed(5));
          setCurrentLat(newLat);
          setCurrentLng(newLng);
          reverseGeocode(newLat, newLng);
        }
      } catch (err) {
        // Safe parsing ignored
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  // Send update to iframe when coordinates or theme change
  const sendLocationToMap = (lat: number, lng: number, zoomLevel: number = 16) => {
    if (Platform.OS === 'web' && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'SET_VIEW',
          lat,
          lng,
          zoom: zoomLevel,
        },
        '*'
      );
    }
  };

  // Free reverse geocode using OpenStreetMap Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'InclusiveAccessibilityMapperApp/1.0',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          const addr = data.address || {};
          const road = addr.road || addr.pedestrian || addr.footway || addr.cycleway || '';
          const houseNumber = addr.house_number ? `${addr.house_number} ` : '';
          const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
          const city = addr.city || addr.town || addr.village || '';
          const formatted = [houseNumber + road, suburb, city].filter(Boolean).join(', ') || data.display_name;

          const suggestedName =
            data.name ||
            addr.amenity ||
            addr.building ||
            addr.leisure ||
            addr.shop ||
            (road ? `${road} Public Space` : 'Mapped Public Space');

          setResolvedAddress(formatted);
          onLocationSelect(lat, lng, formatted, suggestedName);
          return;
        }
      }
    } catch (e) {
      console.warn('Reverse geocode failed or rate limited:', e);
    } finally {
      setIsGeocoding(false);
    }
    // Fallback if network issue
    const fallbackAddr = `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
    setResolvedAddress(fallbackAddr);
    onLocationSelect(lat, lng, fallbackAddr);
  };

  // Location search using OpenStreetMap Nominatim (Free, no API key needed!)
  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text.trim() || text.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            text.trim()
          )}&addressdetails=1&limit=5`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'InclusiveAccessibilityMapperApp/1.0',
            },
          }
        );
        if (res.ok) {
          const data: SearchResult[] = await res.json();
          setSearchResults(data);
          setShowSearchResults(true);
        }
      } catch (err) {
        console.warn('Nominatim search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 450);
  };

  const handleSelectSearchResult = (item: SearchResult) => {
    const lat = parseFloat(parseFloat(item.lat).toFixed(5));
    const lng = parseFloat(parseFloat(item.lon).toFixed(5));
    const name = item.name || item.display_name.split(',')[0];
    const address = item.display_name;

    setCurrentLat(lat);
    setCurrentLng(lng);
    setResolvedAddress(address);
    setSearchQuery(name);
    setShowSearchResults(false);
    sendLocationToMap(lat, lng, 17);
    onLocationSelect(lat, lng, address, name);
  };

  // "Use My Location" via Geolocation API
  const handleLocateMe = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          const lat = parseFloat(position.coords.latitude.toFixed(5));
          const lng = parseFloat(position.coords.longitude.toFixed(5));
          setCurrentLat(lat);
          setCurrentLng(lng);
          sendLocationToMap(lat, lng, 17);
          reverseGeocode(lat, lng);
        },
        (error) => {
          setIsLocating(false);
          console.warn('Geolocation error:', error);
          const defaultLat = 37.7749;
          const defaultLng = -122.4194;
          setCurrentLat(defaultLat);
          setCurrentLng(defaultLng);
          sendLocationToMap(defaultLat, defaultLng, 16);
          reverseGeocode(defaultLat, defaultLng);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Quick preset destinations for 1-tap testing
  const presetLocations = [
    { name: 'City Library', lat: 37.7749, lng: -122.4194 },
    { name: 'Central Station', lat: 37.7833, lng: -122.4167 },
    { name: 'Civic Park', lat: 37.7712, lng: -122.4687 },
    { name: 'Metro Hospital', lat: 37.7587, lng: -122.4367 },
  ];

  // Generate Leaflet HTML embed
  const generateLeafletHtml = () => {
    const tileUrl =
      mapTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : mapTheme === 'contrast'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const bgMapColor = mapTheme === 'dark' ? '#0F172A' : '#F8FAFC';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { box-sizing: border-box; }
          html, body {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            background-color: ${bgMapColor};
            overflow: hidden;
            font-family: system-ui, -apple-system, sans-serif;
          }
          #map {
            width: 100%;
            height: 100%;
          }
          .custom-marker-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 22px;
            background: #4F46E5;
            color: #FFFFFF;
            border: 3px solid #FFFFFF;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
            font-size: 20px;
            cursor: grab;
            animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .custom-marker-icon:active {
            cursor: grabbing;
            transform: scale(1.1);
          }
          @keyframes bounceIn {
            0% { transform: scale(0.4); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .leaflet-bar {
            border: none !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.18) !important;
          }
          .leaflet-bar a {
            background-color: ${mapTheme === 'dark' ? '#1E293B' : '#FFFFFF'} !important;
            color: ${mapTheme === 'dark' ? '#F8FAFC' : '#0F172A'} !important;
            border-bottom: 1px solid ${mapTheme === 'dark' ? '#334155' : '#E2E8F0'} !important;
            width: 34px !important;
            height: 34px !important;
            line-height: 34px !important;
            font-size: 16px !important;
          }
          .leaflet-control-attribution {
            font-size: 9px !important;
            background: rgba(0,0,0,0.4) !important;
            color: #CBD5E1 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            margin: 4px !important;
          }
          .leaflet-control-attribution a {
            color: #818CF8 !important;
            text-decoration: none !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var lat = ${currentLat};
          var lng = ${currentLng};

          var map = L.map('map', {
            center: [lat, lng],
            zoom: 15,
            zoomControl: false,
            attributionControl: true
          });

          L.control.zoom({ position: 'bottomright' }).addTo(map);

          L.tileLayer('${tileUrl}', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          }).addTo(map);

          var markerHtml = '<div class="custom-marker-icon" title="Drag to adjust accessibility audit pin">♿</div>';
          var customIcon = L.divIcon({
            html: markerHtml,
            className: '',
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });

          var marker = L.marker([lat, lng], {
            icon: customIcon,
            draggable: true,
            autoPan: true
          }).addTo(map);

          function notifyParent(newLat, newLng) {
            if (window.parent) {
              window.parent.postMessage({
                type: 'OSM_PIN_MOVED',
                lat: newLat,
                lng: newLng
              }, '*');
            }
          }

          marker.on('dragend', function (e) {
            var position = marker.getLatLng();
            notifyParent(position.lat, position.lng);
          });

          map.on('click', function (e) {
            marker.setLatLng(e.latlng);
            notifyParent(e.latlng.lat, e.latlng.lng);
          });

          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'SET_VIEW') {
              var targetLat = event.data.lat;
              var targetLng = event.data.lng;
              var zoom = event.data.zoom || 16;
              marker.setLatLng([targetLat, targetLng]);
              map.flyTo([targetLat, targetLng], zoom, { duration: 1.2 });
            }
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={[styles.wrapper, highContrast && styles.highContrastWrapper]}>
      {/* Search Header Bar with Free Nominatim API */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.card,
            borderColor: highContrast ? colors.accent : colors.cardBorder,
          },
        ]}
      >
        <View style={styles.searchInputRow}>
          <Ionicons name="search" size={largeFont ? 22 : 18} color={colors.accent} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.textPrimary },
              largeFont && { fontSize: 16 },
            ]}
            placeholder="Search venue or address (e.g. City Hall, Metro Station)..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchQueryChange}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchResults(true);
            }}
            accessibilityLabel="Search location or venue on OpenStreetMap"
            accessibilityRole="search"
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
              }}
              style={styles.clearSearchBtn}
              accessibilityLabel="Clear search input"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Live Nominatim Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <View
            style={[
              styles.resultsDropdown,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsHeaderTitle, { color: colors.textSecondary }]}>
                OpenStreetMap Suggestions
              </Text>
              <TouchableOpacity onPress={() => setShowSearchResults(false)}>
                <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={[styles.resultItem, { borderBottomColor: colors.divider }]}
                onPress={() => handleSelectSearchResult(item)}
              >
                <View style={[styles.resultIconBg, { backgroundColor: colors.accentBg }]}>
                  <Ionicons name="location" size={16} color={colors.accent} />
                </View>
                <View style={styles.resultTextCol}>
                  <Text
                    style={[
                      styles.resultTitle,
                      { color: colors.textPrimary },
                      largeFont && { fontSize: 15 },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name || item.display_name.split(',')[0]}
                  </Text>
                  <Text
                    style={[styles.resultSubtitle, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.display_name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Pick Preset Location Chips */}
      <View style={styles.presetsRow}>
        <Text style={[styles.presetLabel, { color: colors.textSecondary }]}>Quick Focus:</Text>
        {presetLocations.map((loc) => {
          const isSelected =
            Math.abs(currentLat - loc.lat) < 0.001 && Math.abs(currentLng - loc.lng) < 0.001;
          return (
            <TouchableOpacity
              key={loc.name}
              style={[
                styles.presetChip,
                { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                isSelected && { backgroundColor: colors.accentBg, borderColor: colors.accent },
              ]}
              onPress={() => {
                setCurrentLat(loc.lat);
                setCurrentLng(loc.lng);
                sendLocationToMap(loc.lat, loc.lng, 16);
                reverseGeocode(loc.lat, loc.lng);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select ${loc.name}`}
            >
              <Text
                style={[
                  styles.presetChipText,
                  { color: isSelected ? colors.accent : colors.textPrimary },
                  isSelected && { fontWeight: '800' },
                ]}
              >
                {loc.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Map Container */}
      <View
        style={[
          styles.mapFrame,
          { height },
          highContrast && { borderWidth: 2, borderColor: colors.accent },
        ]}
      >
        {/* Web Interactive OpenStreetMap Leaflet View */}
        {Platform.OS === 'web' ? (
          // @ts-ignore: iframe supported in react-native-web
          <iframe
            ref={iframeRef}
            title="OpenStreetMap Interactive Accessibility Location Picker"
            srcDoc={generateLeafletHtml()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: 16,
            }}
          />
        ) : (
          /* Native Canvas Fallback */
          <View style={[styles.nativeFallback, { backgroundColor: colors.card }]}>
            <Ionicons name="map-outline" size={48} color={colors.accent} />
            <Text style={[styles.nativeText, { color: colors.textPrimary }]}>
              Map Preview Active (OpenStreetMap Engine)
            </Text>
            <Text style={[styles.nativeSubtext, { color: colors.textSecondary }]}>
              Lat: {currentLat.toFixed(5)} | Lng: {currentLng.toFixed(5)}
            </Text>
          </View>
        )}

        {/* Floating Map Overlays */}
        {/* Theme / Style Switcher */}
        <View style={styles.mapTopActions}>
          <View style={styles.badgeOSM}>
            <Ionicons name="earth" size={12} color="#10B981" />
            <Text style={styles.badgeOSMText}>Free OpenStreetMap</Text>
          </View>

          <View style={styles.styleButtonsRow}>
            {(['standard', 'dark', 'contrast'] as const).map((styleOption) => (
              <TouchableOpacity
                key={styleOption}
                style={[
                  styles.stylePill,
                  mapTheme === styleOption && styles.stylePillActive,
                ]}
                onPress={() => setMapTheme(styleOption)}
                accessibilityLabel={`Switch map style to ${styleOption}`}
              >
                <Text
                  style={[
                    styles.stylePillText,
                    mapTheme === styleOption && styles.stylePillTextActive,
                  ]}
                >
                  {styleOption === 'standard' ? 'Light' : styleOption === 'dark' ? 'Dark' : 'High-Vis'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* "Use Current GPS Location" Button */}
        <TouchableOpacity
          style={[styles.locateMeBtn, { backgroundColor: colors.card }]}
          onPress={handleLocateMe}
          accessibilityLabel="Detect my GPS location and place pin"
          accessibilityRole="button"
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="navigate" size={18} color={colors.accent} />
          )}
          <Text style={[styles.locateMeText, { color: colors.accent }]}>Locate Me</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Coordinates & Address Display Footer */}
      <View
        style={[
          styles.locationMetaCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <View style={styles.metaRow}>
          <View style={[styles.pinIndicator, { backgroundColor: colors.accentBg }]}>
            <Ionicons name="pin" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.metaHeader}>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                AUDIT PINPOINT LOCATION
              </Text>
              {isGeocoding && (
                <View style={styles.resolvingRow}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={{ fontSize: 10, color: colors.accent }}>Resolving address...</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.resolvedAddressText,
                { color: colors.textPrimary },
                largeFont && { fontSize: 15 },
              ]}
              numberOfLines={2}
            >
              {resolvedAddress || `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`}
            </Text>
            <Text style={[styles.coordinatesPill, { color: colors.textMuted }]}>
              Coordinates: {currentLat.toFixed(5)}° N, {currentLng.toFixed(5)}° W
            </Text>
          </View>
        </View>
        <Text style={[styles.instructionTip, { color: colors.textSecondary }]}>
          💡 Tip: Click anywhere on the map or drag the ♿ pin to set the exact entrance or barrier location.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10,
    gap: 10,
  },
  highContrastWrapper: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    padding: 6,
    borderRadius: 18,
  },
  searchContainer: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'relative',
    zIndex: 100,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  clearSearchBtn: {
    padding: 4,
  },
  resultsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 220,
    overflow: 'hidden',
    zIndex: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  resultsHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  resultIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTextCol: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 2,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mapFrame: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  nativeFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  nativeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  nativeSubtext: {
    fontSize: 12,
  },
  mapTopActions: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none',
    zIndex: 10,
  },
  badgeOSM: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeOSMText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
  },
  styleButtonsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 14,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  stylePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stylePillActive: {
    backgroundColor: '#4F46E5',
  },
  stylePillText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  stylePillTextActive: {
    color: '#FFFFFF',
  },
  locateMeBtn: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#4F46E5',
    zIndex: 15,
  },
  locateMeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  locationMetaCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pinIndicator: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  resolvingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resolvedAddressText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 18,
  },
  coordinatesPill: {
    fontSize: 11,
    marginTop: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  instructionTip: {
    fontSize: 11,
    lineHeight: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
});
