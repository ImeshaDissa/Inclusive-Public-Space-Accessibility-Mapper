import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Report, StatusType } from '@/types/accessibility';
import { MOCK_REPORTS } from '@/constants/mockData';

/**
 * Fetch all accessibility reports from Supabase `reports` table.
 */
export async function fetchReportsFromSupabase(): Promise<Report[]> {
  if (!isSupabaseConfigured) {
    return MOCK_REPORTS;
  }

  try {
    const { data: dbReports, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !dbReports || dbReports.length === 0) {
      return MOCK_REPORTS;
    }

    return dbReports.map((r) => ({
      id: r.id,
      placeId: r.place_id,
      placeName: r.place_name,
      submitterName: r.submitter_name,
      submitterAvatar: r.submitter_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      timestamp: formatTimeAgo(r.created_at),
      note: r.note || '',
      featuresReported: r.features_reported || {},
      photos: r.photos || [],
      priority: r.priority || 'Medium',
      confirmCount: r.confirm_count || 1,
      disputeCount: r.dispute_count || 0,
      disputeReasons: r.dispute_reasons || [],
      status: (r.status as StatusType) || 'pending',
    }));
  } catch (err) {
    console.error('Error fetching reports from Supabase:', err);
    return MOCK_REPORTS;
  }
}

/**
 * Insert a new accessibility audit report into Supabase `reports` table.
 */
export async function insertReportToSupabase(
  report: Report,
  submitterUserId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase.from('reports').insert({
      id: report.id,
      place_id: report.placeId,
      place_name: report.placeName,
      submitter_id: submitterUserId || null,
      submitter_name: report.submitterName,
      submitter_avatar: report.submitterAvatar,
      note: report.note,
      features_reported: report.featuresReported,
      photos: report.photos,
      priority: report.priority,
      confirm_count: report.confirmCount,
      dispute_count: report.disputeCount,
      dispute_reasons: report.disputeReasons || [],
      status: report.status,
    });

    if (error) {
      console.error('Error inserting report into Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error inserting report into Supabase:', err);
    return false;
  }
}

/**
 * Update report confirmations in Supabase.
 */
export async function updateReportConfirmInSupabase(
  reportId: string,
  confirmCount: number,
  status: StatusType
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase
      .from('reports')
      .update({
        confirm_count: confirmCount,
        status,
      })
      .eq('id', reportId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Update report disputes in Supabase.
 */
export async function updateReportDisputeInSupabase(
  reportId: string,
  disputeCount: number,
  disputeReasons: string[],
  status: StatusType
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase
      .from('reports')
      .update({
        dispute_count: disputeCount,
        dispute_reasons: disputeReasons,
        status,
      })
      .eq('id', reportId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Insert a detailed record into Supabase `dispute_reasons` table.
 */
export async function insertDisputeReasonToSupabase({
  reportId,
  placeId,
  userId,
  userName,
  reason,
  note,
}: {
  reportId?: string;
  placeId?: string;
  userId?: string;
  userName?: string;
  reason: string;
  note?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase.from('dispute_reasons').insert({
      report_id: reportId || null,
      place_id: placeId || null,
      user_id: userId || null,
      user_name: userName || null,
      reason,
      note: note || null,
    });

    if (error) {
      console.error('Error inserting dispute reason into Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error inserting dispute reason into Supabase:', err);
    return false;
  }
}

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}
