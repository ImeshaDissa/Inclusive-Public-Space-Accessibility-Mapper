import React, { useRef, useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Place, StatusType } from '@/types/accessibility';
import { useAppTheme } from '@/context/ThemeContext';

interface InteractiveMapProps {
  places: Place[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: Place) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  places,
  selectedPlaceId,
  onSelectPlace,
}) => {
  const { colors } = useAppTheme();
  const webviewRef = useRef<WebView>(null);
  const [mapKey, setMapKey] = useState(0);

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

    if (places.length === 0) {
      // Default center to Sri Lanka
      map.setView([7.8731, 80.7718], 7);
    } else {
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

      if (selectedId && markers[selectedId]) {
        map.setView(markers[selectedId].getLatLng(), 15);
      } else {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  </script>
</body>
</html>`;

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

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [places]);

  return (
    <View style={[styles.container, { borderColor: colors.cardBorder }]}>
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

      {/* Visual Canvas Vector Graphic & Roads */}
      <View style={[styles.canvasWrapper, { transform: [{ scale: zoomLevel }] }]}>
        {/* Decorative Grid / Simulated Map Features */}
        <View style={styles.mapRoadHorizontal1} />
        <View style={styles.mapRoadHorizontal2} />
        <View style={styles.mapRoadVertical1} />
        <View style={styles.mapRiver} />
        <View style={styles.mapParkZone} />

        {/* Place Pin Markers */}
        {places.map((place, index) => {
          const { top, left } = getCoordinatesPercentage(place.lat, place.lng, index);
          const isSelected = selectedPlaceId === place.id;
          const statusColor = getStatusColor(place.status);

          return (
            <TouchableOpacity
              key={place.id}
              activeOpacity={0.8}
              style={[
                styles.markerWrapper,
                { top: `${top}%`, left: `${left}%` },
                isSelected && styles.selectedMarkerWrapper,
              ]}
              onPress={() => onSelectPlace(place)}
            >
              {/* Marker Pin Icon */}
              <View
                style={[
                  styles.markerBadge,
                  { backgroundColor: statusColor, borderColor: isSelected ? '#FFFFFF' : statusColor },
                ]}
              >
                <Ionicons
                  name={
                    place.status === 'verified'
                      ? 'checkmark-circle'
                      : place.status === 'disputed'
                      ? 'alert-circle'
                      : 'time'
                  }
                  size={16}
                  color="#FFF"
                />
              </View>

              {/* Label Pill */}
              <View style={[styles.markerPill, isSelected && styles.selectedPill]}>
                <Text style={styles.markerName} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text style={[styles.markerStatusTag, { color: statusColor }]}>
                  {getStatusBadge(place.status)}
                </Text>
              </View>

              {/* Pulsing indicator if selected */}
              {isSelected && <View style={[styles.pulseRing, { borderColor: statusColor }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Map Zoom Controls Floating Buttons */}
      <View style={styles.floatingControls}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => setZoomLevel((prev) => Math.min(prev + 0.15, 1.4))}
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => setZoomLevel((prev) => Math.max(prev - 0.15, 0.85))}
        >
          <Ionicons name="remove" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => setZoomLevel(1)}
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
  selectedPill: {
    borderColor: '#FF5A36',
    backgroundColor: 'rgba(255, 90, 54, 0.2)',
  },
  markerName: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
