import * as Location from "expo-location";
import { useEffect, useState } from "react";

export function useUserLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          throw new Error("Location permission was not granted.");
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        if (isMounted) {
          setLocation(currentLocation);
        }
      } catch (locationError) {
        if (isMounted) {
          setError(
            locationError instanceof Error
              ? locationError
              : new Error("Unable to get location."),
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  return { location, isLoading, error };
}
