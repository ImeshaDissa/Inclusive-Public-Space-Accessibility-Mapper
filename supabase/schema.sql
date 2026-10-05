-- ==============================================================================
-- INCLUSIVE PUBLIC SPACE ACCESSIBILITY MAPPER - SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PLACES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.places (
  id TEXT PRIMARY KEY DEFAULT ('place-' || floor(extract(epoch from now()) * 1000)::text),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Community Reported Venue',
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  features JSONB NOT NULL DEFAULT '{"ramp": false, "elevator": false, "toilet": false, "parking": false, "stepFree": false, "tactilePaving": false, "automaticDoor": false}'::jsonb,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  confirm_count INTEGER DEFAULT 1,
  dispute_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'disputed')),
  saved BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. REPORTS TABLE (Core Backend for Report Creation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY DEFAULT ('report-' || floor(extract(epoch from now()) * 1000)::text),
  place_id TEXT NOT NULL,
  place_name TEXT NOT NULL,
  submitter_id TEXT,
  submitter_name TEXT NOT NULL DEFAULT 'Community Auditor (You)',
  submitter_avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  note TEXT NOT NULL DEFAULT '',
  features_reported JSONB NOT NULL DEFAULT '{}'::jsonb,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  confirm_count INTEGER DEFAULT 1,
  dispute_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'disputed')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  dispute_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR FAST QUERYING
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reports_place_id ON public.reports (place_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_places_status ON public.places (status);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reports
CREATE POLICY "Allow public read on reports"
ON public.reports FOR SELECT
TO public
USING (true);

-- Allow anyone to insert reports
CREATE POLICY "Allow public insert on reports"
ON public.reports FOR INSERT
TO public
WITH CHECK (true);

-- Allow updates for consensus (confirms and disputes)
CREATE POLICY "Allow public update on reports"
ON public.reports FOR UPDATE
TO public
USING (true);

-- Allow public read on places
CREATE POLICY "Allow public read on places"
ON public.places FOR SELECT
TO public
USING (true);

-- Allow public insert on places
CREATE POLICY "Allow public insert on places"
ON public.places FOR INSERT
TO public
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. STORAGE BUCKET FOR PHOTO EVIDENCE
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy to allow public read access to uploaded report photos
CREATE POLICY "Allow public read access to report-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-photos');

-- Policy to allow anyone to upload photos
CREATE POLICY "Allow public upload to report-photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'report-photos');
