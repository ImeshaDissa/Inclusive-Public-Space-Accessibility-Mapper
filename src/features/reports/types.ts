import { PriorityType, Report, StatusType } from '@/types/accessibility';

export interface CreateReportInput {
  placeId?: string;
  placeName: string;
  category?: string;
  note: string;
  featuresReported: Record<string, boolean>;
  photos: string[];
  priority?: PriorityType;
  submitterName?: string;
  submitterAvatar?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export interface ReportDbRow {
  id: string;
  place_id: string;
  place_name: string;
  submitter_id?: string | null;
  submitter_name: string;
  submitter_avatar?: string | null;
  note: string;
  features_reported: Record<string, boolean>;
  photos: string[];
  priority: PriorityType;
  confirm_count: number;
  dispute_count: number;
  status: StatusType;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  dispute_reasons?: string[];
  created_at: string;
  updated_at?: string;
}

export interface CreateReportResult {
  success: boolean;
  report: Report;
  persistedToSupabase: boolean;
  error?: string;
}
