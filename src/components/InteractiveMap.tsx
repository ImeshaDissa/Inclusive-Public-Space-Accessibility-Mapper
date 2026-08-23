import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Place, StatusType } from '@/types/accessibility';

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
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'dark'>('dark');

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return '#10B981'; // Green
      case 'disputed':
        return '#EF4444'; // Red
      case 'pending':
      default:
        return '#F59E0B'; // Yellow/Amber
    }
  };

  const getStatusBadge = (status: StatusType) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'disputed':
        return 'Disputed';
      case 'pending':
        return 'Pending';
    }
  };

  // Convert lat/lng into relative percentage coordinates on map canvas for smooth visual placement
  const getCoordinatesPercentage = (lat: number, lng: number, index: number) => {
    // Preset map offsets for realistic spread across canvas
    const presetPositions = [
      { top: 22, left: 32 },
      { top: 48, left: 65 },
      { top: 72, left: 28 },
      { top: 38, left: 80 },
      { top: 62, left: 74 },
    ];
    return presetPositions[index % presetPositions.length];
  };

  return (
    <View style={[styles.container, mapStyle === 'dark' ? styles.darkMap : styles.lightMap]}>
      {/* Map Header Overlay */}
      <View style={styles.topControlOverlay}>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Verified (3+)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Pending</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Disputed (2+)</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.styleToggleBtn}
          onPress={() =>
            setMapStyle((prev) => (prev === 'dark' ? 'standard' : prev === 'standard' ? 'satellite' : 'dark'))
          }
        >
          <Ionicons name="layers-outline" size={16} color="#FFF" />
          <Text style={styles.styleToggleText}>
            {mapStyle.toUpperCase()}
          </Text>
        </TouchableOpacity>
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
          <Ionicons name="locate" size={18} color="#6366F1" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 340,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  darkMap: {
    backgroundColor: '#0F172A',
  },
  lightMap: {
    backgroundColor: '#E2E8F0',
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
  },
  styleToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  styleToggleText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '700',
  },
  canvasWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mapRoadHorizontal1: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
    transform: [{ rotate: '-4deg' }],
  },
  mapRoadHorizontal2: {
    position: 'absolute',
    top: '68%',
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
  },
  mapRoadVertical1: {
    position: 'absolute',
    left: '45%',
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
  },
  mapRiver: {
    position: 'absolute',
    right: '-10%',
    top: 0,
    bottom: 0,
    width: '35%',
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderRadius: 80,
  },
  mapParkZone: {
    position: 'absolute',
    left: '8%',
    top: '15%',
    width: '28%',
    height: '40%',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  markerWrapper: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  selectedMarkerWrapper: {
    zIndex: 30,
    transform: [{ scale: 1.15 }],
  },
  markerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 2,
  },
  markerPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
    alignItems: 'center',
    maxWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  selectedPill: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1B4B',
  },
  markerName: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  markerStatusTag: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    top: -8,
    opacity: 0.6,
  },
  floatingControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    gap: 6,
    zIndex: 25,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
