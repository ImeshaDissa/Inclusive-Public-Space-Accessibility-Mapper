import { useQuery } from "@tanstack/react-query";
import { getNearbyPlaces } from "../api";

export function useNearbyPlaces(latitude: number, longitude: number) {
  return useQuery({
    queryKey: ["nearby-places", latitude, longitude],
    queryFn: () => getNearbyPlaces(latitude, longitude),
  });
}