import { supabase } from "@/lib/supabase";
import type { Place } from "./types";

export async function getNearbyPlaces(
  latitude: number,
  longitude: number,
): Promise<Place[]> {
  // TODO: add radius filter using latitude/longitude once place count grows
  // large enough that fetching every row stops being practical. Options:
  // - PostGIS ST_DWithin query via a Postgres RPC function
  // - Simple bounding-box filter (.gte/.lte on lat/long) as a lighter interim step
  const { data, error } = await supabase
    .from("places")
    .select("id, name, latitude, longitude, overall_status")
    .order("id");

  if (error) {
    throw error;
  }

  void latitude;
  void longitude;
  return (data ?? []) as Place[];
}