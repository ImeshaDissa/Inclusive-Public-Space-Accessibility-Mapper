/**
 * ===============================================================================
 * COMPREHENSIVE AUTOMATED TEST SUITE: COMMUNITY VERIFICATION & RATING
 * ===============================================================================
 * This test suite validates all business rules, thresholds, anti-spam protections,
 * rating calculations, and state transition logic for the Community Verification
 * & Rating component of InclusiveMapper.
 *
 * Tested Features:
 *   1. Verification Threshold Rules (3 Confirms -> Verified, 2 Disputes -> Disputed)
 *   2. Community Trust & Accessibility Rating (1.0 - 5.0 Stars, 0 - 100% Trust, Grades)
 *   3. Anti-Spam & Duplicate Vote Rejection (Unique Users Tracking)
 *   4. State Finalization & Immutability Lock
 *   5. Authentication & Identity Verification Guard
 *   6. Dispute Reason Categorization & Validation
 *   7. Place & Report Lifecycle Integration Scenarios
 * ===============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStatus,
  calculateCommunityRating,
  validateReportConfirmation,
  validateReportDispute,
  VERIFICATION_THRESHOLDS,
} from '../src/lib/verification.ts';

describe('=== TEST SUITE: COMMUNITY VERIFICATION & RATING ===', () => {

  // ---------------------------------------------------------------------------
  // 1. THRESHOLD CONSTANTS & LOGIC
  // ---------------------------------------------------------------------------
  describe('1. Threshold Constants & computeStatus() Logic', () => {
    it('TC-TH-01: Verification thresholds must require 3 confirms and 2 disputes', () => {
      assert.strictEqual(VERIFICATION_THRESHOLDS.CONFIRM_REQUIRED, 3);
      assert.strictEqual(VERIFICATION_THRESHOLDS.DISPUTE_REQUIRED, 2);
    });

    it('TC-TH-02: Should return "pending" when criteria for verified/disputed are not met', () => {
      assert.strictEqual(computeStatus(0, 0), 'pending');
      assert.strictEqual(computeStatus(1, 0), 'pending');
      assert.strictEqual(computeStatus(2, 0), 'pending');
      assert.strictEqual(computeStatus(2, 1), 'pending');
    });

    it('TC-TH-03: Should return "verified" when 3 or more unique confirmations are received', () => {
      assert.strictEqual(computeStatus(3, 0), 'verified');
      assert.strictEqual(computeStatus(4, 0), 'verified');
      assert.strictEqual(computeStatus(10, 1), 'verified');
    });

    it('TC-TH-04: Should return "disputed" when 2 or more disputes are logged', () => {
      assert.strictEqual(computeStatus(0, 2), 'disputed');
      assert.strictEqual(computeStatus(1, 2), 'disputed');
      assert.strictEqual(computeStatus(5, 2), 'disputed');
    });

    it('TC-TH-05: Priority rule: Disputes (safety risk) take priority over confirmations', () => {
      // Even if 3 confirms exist, 2 disputes must flag the place as disputed for safety
      assert.strictEqual(computeStatus(3, 2), 'disputed');
      assert.strictEqual(computeStatus(5, 3), 'disputed');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. COMMUNITY TRUST & RATING MODEL
  // ---------------------------------------------------------------------------
  describe('2. Community Trust & Accessibility Rating System', () => {
    it('TC-RT-01: Calculates default baseline rating for unverified/new places (0 votes)', () => {
      const rating = calculateCommunityRating(0, 0);
      assert.strictEqual(rating.stars, 3.0);
      assert.strictEqual(rating.scorePercent, 50);
      assert.strictEqual(rating.grade, 'C');
      assert.strictEqual(rating.label, 'Pending Verification');
      assert.strictEqual(rating.totalVotes, 0);
    });

    it('TC-RT-02: Confirmed accessible places (3 confirms, 0 disputes) receive Grade A (4.5 Stars / 90% Trust)', () => {
      const rating = calculateCommunityRating(3, 0);
      assert.strictEqual(rating.stars, 4.5);
      assert.strictEqual(rating.scorePercent, 90);
      assert.strictEqual(rating.grade, 'A');
      assert.strictEqual(rating.label, 'Verified Accessible');
    });

    it('TC-RT-03: Highly confirmed places (5+ confirms, 0 disputes) receive Elite Grade A+ (5.0 Stars / 100% Trust)', () => {
      const rating = calculateCommunityRating(5, 0);
      assert.strictEqual(rating.stars, 5.0);
      assert.strictEqual(rating.scorePercent, 100);
      assert.strictEqual(rating.grade, 'A+');
      assert.strictEqual(rating.label, 'Highly Trusted');
    });

    it('TC-RT-04: Disputed locations (2+ disputes) receive Grade F (1.0 Star / Disputed warning)', () => {
      const rating = calculateCommunityRating(1, 2);
      assert.strictEqual(rating.stars, 1.0);
      assert.strictEqual(rating.grade, 'F');
      assert.strictEqual(rating.label, 'Disputed / Inaccessible');
      assert.ok(rating.scorePercent <= 20, 'Disputed trust score should be <= 20%');
    });

    it('TC-RT-05: Weighted trust reflects mixed community feedback accurately', () => {
      const rating = calculateCommunityRating(2, 1);
      assert.ok(rating.stars >= 2.0 && rating.stars <= 3.5);
      assert.ok(rating.scorePercent >= 40 && rating.scorePercent <= 70);
      assert.strictEqual(rating.totalVotes, 3);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CONFIRMATION VALIDATION & ANTI-SPAM
  // ---------------------------------------------------------------------------
  describe('3. Confirmation Validation & Anti-Spam Protection', () => {
    const buildPendingReport = () => ({
      id: 'report-sample-1',
      status: 'pending' as const,
      confirmCount: 2,
      disputeCount: 0,
      confirmedUsers: ['auditor-1', 'auditor-2'],
    });

    it('TC-CF-01: Rejects confirmation if user ID is missing (Authentication Guard)', () => {
      const report = buildPendingReport();
      const result = validateReportConfirmation(report, '');
      assert.strictEqual(result.success, false);
      assert.match(result.message || '', /Authentication required/i);
    });

    it('TC-CF-02: Rejects duplicate confirmation from the same user (Anti-Spam)', () => {
      const report = buildPendingReport();
      // 'auditor-1' has already confirmed
      const result = validateReportConfirmation(report, 'auditor-1');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.alreadyProcessed, true);
      assert.match(result.message || '', /already confirmed/i);
    });

    it('TC-CF-03: Allows new unique user to confirm report and increments counter', () => {
      const report = buildPendingReport();
      const result = validateReportConfirmation(report, 'auditor-3');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.newConfirmCount, 3);
      assert.deepStrictEqual(result.updatedUsers, ['auditor-1', 'auditor-2', 'auditor-3']);
    });

    it('TC-CF-04: Transitions report status from "pending" to "verified" on 3rd unique confirmation', () => {
      const report = buildPendingReport(); // has 2 confirms
      const result = validateReportConfirmation(report, 'auditor-3');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.newStatus, 'verified');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. DISPUTE VALIDATION & CATEGORIZATION
  // ---------------------------------------------------------------------------
  describe('4. Dispute Validation & Categorization', () => {
    const buildDisputeSample = () => ({
      id: 'report-sample-2',
      status: 'pending' as const,
      confirmCount: 1,
      disputeCount: 1,
      disputedUsers: ['auditor-1'],
    });

    it('TC-DP-01: Rejects dispute if user is not authenticated', () => {
      const report = buildDisputeSample();
      const result = validateReportDispute(report, '', 'Ramp missing / steep slope');
      assert.strictEqual(result.success, false);
      assert.match(result.message || '', /Authentication required/i);
    });

    it('TC-DP-02: Rejects dispute if reason is omitted or empty', () => {
      const report = buildDisputeSample();
      const result = validateReportDispute(report, 'auditor-2', '   ');
      assert.strictEqual(result.success, false);
      assert.match(result.message || '', /valid reason is required/i);
    });

    it('TC-DP-03: Rejects duplicate dispute from the same user (Anti-Spam)', () => {
      const report = buildDisputeSample();
      // 'auditor-1' has already disputed
      const result = validateReportDispute(report, 'auditor-1', 'Outdated accessibility info');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.alreadyProcessed, true);
      assert.match(result.message || '', /already disputed/i);
    });

    it('TC-DP-04: Transitions status to "disputed" when 2nd dispute is recorded', () => {
      const report = buildDisputeSample(); // has 1 dispute
      const result = validateReportDispute(report, 'auditor-2', 'Entrance or elevator blocked');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.newDisputeCount, 2);
      assert.strictEqual(result.newStatus, 'disputed');
      assert.deepStrictEqual(result.updatedUsers, ['auditor-1', 'auditor-2']);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. STATE FINALIZATION & IMMUTABILITY LOCK
  // ---------------------------------------------------------------------------
  describe('5. Finalized State Immutability Lock', () => {
    it('TC-LK-01: Cannot confirm a report that is already verified (Locked)', () => {
      const verifiedReport = {
        id: 'report-verified-1',
        status: 'verified' as const,
        confirmCount: 3,
        disputeCount: 0,
        confirmedUsers: ['u1', 'u2', 'u3'],
      };
      const result = validateReportConfirmation(verifiedReport, 'u4');
      assert.strictEqual(result.success, false);
      assert.match(result.message || '', /already finalized/i);
    });

    it('TC-LK-02: Cannot dispute a report that is already verified (Locked)', () => {
      const verifiedReport = {
        id: 'report-verified-1',
        status: 'verified' as const,
        confirmCount: 3,
        disputeCount: 0,
        disputedUsers: [],
      };
      const result = validateReportDispute(verifiedReport, 'u4', 'Ramp missing');
      assert.strictEqual(result.success, false);
      assert.match(result.message || '', /already finalized/i);
    });

    it('TC-LK-03: Cannot confirm or dispute a report that is already disputed (Locked)', () => {
      const disputedReport = {
        id: 'report-disputed-1',
        status: 'disputed' as const,
        confirmCount: 1,
        disputeCount: 2,
        confirmedUsers: ['u1'],
        disputedUsers: ['u2', 'u3'],
      };
      const confirmRes = validateReportConfirmation(disputedReport, 'u4');
      assert.strictEqual(confirmRes.success, false);
      assert.match(confirmRes.message || '', /already finalized/i);

      const disputeRes = validateReportDispute(disputedReport, 'u4', 'Access blocked');
      assert.strictEqual(disputeRes.success, false);
      assert.match(disputeRes.message || '', /already finalized/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. END-TO-END LIFECYCLE SIMULATION
  // ---------------------------------------------------------------------------
  describe('6. Full Verification & Rating Lifecycle Simulation', () => {
    it('TC-E2E-01: Simulates full happy path from initial submission to verified rating', () => {
      // Step 1: Initial report created by Alice
      let reportState: {
        id: string;
        status: 'pending' | 'verified' | 'disputed';
        confirmCount: number;
        disputeCount: number;
        confirmedUsers: string[];
      } = {
        id: 'rep-sim-01',
        status: 'pending',
        confirmCount: 1,
        disputeCount: 0,
        confirmedUsers: ['alice'],
      };
      let rating = calculateCommunityRating(reportState.confirmCount, reportState.disputeCount);
      assert.strictEqual(reportState.status, 'pending');
      assert.strictEqual(rating.grade, 'B');

      // Step 2: Bob confirms -> 2 confirms, still pending
      const step2 = validateReportConfirmation(reportState, 'bob');
      assert.strictEqual(step2.success, true);
      assert.strictEqual(step2.newStatus, 'pending');
      reportState = {
        ...reportState,
        confirmCount: step2.newConfirmCount!,
        status: step2.newStatus!,
        confirmedUsers: step2.updatedUsers!,
      };

      // Step 3: Charlie confirms -> 3 confirms, status becomes VERIFIED
      const step3 = validateReportConfirmation(reportState, 'charlie');
      assert.strictEqual(step3.success, true);
      assert.strictEqual(step3.newStatus, 'verified');
      reportState = {
        ...reportState,
        confirmCount: step3.newConfirmCount!,
        status: step3.newStatus!,
        confirmedUsers: step3.updatedUsers!,
      };

      // Step 4: Rating now becomes Grade A (Verified Accessible)
      rating = calculateCommunityRating(reportState.confirmCount, reportState.disputeCount);
      assert.strictEqual(rating.grade, 'A');
      assert.strictEqual(rating.stars, 4.5);
      assert.strictEqual(rating.label, 'Verified Accessible');

      // Step 5: Dave tries to vote on finalized report -> locked
      const step5 = validateReportConfirmation(reportState, 'dave');
      assert.strictEqual(step5.success, false);
      assert.match(step5.message || '', /already finalized/i);
    });
  });
});
