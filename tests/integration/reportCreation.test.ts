import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processReportSubmission,
  buildReportRecord,
  type DatabaseClient,
} from '../../src/features/reports/reportService.ts';
import type { CreateReportInput } from '../../src/features/reports/types.ts';

describe('Report Creation - Integration Tests (Service & Database Flow)', () => {
  const sampleInput: CreateReportInput = {
    placeId: 'place-colombo-library',
    placeName: 'Public Library Colombo',
    category: 'Public Facilities',
    note: 'Entrance ramp has adequate slope, but tactile paving is missing near the door.',
    featuresReported: {
      ramp: true,
      elevator: false,
      toilet: true,
      parking: false,
      stepFree: true,
      tactilePaving: false,
      automaticDoor: false,
    },
    photos: ['https://example.com/ramp-inspection.jpg'],
    priority: 'High',
    submitterName: 'Kasun Perera',
    submitterAvatar: 'https://example.com/avatar.jpg',
    location: {
      latitude: 6.9123,
      longitude: 79.8654,
      address: 'Marcus Fernando Mawatha, Colombo 07',
    },
  };

  describe('buildReportRecord() - Data Transformation Integration', () => {
    it('should map frontend input into valid Supabase reports table row schema', () => {
      const { frontendReport, dbRow } = buildReportRecord(
        sampleInput,
        'report-test-001',
        'user-uuid-1234'
      );

      // Verify Database row fields
      assert.equal(dbRow.id, 'report-test-001');
      assert.equal(dbRow.place_id, 'place-colombo-library');
      assert.equal(dbRow.place_name, 'Public Library Colombo');
      assert.equal(dbRow.submitter_id, 'user-uuid-1234');
      assert.equal(dbRow.submitter_name, 'Kasun Perera');
      assert.equal(dbRow.priority, 'High');
      assert.equal(dbRow.status, 'pending');
      assert.equal(dbRow.confirm_count, 1);
      assert.equal(dbRow.dispute_count, 0);
      assert.equal(dbRow.latitude, 6.9123);
      assert.equal(dbRow.longitude, 79.8654);
      assert.equal(dbRow.address, 'Marcus Fernando Mawatha, Colombo 07');

      // Verify Frontend Report object
      assert.equal(frontendReport.id, 'report-test-001');
      assert.equal(frontendReport.placeId, 'place-colombo-library');
      assert.equal(frontendReport.status, 'pending');
      assert.equal(frontendReport.confirmCount, 1);
    });

    it('should auto-generate placeId when reporting a new unlisted custom venue', () => {
      const newPlaceInput: CreateReportInput = {
        ...sampleInput,
        placeId: undefined, // user pinned an unlisted place
        placeName: 'New Community Centre',
      };

      const { frontendReport, dbRow } = buildReportRecord(newPlaceInput, 'report-test-002');

      assert.ok(dbRow.place_id?.startsWith('place-'), 'Should generate place- prefix');
      assert.equal(frontendReport.placeId, dbRow.place_id, 'Frontend report placeId must match DB place_id');
    });

    it('should apply fallback default priority and photos when omitted', () => {
      const minimalInput: CreateReportInput = {
        placeName: 'Unknown Park',
        note: 'Accessible pathway check',
        featuresReported: { ramp: true },
        photos: [], // empty photos
        priority: undefined, // no priority
      };

      const { frontendReport, dbRow } = buildReportRecord(minimalInput, 'report-test-003');

      assert.equal(dbRow.priority, 'Medium', 'Default priority should be Medium');
      assert.equal(frontendReport.photos.length, 1, 'Should attach fallback placeholder photo');
      assert.ok(frontendReport.photos[0].includes('unsplash.com'));
    });
  });

  describe('processReportSubmission() - Database Client Integration', () => {
    it('should successfully persist report to database when DB client responds with 200/OK', async () => {
      let insertedTable = '';
      let insertedPayload: any = null;

      // Mock database client representing Supabase
      const mockSupabaseClient: DatabaseClient = {
        from: (table: string) => ({
          insert: async (data: any) => {
            insertedTable = table;
            insertedPayload = data;
            return { data: [data], error: null };
          },
        }),
      };

      const result = await processReportSubmission(
        sampleInput,
        mockSupabaseClient,
        'report-success-123',
        'auth-user-999'
      );

      assert.equal(result.success, true);
      assert.equal(result.persistedToSupabase, true);
      assert.equal(insertedTable, 'reports', 'Should insert into "reports" table');
      assert.equal(insertedPayload.id, 'report-success-123');
      assert.equal(insertedPayload.place_name, 'Public Library Colombo');
      assert.equal(result.report.placeName, 'Public Library Colombo');
    });

    it('should handle database error gracefully and fallback to local state', async () => {
      const mockFailingClient: DatabaseClient = {
        from: () => ({
          insert: async () => {
            return { data: null, error: { message: 'Database connection timeout' } };
          },
        }),
      };

      const result = await processReportSubmission(
        sampleInput,
        mockFailingClient,
        'report-fail-123'
      );

      // System does not crash; returns local report with persistedToSupabase: false
      assert.equal(result.success, true);
      assert.equal(result.persistedToSupabase, false);
      assert.equal(result.error, 'Database connection timeout');
      assert.equal(result.report.id, 'report-fail-123');
    });

    it('should support offline mode (null client) without crashing', async () => {
      const result = await processReportSubmission(
        sampleInput,
        null, // offline / no Supabase
        'report-offline-123'
      );

      assert.equal(result.success, true);
      assert.equal(result.persistedToSupabase, false);
      assert.equal(result.report.placeName, 'Public Library Colombo');
    });
  });
});
