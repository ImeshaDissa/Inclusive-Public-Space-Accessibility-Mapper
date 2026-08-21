import { useNearbyPlaces } from "@/features/places/hooks/useNearbyPlaces";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

const DEFAULT_REGION: Region = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function getMarkerColor(status?: string | null) {
  switch (status?.toLowerCase()) {
    case "green":
      return "#2E7D32";
    case "yellow":
      return "#EF8C00";
    case "red":
      return "#C62828";
    default:
      return "#667085";
  }
}

export default function MapScreen() {
  const router = useRouter();
  const { location } = useUserLocation();
  const mapRef = useRef<MapView>(null);

  const latitude = location?.coords.latitude ?? DEFAULT_REGION.latitude;
  const longitude = location?.coords.longitude ?? DEFAULT_REGION.longitude;
  const { data: places = [] } = useNearbyPlaces(latitude, longitude);

  useEffect(() => {
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
    }
  }, [location]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={DEFAULT_REGION}
      showsUserLocation
    >
      {places.map((place) => (
        <Marker
          key={place.id}
          coordinate={{ latitude: place.latitude, longitude: place.longitude }}
          pinColor={getMarkerColor(place.overall_status)}
          title={place.name ?? "Accessibility place"}
          onPress={() => {
            router.push({
              pathname: "/place/[id]",
              params: { id: String(place.id) },
            });
          }}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});