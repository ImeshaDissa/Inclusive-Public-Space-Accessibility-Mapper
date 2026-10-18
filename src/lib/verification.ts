import type { StatusType, Report } from '../types/accessibility';

/**
 * Community Verification Threshold Constants.
 * - 3 Unique user confirmations are required to verify a location/report.
 * - 2 Unique user disputes flag a location/report as disputed.
 */
export const VERIFICATION_THRESHOLDS = {
  CONFIRM_REQUIRED: 3,
  DISPUTE_REQUIRED: 2,
} as const;

/**
 * Computes status based on confirmation and dispute thresholds.
 * Rules:
 *   - 2+ Disputes -> 'disputed'
 *   - 3+ Confirms -> 'verified'
 *   - Otherwise -> 'pending'
 */
export function computeStatus(confirmCount: number, disputeCount: number): StatusType {
  if (disputeCount >= VERIFICATION_THRESHOLDS.DISPUTE_REQUIRED) return 'disputed';
  if (confirmCount >= VERIFICATION_THRESHOLDS.CONFIRM_REQUIRED) return 'verified';
  return 'pending';
}

/**
 * Community Trust and Accessibility Rating model.
 * Provides a 1.0 - 5.0 Star Rating, 0 - 100% Trust Score, and Grade
 * based on community verification consensus.
 */
export interface CommunityRating {
  stars: number; // 1.0 to 5.0
  scorePercent: number; // 0% to 100%
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  label: 'Highly Trusted' | 'Verified Accessible' | 'Pending Verification' | 'Caution Needed' | 'Disputed / Inaccessible';
  totalVotes: number;
}

export function calculateCommunityRating(confirmCount: number, disputeCount: number): CommunityRating {
  const confirms = Math.max(0, confirmCount);
  const disputes = Math.max(0, disputeCount);
  const totalVotes = confirms + disputes;

  if (totalVotes === 0) {
    return {
      stars: 3.0,
      scorePercent: 50,
      grade: 'C',
      label: 'Pending Verification',
      totalVotes: 0,
    };
  }

  // 2 or more disputes immediately lowers rating to Disputed / Grade F
  if (disputes >= VERIFICATION_THRESHOLDS.DISPUTE_REQUIRED) {
    const penalty = Math.min(10, (disputes - 2) * 5);
    const scorePercent = Math.max(5, 20 - penalty);
    return {
      stars: 1.0,
      scorePercent,
      grade: 'F',
      label: 'Disputed / Inaccessible',
      totalVotes,
    };
  }

  // 3 or more confirms with 0 disputes qualifies for Grade A/A+
  if (confirms >= VERIFICATION_THRESHOLDS.CONFIRM_REQUIRED && disputes === 0) {
    const isElite = confirms >= 5;
    return {
      stars: isElite ? 5.0 : 4.5,
      scorePercent: isElite ? 100 : 90,
      grade: isElite ? 'A+' : 'A',
      label: isElite ? 'Highly Trusted' : 'Verified Accessible',
      totalVotes,
    };
  }

  // Weighted trust formula: Confirms carry positive weight, disputes carry 2.5x negative weight
  const weightedTotal = confirms + disputes * 2.5;
  const rawRatio = weightedTotal > 0 ? confirms / weightedTotal : 0.5;
  const scorePercent = Math.min(85, Math.max(25, Math.round(rawRatio * 100)));
  const stars = Number((1.0 + (scorePercent / 100) * 3.5).toFixed(1));

  let grade: CommunityRating['grade'] = 'C';
  let label: CommunityRating['label'] = 'Pending Verification';

  if (scorePercent >= 75) {
    grade = 'B';
    label = 'Pending Verification';
  } else if (scorePercent >= 50) {
    grade = 'C';
    label = 'Pending Verification';
  } else {
    grade = 'D';
    label = 'Caution Needed';
  }

  return {
    stars,
    scorePercent,
    grade,
    label,
    totalVotes,
  };
}

export interface VerificationValidationResult {
  success: boolean;
  message?: string;
  alreadyProcessed?: boolean;
  newStatus?: StatusType;
  newConfirmCount?: number;
  newDisputeCount?: number;
  updatedUsers?: string[];
}

/**
 * Validates a user confirmation attempt on a report.
 * Enforces:
 *   1. Authentication (valid userId)
 *   2. Finalized status lock (cannot vote on verified/disputed reports)
 *   3. Anti-spam / duplicate protection (same user cannot confirm twice)
 */
export function validateReportConfirmation(
  report: Pick<Report, 'id' | 'status' | 'confirmCount' | 'disputeCount' | 'confirmedUsers'>,
  userId: string
): VerificationValidationResult {
  if (!userId || !userId.trim()) {
    return {
      success: false,
      message: 'Authentication required. User ID must be provided.',
    };
  }

  if (report.status === 'verified' || report.status === 'disputed') {
    return {
      success: false,
      message: 'Report is already finalized.',
    };
  }

  const existingConfirmedUsers = report.confirmedUsers || [];
  if (existingConfirmedUsers.includes(userId)) {
    return {
      success: false,
      alreadyProcessed: true,
      message: 'You have already confirmed this report. Confirmations from 3 different users are required for verification.',
    };
  }

  const updatedConfirmedUsers = [...existingConfirmedUsers, userId];
  const newConfirm = Math.max((report.confirmCount || 0) + 1, updatedConfirmedUsers.length);
  const newStatus = computeStatus(newConfirm, report.disputeCount || 0);

  return {
    success: true,
    newStatus,
    newConfirmCount: newConfirm,
    updatedUsers: updatedConfirmedUsers,
  };
}

/**
 * Validates a user dispute attempt on a report.
 * Enforces:
 *   1. Authentication (valid userId)
 *   2. Valid dispute reason provided
 *   3. Finalized status lock
 *   4. Anti-spam / duplicate protection (same user cannot dispute twice)
 */
export function validateReportDispute(
  report: Pick<Report, 'id' | 'status' | 'confirmCount' | 'disputeCount' | 'disputedUsers'>,
  userId: string,
  reason: string
): VerificationValidationResult {
  if (!userId || !userId.trim()) {
    return {
      success: false,
      message: 'Authentication required. User ID must be provided.',
    };
  }

  if (!reason || !reason.trim()) {
    return {
      success: false,
      message: 'A valid reason is required to dispute a report.',
    };
  }

  if (report.status === 'verified' || report.status === 'disputed') {
    return {
      success: false,
      message: 'Report is already finalized.',
    };
  }

  const existingDisputedUsers = report.disputedUsers || [];
  if (existingDisputedUsers.includes(userId)) {
    return {
      success: false,
      alreadyProcessed: true,
      message: 'You have already disputed this report.',
    };
  }

  const updatedDisputedUsers = [...existingDisputedUsers, userId];
  const newDisputes = Math.max((report.disputeCount || 0) + 1, updatedDisputedUsers.length);
  const newStatus = computeStatus(report.confirmCount || 0, newDisputes);

  return {
    success: true,
    newStatus,
    newDisputeCount: newDisputes,
    updatedUsers: updatedDisputedUsers,
  };
}
