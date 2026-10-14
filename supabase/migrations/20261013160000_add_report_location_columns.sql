-- ====================================================================
-- InclusiveMapper — reports: store the submission's location
--
-- Bug fixed here: src/features/reports/api.ts (createReportInBackend) has
-- always sent `latitude`, `longitude` and `address` with every report, and
-- src/features/reports/types.ts (ReportDbRow) declares them as real columns —
-- but they were never created in the database.
--
-- PostgREST therefore rejected every insert with:
--   PGRST204 "Could not find the 'address' column of 'reports' in the schema cache"
--
-- The client swallows that error ("falling back to local state") and still
-- returns success: true, so a submitted report looked fine in the UI and was
-- never written to the database — it disappeared on reload and never reached
-- the community map. Verified live against the project: the exact client
-- payload returned HTTP 400, and the same payload without these three columns
-- returned 201.
--
-- Adding the columns (rather than deleting the fields from the client) keeps
-- the intended behaviour: a report keeps the coordinates it was filed at, even
-- for a place that is not in `places` yet. Idempotent.
-- ====================================================================

alter table public.reports add column if not exists latitude double precision;
alter table public.reports add column if not exists longitude double precision;
alter table public.reports add column if not exists address text;

-- Reports are fetched newest-first and often filtered by place.
create index if not exists idx_reports_submitter_id on public.reports (submitter_id);
create index if not exists idx_reports_created_at_desc on public.reports (created_at desc);
