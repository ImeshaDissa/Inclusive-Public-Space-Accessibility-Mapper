export interface VenueLike {
  name?: string;
  [key: string]: any;
}

export interface ReportSubmissionValidationInput {
  featureCount: number;
  note?: string;
  photos?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates whether the user can proceed from Step 1 (Location) to Step 2 (Details).
 * Requires a venue to be selected with a non-empty name.
 */
export function canProceedToDetails(venue?: VenueLike | null): boolean {
  if (!venue || !venue.name) {
    return false;
  }
  return venue.name.trim().length > 0;
}

/**
 * Validates whether the report has at least one piece of verification data
 * (at least one accessibility feature checked, a descriptive note, or a photo).
 */
export function canSubmitReport({
  featureCount,
  note = '',
  photos = [],
}: ReportSubmissionValidationInput): ValidationResult {
  const hasFeatures = featureCount > 0;
  const hasNote = note.trim().length > 0;
  const hasPhotos = photos.length > 0;

  if (!hasFeatures && !hasNote && !hasPhotos) {
    return {
      isValid: false,
      error: 'Please verify at least one feature, add a note, or upload a photo to submit.',
    };
  }

  return { isValid: true };
}

/**
 * Validates if another photo can be attached within the allowed limit (max 5 photos).
 */
export function validatePhotoUpload(
  currentPhotosCount: number,
  maxLimit: number = 5
): ValidationResult {
  if (currentPhotosCount >= maxLimit) {
    return {
      isValid: false,
      error: `You can attach up to ${maxLimit} photos per report.`,
    };
  }
  return { isValid: true };
}

/**
 * Validates an image URL input. Must begin with http:// or https://.
 */
export function validateImageUrl(url: string): ValidationResult {
  const trimmed = url.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Please enter a valid image URL.',
    };
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return {
      isValid: false,
      error: 'Please enter a valid web image URL starting with https://',
    };
  }

  return { isValid: true };
}

/**
 * Helper to display relative timestamps from database ISO dates.
 */
export function formatRelativeTimestamp(isoDate: string): string {
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
