import type { Report, PriorityType } from '../../types/accessibility';
import type { CreateReportInput, CreateReportResult, ReportDbRow } from './types';

export interface DatabaseClient {
  from: (table: string) => {
    insert: (data: any) => Promise<{ data?: any; error?: { message: string } | null }>;
    select?: (columns?: string) => any;
  };
}

/**
 * Builds the frontend Report model and the database row payload from the user input.
 * Ensures default values, fallback photos, and initial state (pending, 1 confirm).
 */
export function buildReportRecord(
  input: CreateReportInput,
  customReportId?: string,
  submitterId: string | null = null
): { frontendReport: Report; dbRow: Partial<ReportDbRow> } {
  const reportId = customReportId || `report-${Date.now()}`;
  const targetPlaceId = input.placeId || `place-${Date.now()}`;
  const now = new Date().toISOString();
  
  const fallbackPhoto = 'https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80';
  const photos = input.photos && input.photos.length > 0 ? input.photos : [fallbackPhoto];
  const priority: PriorityType = input.priority || 'Medium';
  const submitterName = input.submitterName || 'Community Auditor (You)';

  const frontendReport: Report = {
    id: reportId,
    placeId: targetPlaceId,
    placeName: input.placeName,
    submitterName,
    submitterAvatar:
      input.submitterAvatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    timestamp: 'Just now',
    note: input.note || 'Community accessibility audit report submitted.',
    featuresReported: input.featuresReported,
    photos,
    priority,
    confirmCount: 1,
    disputeCount: 0,
    status: 'pending',
    confirmedUsers: submitterId ? [submitterId] : [submitterName],
    disputedUsers: [],
  };

  const dbRow: Partial<ReportDbRow> = {
    id: reportId,
    place_id: targetPlaceId,
    place_name: input.placeName,
    submitter_id: submitterId,
    submitter_name: frontendReport.submitterName,
    submitter_avatar: frontendReport.submitterAvatar,
    note: frontendReport.note,
    features_reported: input.featuresReported,
    photos,
    priority: frontendReport.priority,
    confirm_count: 1,
    dispute_count: 0,
    status: 'pending',
    confirmed_users: submitterId ? [submitterId] : [frontendReport.submitterName],
    disputed_users: [],
    latitude: input.location?.latitude ?? null,
    longitude: input.location?.longitude ?? null,
    address: input.location?.address ?? null,
    created_at: now,
  };

  return { frontendReport, dbRow };
}

/**
 * Handles the complete report submission flow:
 * 1. Data transformation & payload generation
 * 2. Persistence to Supabase database (if configured)
 * 3. Graceful offline/error fallback with local frontend report return
 */
export async function processReportSubmission(
  input: CreateReportInput,
  client?: DatabaseClient | null,
  customReportId?: string,
  submitterId: string | null = null
): Promise<CreateReportResult> {
  const { frontendReport, dbRow } = buildReportRecord(input, customReportId, submitterId);

  // If no DB client is configured, return offline fallback
  if (!client) {
    return {
      success: true,
      report: frontendReport,
      persistedToSupabase: false,
    };
  }

  try {
    const { error } = await client.from('reports').insert(dbRow);

    if (error) {
      return {
        success: true,
        report: frontendReport,
        persistedToSupabase: false,
        error: error.message,
      };
    }

    return {
      success: true,
      report: frontendReport,
      persistedToSupabase: true,
    };
  } catch (err: any) {
    return {
      success: true,
      report: frontendReport,
      persistedToSupabase: false,
      error: err?.message || 'Network error',
    };
  }
}
