import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStatus,
  validateReportConfirmation,
  validateReportDispute,
  VERIFICATION_THRESHOLDS,
} from '../src/lib/verification.ts';

describe('Community Verification & Threshold Testing', () => {
  it('VERIFICATION_THRESHOLDS constants should match specifications', () => {
    assert.strictEqual(VERIFICATION_THRESHOLDS.CONFIRM_REQUIRED, 3);
    assert.strictEqual(VERIFICATION_THRESHOLDS.DISPUTE_REQUIRED, 2);
  });

  describe('computeStatus() Threshold Rules', () => {
    it('returns "pending" when confirmations are less than 3 and disputes are less than 2', () => {
      assert.strictEqual(computeStatus(0, 0), 'pending');
      assert.strictEqual(computeStatus(1, 0), 'pending');
      assert.strictEqual(computeStatus(2, 0), 'pending');
      assert.strictEqual(computeStatus(2, 1), 'pending');
    });

    it('returns "verified" when confirmations reach 3 or more', () => {
      assert.strictEqual(computeStatus(3, 0), 'verified');
      assert.strictEqual(computeStatus(4, 0), 'verified');
      assert.strictEqual(computeStatus(10, 1), 'verified');
    });

    it('returns "disputed" when disputes reach 2 or more', () => {
      assert.strictEqual(computeStatus(0, 2), 'disputed');
      assert.strictEqual(computeStatus(1, 2), 'disputed');
      assert.strictEqual(computeStatus(0, 5), 'disputed');
    });

    it('prioritizes "disputed" status over "verified" when disputes are 2 or more', () => {
      assert.strictEqual(computeStatus(3, 2), 'disputed');
      assert.strictEqual(computeStatus(5, 3), 'disputed');
    });
  });

  describe('validateReportConfirmation() Validation Logic', () => {
    const createMockPendingReport = () => ({
      id: 'rep-101',
      status: 'pending' as const,
      confirmCount: 2,
      disputeCount: 0,
      confirmedUsers: ['user-alice', 'user-bob'],
    });

    it('rejects confirmation if user is not authenticated (empty userId)', () => {
      const report = createMockPendingReport();
      const res = validateReportConfirmation(report, '');
      assert.strictEqual(res.success, false);
      assert.match(res.message || '', /Authentication required/i);
    });

    it('rejects duplicate confirmation if user has already confirmed (anti-spam validation)', () => {
      const report = createMockPendingReport();
      const res = validateReportConfirmation(report, 'user-alice');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.alreadyProcessed, true);
      assert.match(res.message || '', /already confirmed/i);
    });

    it('rejects confirmation if report is already in finalized state (verified or disputed)', () => {
      const verifiedReport = {
        id: 'rep-102',
        status: 'verified' as const,
        confirmCount: 3,
        disputeCount: 0,
        confirmedUsers: ['u1', 'u2', 'u3'],
      };
      const res = validateReportConfirmation(verifiedReport, 'u4');
      assert.strictEqual(res.success, false);
      assert.match(res.message || '', /already finalized/i);

      const disputedReport = {
        id: 'rep-103',
        status: 'disputed' as const,
        confirmCount: 1,
        disputeCount: 2,
        confirmedUsers: ['u1'],
      };
      const resDisputed = validateReportConfirmation(disputedReport, 'u4');
      assert.strictEqual(resDisputed.success, false);
      assert.match(resDisputed.message || '', /already finalized/i);
    });

    it('successfully confirms report with new unique user and transitions status to "verified" on 3rd confirmation', () => {
      const report = createMockPendingReport(); // has 2 confirms
      const res = validateReportConfirmation(report, 'user-charlie');

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.newConfirmCount, 3);
      assert.strictEqual(res.newStatus, 'verified');
      assert.deepStrictEqual(res.updatedUsers, ['user-alice', 'user-bob', 'user-charlie']);
    });
  });

  describe('validateReportDispute() Validation Logic', () => {
    const createMockPendingReport = () => ({
      id: 'rep-201',
      status: 'pending' as const,
      confirmCount: 1,
      disputeCount: 1,
      disputedUsers: ['user-alice'],
    });

    it('rejects dispute if user is not authenticated', () => {
      const report = createMockPendingReport();
      const res = validateReportDispute(report, '', 'Ramp missing');
      assert.strictEqual(res.success, false);
      assert.match(res.message || '', /Authentication required/i);
    });

    it('rejects dispute if reason is empty or whitespace', () => {
      const report = createMockPendingReport();
      const res = validateReportDispute(report, 'user-bob', '   ');
      assert.strictEqual(res.success, false);
      assert.match(res.message || '', /valid reason is required/i);
    });

    it('rejects duplicate dispute from the same user (anti-spam validation)', () => {
      const report = createMockPendingReport();
      const res = validateReportDispute(report, 'user-alice', 'Ramp missing');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.alreadyProcessed, true);
      assert.match(res.message || '', /already disputed/i);
    });

    it('successfully disputes report and transitions status to "disputed" on 2nd dispute', () => {
      const report = createMockPendingReport(); // has 1 dispute
      const res = validateReportDispute(report, 'user-bob', 'Entrance or elevator blocked');

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.newDisputeCount, 2);
      assert.strictEqual(res.newStatus, 'disputed');
      assert.deepStrictEqual(res.updatedUsers, ['user-alice', 'user-bob']);
    });
  });
});
