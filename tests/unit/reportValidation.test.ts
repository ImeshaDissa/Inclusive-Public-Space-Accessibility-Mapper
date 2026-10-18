import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canProceedToDetails,
  canSubmitReport,
  validatePhotoUpload,
  validateImageUrl,
  formatRelativeTimestamp,
} from '../../src/features/reports/validation';

describe('Report Creation - Unit Tests (Validation & Helpers)', () => {
  describe('canProceedToDetails() - Step 1 Location Validation', () => {
    it('should reject when venue is null or undefined', () => {
      assert.equal(canProceedToDetails(null), false);
      assert.equal(canProceedToDetails(undefined), false);
    });

    it('should reject when venue has an empty or whitespace name', () => {
      assert.equal(canProceedToDetails({ name: '' }), false);
      assert.equal(canProceedToDetails({ name: '   ' }), false);
    });

    it('should allow proceeding when venue has a valid name', () => {
      assert.equal(canProceedToDetails({ name: 'Colombo City Centre' }), true);
      assert.equal(canProceedToDetails({ name: 'Pinned Location' }), true);
    });
  });

  describe('canSubmitReport() - Step 2 Report Submission Validation', () => {
    it('should fail validation when no feature, note, or photo is provided', () => {
      const result = canSubmitReport({
        featureCount: 0,
        note: '',
        photos: [],
      });
      assert.equal(result.isValid, false);
      assert.ok(result.error?.includes('verify at least one feature'));
    });

    it('should fail validation when note is only whitespace and no features/photos', () => {
      const result = canSubmitReport({
        featureCount: 0,
        note: '     ',
        photos: [],
      });
      assert.equal(result.isValid, false);
    });

    it('should pass validation when at least one feature is verified', () => {
      const result = canSubmitReport({
        featureCount: 1,
        note: '',
        photos: [],
      });
      assert.equal(result.isValid, true);
    });

    it('should pass validation when a note is provided without features or photos', () => {
      const result = canSubmitReport({
        featureCount: 0,
        note: 'Ramp is currently undergoing maintenance.',
        photos: [],
      });
      assert.equal(result.isValid, true);
    });

    it('should pass validation when photos are attached without features or note', () => {
      const result = canSubmitReport({
        featureCount: 0,
        note: '',
        photos: ['https://example.com/ramp.jpg'],
      });
      assert.equal(result.isValid, true);
    });
  });

  describe('validatePhotoUpload() - Photo Limit Validation', () => {
    it('should allow attaching photos when under the max limit of 5', () => {
      const result = validatePhotoUpload(3, 5);
      assert.equal(result.isValid, true);
    });

    it('should reject attaching photos when 5 photos are already reached', () => {
      const result = validatePhotoUpload(5, 5);
      assert.equal(result.isValid, false);
      assert.ok(result.error?.includes('5 photos'));
    });
  });

  describe('validateImageUrl() - Image URL Validation', () => {
    it('should reject empty or whitespace URLs', () => {
      assert.equal(validateImageUrl('').isValid, false);
      assert.equal(validateImageUrl('   ').isValid, false);
    });

    it('should reject non-http/https schemas', () => {
      assert.equal(validateImageUrl('ftp://example.com/photo.png').isValid, false);
      assert.equal(validateImageUrl('file:///local/photo.jpg').isValid, false);
    });

    it('should accept valid https image URLs', () => {
      const res = validateImageUrl('https://images.unsplash.com/photo-1517649763962');
      assert.equal(res.isValid, true);
    });
  });

  describe('formatRelativeTimestamp() - Timestamp Formatting Helper', () => {
    it('should return "Just now" for empty or current timestamp', () => {
      assert.equal(formatRelativeTimestamp(''), 'Just now');
      const nowIso = new Date().toISOString();
      assert.equal(formatRelativeTimestamp(nowIso), 'Just now');
    });

    it('should return formatted minutes or hours for past timestamps', () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      assert.equal(formatRelativeTimestamp(tenMinsAgo), '10m ago');

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      assert.equal(formatRelativeTimestamp(twoHoursAgo), '2h ago');
    });
  });
});
