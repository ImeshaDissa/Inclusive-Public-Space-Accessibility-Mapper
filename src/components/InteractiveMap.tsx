import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Place } from '@/types/accessibility';
import { useAppTheme } from '@/context/ThemeContext';

export interface InteractiveMapProps {
  places: Place[];
  selectedPlaceId: string | null;
  userLocation?: { latitude: number; longitude: number } | null;
  onSelectPlace: (place: Place) => void;
  onLocateMe?: () => void;
  style?: any;
}

type MapCommand = 'zoomIn' | 'zoomOut' | 'reset' | 'locateUser';

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  places,
  selectedPlaceId,
  userLocation,
  onSelectPlace,
  onLocateMe,
  style,
}) => {
  const { colors, isDark } = useAppTheme();
  const webviewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  // High quality Leaflet map HTML with SVG accessibility markers, user location pulse, and controls
  const mapHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; }
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: ${isDark ? '#090D16' : '#F8FAFC'};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .leaflet-control-attribution { display: none !important; }

    /* Custom Accessible Pins */
    .pin-container {
      position: relative;
      width: 38px;
      height: 46px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .pin-container:hover {
      transform: translateY(-4px) scale(1.08);
      z-index: 9999 !important;
    }
    .pin-selected {
      transform: translateY(-6px) scale(1.22) !important;
      z-index: 10000 !important;
    }

    .pin-badge {
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
      transition: all 0.2s ease;
    }
    .pin-badge svg {
      transform: rotate(45deg);
      width: 18px;
      height: 18px;
      fill: #FFFFFF;
    }

    /* Status Colors */
    /* Green = Fully Accessible / Verified */
    .status-verified .pin-badge {
      background: linear-gradient(135deg, #10B981, #059669);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.45);
    }
    /* Yellow = Partially Accessible / Pending */
    .status-pending .pin-badge {
      background: linear-gradient(135deg, #F59E0B, #D97706);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.45);
    }
    /* Red = Not Accessible / Disputed / Unverified */
    .status-disputed .pin-badge {
      background: linear-gradient(135deg, #EF4444, #DC2626);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.45);
    }

    /* Selected animation pulse ring */
    .pin-selected::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 3px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid #FF5A36;
      animation: pulse-ring 1.8s infinite;
      pointer-events: none;
    }

    @keyframes pulse-ring {
      0% { transform: scale(0.9); opacity: 1; }
      100% { transform: scale(1.9); opacity: 0; }
    }

    /* User Real-time Location Marker */
    .user-location-pin {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #2563EB;
      border: 3px solid #FFFFFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      position: relative;
    }
    .user-location-pulse {
      position: absolute;
      top: -10px;
      left: -10px;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.25);
      animation: user-pulse 2s infinite ease-out;
      pointer-events: none;
    }
    @keyframes user-pulse {
      0% { transform: scale(0.5); opacity: 0.9; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    /* Custom Leaflet Tooltip / Popup styling */
    .leaflet-popup-content-wrapper {
      background: ${isDark ? '#0F172A' : '#FFFFFF'};
      color: ${isDark ? '#F8FAFC' : '#0F172A'};
      border-radius: 14px;
      padding: 4px;
      border: 1px solid ${isDark ? '#334155' : '#E2E8F0'};
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
    }
    .leaflet-popup-tip {
      background: ${isDark ? '#0F172A' : '#FFFFFF'};
    }
    .popup-content {
      padding: 6px 8px;
    }
    .popup-title {
      font-size: 13px;
      font-weight: 800;
      margin: 0 0 2px 0;
      color: ${isDark ? '#F8FAFC' : '#0F172A'};
    }
    .popup-address {
      font-size: 11px;
      color: ${isDark ? '#94A3B8' : '#64748B'};
      margin: 0 0 6px 0;
      max-width: 190px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .popup-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .popup-verified { background: rgba(16, 185, 129, 0.15); color: #10B981; }
    .popup-pending { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
    .popup-disputed { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
    .popup-tap {
      font-size: 10px;
      color: #FF5A36;
      font-weight: 700;
      margin-top: 6px;
      text-align: right;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      tap: true,
      maxZoom: 19,
    });
    window.map = map;

    // CartoDB Voyager / OpenStreetMap standard tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const places = ${JSON.stringify(places)};
    const selectedId = "${selectedPlaceId || ''}";
    const userLoc = ${userLocation ? JSON.stringify(userLocation) : 'null'};

    const markers = {};
    let bounds = L.latLngBounds();

    function post(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(JSON.stringify(payload), '*');
      }
    }

    // Accessible SVGs for different accessibility statuses
    const ICONS = {
      // Verified: checkmark & wheelchair
      verified: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1 15-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9z"/></svg>',
      // Pending: time / half-check warning
      pending: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2V7h2zm0-9h-2V5h2z"/></svg>',
      // Disputed / Non-accessible: barrier / alert
      disputed: '<svg viewBox="0 0 24 24"><path d="M12 2 1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/></svg>',
    };

    // Render Places Markers
    places.forEach(place => {
      const isSelected = place.id === selectedId;
      const status = place.status || 'pending';
      const iconSvg = ICONS[status] || ICONS.pending;

      const html = '<div class="pin-container status-' + status + (isSelected ? ' pin-selected' : '') + '">' +
        '<div class="pin-badge">' + iconSvg + '</div>' +
        '</div>';

      const icon = L.divIcon({
        html: html,
        className: '',
        iconSize: [38, 46],
        iconAnchor: [19, 44],
        popupAnchor: [0, -42],
      });

      const marker = L.marker([place.lat, place.lng], {
        icon: icon,
        title: place.name,
        alt: place.name + ' - ' + status,
      }).addTo(map);

      // Tooltip Popup
      const statusLabel = status === 'verified'
        ? 'Fully Accessible'
        : status === 'disputed'
        ? 'Not Accessible'
        : 'Partially Accessible';

      const popupHtml = '<div class="popup-content">' +
        '<div class="popup-title">' + place.name + '</div>' +
        '<div class="popup-address">' + (place.address || '') + '</div>' +
        '<div class="popup-badge popup-' + status + '">' + statusLabel + '</div>' +
        '<div class="popup-tap">Tap to view details →</div>' +
        '</div>';

      marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -10] });

      marker.on('click', () => {
        post({ type: 'select', placeId: place.id });
      });

      markers[place.id] = marker;
      bounds.extend([place.lat, place.lng]);
    });

    // Render User Location if available
    let userMarker = null;
    if (userLoc && typeof userLoc.latitude === 'number' && typeof userLoc.longitude === 'number') {
      const userHtml = '<div class="user-location-pin">' +
        '<div class="user-location-pulse"></div>' +
        '</div>';

      const userIcon = L.divIcon({
        html: userHtml,
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      userMarker = L.marker([userLoc.latitude, userLoc.longitude], {
        icon: userIcon,
        zIndexOffset: 1500,
        title: 'You are here',
      }).addTo(map);
      bounds.extend([userLoc.latitude, userLoc.longitude]);
    }

    function fitToPlaces() {
      if (selectedId && markers[selectedId]) {
        map.setView(markers[selectedId].getLatLng(), 15, { animate: true });
        markers[selectedId].openPopup();
      } else if (places.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } else if (userLoc) {
        map.setView([userLoc.latitude, userLoc.longitude], 14);
      } else {
        // Default Sri Lanka / Global view
        map.setView([6.9271, 79.8612], 12);
      }
    }

    fitToPlaces();

    window.mapCommand = function (cmd) {
      if (cmd === 'zoomIn') {
        map.zoomIn();
      } else if (cmd === 'zoomOut') {
        map.zoomOut();
      } else if (cmd === 'reset') {
        fitToPlaces();
      } else if (cmd === 'locateUser') {
        if (userLoc) {
          map.flyTo([userLoc.latitude, userLoc.longitude], 16, { animate: true, duration: 1.2 });
          if (userMarker) userMarker.openPopup();
        } else {
          post({ type: 'requestLocation' });
        }
      }
    };

    window.addEventListener('message', function (event) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'MAP_COMMAND') {
          window.mapCommand(data.cmd);
        }
      } catch (e) {}
    });
  </script>
</body>
</html>`;

  const sendMapCommand = (cmd: MapCommand) => {
    if (cmd === 'locateUser' && onLocateMe) {
      onLocateMe();
    }
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage({ type: 'MAP_COMMAND', cmd }, '*');
      return;
    }
    webviewRef.current?.injectJavaScript(
      `if (window.mapCommand) { window.mapCommand(${JSON.stringify(cmd)}); } true;`
    );
  };

  const handleMessage = (event: any) => {
    try {
      const data =
        typeof event.nativeEvent === 'object' && event.nativeEvent.data
          ? JSON.parse(event.nativeEvent.data)
          : typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data;

      if (data && data.type === 'select') {
        const place = places.find((p) => p.id === data.placeId);
        if (place) {
          onSelectPlace(place);
        }
      } else if (data && data.type === 'requestLocation') {
        if (onLocateMe) onLocateMe();
      }
    } catch (e) {}
  };

  const handleWebMessage = (event: MessageEvent) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data && data.type === 'select') {
        const place = places.find((p) => p.id === data.placeId);
        if (place) {
          onSelectPlace(place);
        }
      } else if (data && data.type === 'requestLocation') {
        if (onLocateMe) onLocateMe();
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [places]);

  const verifiedCount = places.filter((p) => p.status === 'verified').length;
  const pendingCount = places.filter((p) => p.status === 'pending').length;
  const disputedCount = places.filter((p) => p.status === 'disputed').length;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        style,
      ]}
      accessible={true}
      accessibilityLabel="Interactive Accessibility Map"
      accessibilityHint="Interactive map displaying community verified public spaces with color-coded accessibility markers"
    >
      {Platform.OS === 'web' ? (
        // @ts-ignore: iframe supported in react-native-web
        <iframe
          ref={iframeRef}
          title="Interactive accessibility map"
          srcDoc={mapHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <WebView
          ref={webviewRef}
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit={false}
        />
      )}

      {/* Accessible Status Legend Bar */}
      <View style={styles.topControlOverlay} pointerEvents="box-none">
        <View
          style={[
            styles.legendContainer,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
          accessible={true}
          accessibilityLabel={`Accessibility Status Legend: ${verifiedCount} fully accessible, ${pendingCount} partially accessible, ${disputedCount} not accessible or unverified.`}
        >
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.legendText, { color: colors.textPrimary }]}>
              Fully Accessible ({verifiedCount})
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.legendText, { color: colors.textPrimary }]}>
              Partially ({pendingCount})
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.legendText, { color: colors.textPrimary }]}>
              Not Accessible ({disputedCount})
            </Text>
          </View>
        </View>
      </View>

      {/* Map Control Buttons: Zoom In, Zoom Out, Locate Me, Re-center */}
      <View style={styles.floatingControls} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.zoomButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => sendMapCommand('zoomIn')}
          accessibilityRole="button"
          accessibilityLabel="Zoom In"
          accessibilityHint="Enlarges the map view to see closer details"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.zoomButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => sendMapCommand('zoomOut')}
          accessibilityRole="button"
          accessibilityLabel="Zoom Out"
          accessibilityHint="Zooms out to view a wider area of the map"
          activeOpacity={0.8}
        >
          <Ionicons name="remove" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.zoomButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => sendMapCommand('locateUser')}
          accessibilityRole="button"
          accessibilityLabel="My Location"
          accessibilityHint="Centers map on your current GPS location"
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={18} color="#FF5A36" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.zoomButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => sendMapCommand('reset')}
          accessibilityRole="button"
          accessibilityLabel="Fit all places"
          accessibilityHint="Adjusts zoom to show all public places in view"
          activeOpacity={0.8}
        >
          <Ionicons name="scan-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 390,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topControlOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  floatingControls: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    zIndex: 20,
    gap: 8,
    alignItems: 'center',
  },
  zoomButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
