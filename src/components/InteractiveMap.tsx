import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Place } from '@/types/accessibility';
import { useAppTheme } from '@/context/ThemeContext';

interface InteractiveMapProps {
  places: Place[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: Place) => void;
}

type MapCommand = 'zoomIn' | 'zoomOut' | 'reset';

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  places,
  selectedPlaceId,
  onSelectPlace,
}) => {
  const { colors } = useAppTheme();
  const webviewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  // Modern UI Map HTML using Leaflet and free CartoDB Voyager tiles (shows real Sri Lanka places)
  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${colors.background}; }
    .leaflet-control-attribution { display: none !important; }

    .custom-marker {
      border-radius: 50%;
      border: 2.5px solid white;
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all 0.3s ease;
    }
    .selected-marker {
      transform: scale(1.3);
      border-width: 3px;
      z-index: 1000 !important;
      box-shadow: 0 6px 12px rgba(0,0,0,0.5);
    }
    .custom-marker.verified { background-color: #10B981; }
    .custom-marker.disputed { background-color: #EF4444; }
    .custom-marker.pending { background-color: #F59E0B; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false });
    window.map = map;

    // Google Maps Standard Roadmap Tiles
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
    }).addTo(map);

    const places = ${JSON.stringify(places)};
    const selectedId = "${selectedPlaceId || ''}";

    const markers = {};
    let bounds = L.latLngBounds();

    function post(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(JSON.stringify(payload), '*');
      }
    }

    function fitToPlaces() {
      if (selectedId && markers[selectedId]) {
        map.setView(markers[selectedId].getLatLng(), 15);
      } else if (places.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } else {
        // Default center to Sri Lanka
        map.setView([7.8731, 80.7718], 7);
      }
    }

    if (places.length > 0) {
      places.forEach(place => {
        const isSelected = place.id === selectedId;
        const statusClass = place.status;

        const html = '<div class="custom-marker ' + statusClass + (isSelected ? ' selected-marker' : '') + '" style="width: 100%; height: 100%;"></div>';

        const icon = L.divIcon({
          html: html,
          className: '',
          iconSize: isSelected ? [24, 24] : [16, 16],
          iconAnchor: isSelected ? [12, 12] : [8, 8],
        });

        const marker = L.marker([place.lat, place.lng], { icon: icon }).addTo(map);
        marker.on('click', () => {
          post({ type: 'select', placeId: place.id });
        });

        markers[place.id] = marker;
        bounds.extend([place.lat, place.lng]);
      });
    }

    fitToPlaces();

    window.mapCommand = function (cmd) {
      if (cmd === 'zoomIn') {
        map.zoomIn();
      } else if (cmd === 'zoomOut') {
        map.zoomOut();
      } else if (cmd === 'reset') {
        fitToPlaces();
      }
    };

    window.addEventListener('message', function (event) {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data && data.type === 'MAP_COMMAND') {
        window.mapCommand(data.cmd);
      }
    });
  </script>
</body>
</html>`;

  const sendMapCommand = (cmd: MapCommand) => {
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
      const data = typeof event.nativeEvent === 'object' && event.nativeEvent.data
        ? JSON.parse(event.nativeEvent.data)
        : typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

      if (data && data.type === 'select') {
        const place = places.find(p => p.id === data.placeId);
        if (place) {
          onSelectPlace(place);
        }
      }
    } catch (e) {}
  };

  const handleWebMessage = (event: MessageEvent) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data && data.type === 'select') {
        const place = places.find(p => p.id === data.placeId);
        if (place) {
          onSelectPlace(place);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [places]);

  return (
    <View style={[styles.container, { borderColor: colors.cardBorder }]}>
      {Platform.OS === 'web' ? (
        // @ts-ignore: iframe is supported in react-native-web
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
        />
      )}

      {/* Legend Overlay for Modern UI */}
      <View style={styles.topControlOverlay}>
        <View style={[styles.legendContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.legendText, { color: colors.textPrimary }]}>Verified</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.legendText, { color: colors.textPrimary }]}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Map Zoom Controls Floating Buttons */}
      <View style={styles.floatingControls}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => sendMapCommand('zoomIn')}
          accessibilityRole="button"
          accessibilityLabel="Zoom in on map"
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => sendMapCommand('zoomOut')}
          accessibilityRole="button"
          accessibilityLabel="Zoom out of map"
        >
          <Ionicons name="remove" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => sendMapCommand('reset')}
          accessibilityRole="button"
          accessibilityLabel="Reset map view"
        >
          <Ionicons name="locate" size={18} color="#FF5A36" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 380,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  legendContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
