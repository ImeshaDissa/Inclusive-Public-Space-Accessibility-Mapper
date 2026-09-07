import { supabase } from '@/lib/supabase';
import { Report, StatusType, Place } from '@/types/accessibility';
import { CreateReportInput, CreateReportResult, ReportDbRow } from './types';

/**
 * Upload an image (base64 Data URL, Blob URL, or remote URI) to Supabase Storage.
 * Returns the permanent public URL on success, or the original URI on fallback.
 */
export async function uploadReportPhotoToSupabase(
  photoUri: string,
  reportId: string,
  index: number
): Promise<string> {
  // If it's already a regular remote web URL, keep it as is
  if (
    (photoUri.startsWith('http://') || photoUri.startsWith('https://')) &&
    !photoUri.includes('blob:')
  ) {
    return photoUri;
  }

  try {
    const bucketName = 'report-photos';
    const filePath = `${reportId}/${Date.now()}_${index}.jpg`;

    // Handle base64 Data URL
    if (photoUri.startsWith('data:')) {
      const parts = photoUri.split(',');
      if (parts.length === 2) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64Data = parts[1];

        // Convert base64 to Uint8Array for binary upload
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, byteArray, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.warn('[Supabase Storage] Photo upload note:', uploadError.message);
          return photoUri;
        }

        const { data: publicData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        return publicData?.publicUrl || photoUri;
      }
    }

    // Handle blob: or local file: URI
    const response = await fetch(photoUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[Supabase Storage] Blob upload note:', uploadError.message);
      return photoUri;
    }

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicData?.publicUrl || photoUri;
  } catch (err) {
    console.warn('[Supabase Storage] Could not upload photo to storage bucket, using local URI:', err);
    return photoUri;
  }
}

/**
 * Upload all report photos to Supabase Storage concurrently.
 */
export async function uploadAllReportPhotos(
  photos: string[],
  reportId: string
): Promise<string[]> {
  if (!photos || photos.length === 0) return [];

  const uploadPromises = photos.map((uri, idx) =>
    uploadReportPhotoToSupabase(uri, reportId, idx)
  );

  return Promise.all(uploadPromises);
}

/**
 * Creates a report in Supabase backend database with offline & missing-table fallback.
 */
export async function createReportInBackend(
  input: CreateReportInput
): Promise<CreateReportResult> {
  const reportId = `report-${Date.now()}`;
  const targetPlaceId = input.placeId || `place-${Date.now()}`;
  const now = new Date().toISOString();

  // 1. Process and upload photos to Supabase Storage
  let uploadedPhotos = input.photos;
  try {
    uploadedPhotos = await uploadAllReportPhotos(input.photos, reportId);
  } catch (e) {
    console.warn('[Backend] Photo upload processing error, proceeding with input photos:', e);
  }

  // Ensure at least 1 fallback photo if none provided
  const finalPhotos =
    uploadedPhotos.length > 0
      ? uploadedPhotos
      : ['https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80'];

  // 2. Build local frontend Report object
  const frontendReport: Report = {
    id: reportId,
    placeId: targetPlaceId,
    placeName: input.placeName,
    submitterName: input.submitterName || 'Community Auditor (You)',
    submitterAvatar:
      input.submitterAvatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    timestamp: 'Just now',
    note: input.note || 'Community accessibility audit report submitted.',
    featuresReported: input.featuresReported,
    photos: finalPhotos,
    priority: input.priority || 'Medium',
    confirmCount: 1,
    disputeCount: 0,
    status: 'pending',
  };

  // 3. Prepare Supabase database row payload
  const dbRow: Partial<ReportDbRow> = {
    id: reportId,
    place_id: targetPlaceId,
    place_name: input.placeName,
    submitter_name: frontendReport.submitterName,
    submitter_avatar: frontendReport.submitterAvatar,
    note: frontendReport.note,
    features_reported: input.featuresReported,
    photos: finalPhotos,
    priority: frontendReport.priority,
    confirm_count: 1,
    dispute_count: 0,
    status: 'pending',
    latitude: input.location?.latitude ?? null,
    longitude: input.location?.longitude ?? null,
    address: input.location?.address ?? null,
    created_at: now,
  };

  // 4. Insert into Supabase table 'reports'
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert([dbRow])
      .select()
      .single();

    if (error) {
      console.warn('[Backend Supabase] Could not insert into "reports" table:', error.message);
      // Return successfully with local report so app flow never breaks
      return {
        success: true,
        report: frontendReport,
        persistedToSupabase: false,
        error: error.message,
      };
    }

    // Successfully saved to Supabase
    return {
      success: true,
      report: frontendReport,
      persistedToSupabase: true,
    };
  } catch (err: any) {
    console.warn('[Backend Supabase] Network or connection issue:', err);
    return {
      success: true,
      report: frontendReport,
      persistedToSupabase: false,
      error: err?.message || 'Network error',
    };
  }
}

/**
 * Fetch all verified/pending reports from Supabase backend.
 */
export async function fetchReportsFromBackend(): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[Backend Supabase] Could not fetch reports:', error?.message);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      placeId: row.place_id,
      placeName: row.place_name,
      submitterName: row.submitter_name || 'Anonymous User',
      submitterAvatar: row.submitter_avatar,
      timestamp: formatRelativeTimestamp(row.created_at),
      note: row.note || '',
      featuresReported: row.features_reported || {},
      photos: Array.isArray(row.photos) ? row.photos : [],
      priority: row.priority || 'Medium',
      confirmCount: row.confirm_count || 1,
      disputeCount: row.dispute_count || 0,
      status: row.status || 'pending',
      disputeReasons: row.dispute_reasons || [],
    }));
  } catch (e) {
    console.warn('[Backend Supabase] Error in fetchReportsFromBackend:', e);
    return [];
  }
}

/**
 * Update report confirmation in Supabase backend.
 */
export async function confirmReportInBackend(
  reportId: string,
  newConfirmCount: number,
  newStatus: StatusType
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reports')
      .update({
        confirm_count: newConfirmCount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      console.warn('[Backend Supabase] confirmReportInBackend note:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Update report dispute in Supabase backend.
 */
export async function disputeReportInBackend(
  reportId: string,
  reason: string,
  newDisputeCount: number,
  newStatus: StatusType
): Promise<boolean> {
  try {
    // Fetch existing dispute reasons
    const { data: existing } = await supabase
      .from('reports')
      .select('dispute_reasons')
      .eq('id', reportId)
      .single();

    const existingReasons: string[] = existing?.dispute_reasons || [];
    const updatedReasons = [...existingReasons, reason];

    const { error } = await supabase
      .from('reports')
      .update({
        dispute_count: newDisputeCount,
        status: newStatus,
        dispute_reasons: updatedReasons,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      console.warn('[Backend Supabase] disputeReportInBackend note:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Helper to display relative timestamps from database ISO dates.
 */
function formatRelativeTimestamp(isoDate: string): string {
  if (!isoDate) return 'Just now';
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Recently';
  }
}
