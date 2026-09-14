export type ReportStatus = 'Pending' | 'Confirmed' | 'Disputed';

export interface VerificationReport {
  id: string;
  placeName: string;
  photoUrl: string;
  note: string;
  status: ReportStatus;
  confirmations: number;
  disputes: number;
  userConfirmed?: boolean;
  userDisputed?: boolean;
  createdAt?: string | Date;
}

export interface DisputeSubmission {
  reportId: string;
  reason: string;
  details?: string;
  photoUri?: string | null;
}
