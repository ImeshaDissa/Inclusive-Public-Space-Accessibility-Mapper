import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Place, StatusType } from '@/types/accessibility';
import { MOCK_PLACES } from '@/constants/mockData';

/**
 * Fetch all accessibility places from Supabase `places` table.
 */
export async function fetchPlacesFromSupabase(userId?: string): Promise<Place[]> {
  if (!isSupabaseConfigured) {
    return MOCK_PLACES;
  }

  try {
    const { data: dbPlaces, error } = await supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !dbPlaces || dbPlaces.length === 0) {
      return MOCK_PLACES;
    }

    // Fetch saved places for the user if authenticated
    let savedPlaceIds = new Set<string>();
    if (userId) {
      const { data: savedData } = await supabase
        .from('user_saved_places')
        .select('place_id')
        .eq('user_id', userId);

      if (savedData) {
        savedPlaceIds = new Set(savedData.map((s) => s.place_id));
      }
    }

    return dbPlaces.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      features: p.features || {
        ramp: false,
        elevator: false,
        toilet: false,
        parking: false,
        stepFree: false,
        tactilePaving: false,
        automaticDoor: false,
      },
      photos: p.photos && p.photos.length > 0 ? p.photos : ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'],
      confirmCount: p.confirm_count || 0,
      disputeCount: p.dispute_count || 0,
      status: (p.status as StatusType) || 'pending',
      saved: savedPlaceIds.has(p.id),
      description: p.description || '',
    }));
  } catch (err) {
    console.error('Error fetching places from Supabase:', err);
    return MOCK_PLACES;
  }
}

/**
 * Insert a new accessible place into Supabase `places` table.
 */
export async function insertPlaceToSupabase(place: Place): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase.from('places').insert({
      id: place.id,
      name: place.name,
      category: place.category,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      features: place.features,
      photos: place.photos,
      confirm_count: place.confirmCount,
      dispute_count: place.disputeCount,
      status: place.status,
      description: place.description,
    });

    if (error) {
      console.error('Error inserting place into Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error inserting place into Supabase:', err);
    return false;
  }
}

/**
 * Update place confirm count, dispute count, and status in Supabase.
 */
export async function updatePlaceStatusInSupabase(
  placeId: string,
  confirmCount: number,
  disputeCount: number,
  status: StatusType
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase
      .from('places')
      .update({
        confirm_count: confirmCount,
        dispute_count: disputeCount,
        status,
      })
      .eq('id', placeId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Toggle saved place for an authenticated user in `user_saved_places`.
 */
export async function toggleSavePlaceInSupabase(
  userId: string,
  placeId: string,
  shouldSave: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return true;

  try {
    if (shouldSave) {
      const { error } = await supabase
        .from('user_saved_places')
        .insert({ user_id: userId, place_id: placeId });
      return !error;
    } else {
      const { error } = await supabase
        .from('user_saved_places')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId);
      return !error;
    }
  } catch {
    return false;
  }
}
