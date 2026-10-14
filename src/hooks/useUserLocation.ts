import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

export function useUserLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const loadLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const granted = permission.status === Location.PermissionStatus.GRANTED;
      setPermissionGranted(granted);

      if (!granted) {
        throw new Error("Location permission was not granted.");
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
      return currentLocation;
    } catch (locationError) {
      const err =
        locationError instanceof Error
          ? locationError
          : new Error("Unable to obtain current location.");
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocation();
  }, [loadLocation]);

  return {
    location,
    isLoading,
    error,
    permissionGranted,
    refreshLocation: loadLocation,
  };
}
