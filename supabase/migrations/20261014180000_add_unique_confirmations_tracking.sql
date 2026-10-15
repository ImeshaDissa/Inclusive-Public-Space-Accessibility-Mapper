-- ====================================================================
-- MIGRATION: Add unique user confirmations and disputes tracking
-- Ensures records are verified only when 3 unique users confirm them.
-- ====================================================================

-- 1. Add confirmed_users and disputed_users text arrays to reports table
alter table if exists public.reports 
add column if not exists confirmed_users text[] default array[]::text[],
add column if not exists disputed_users text[] default array[]::text[];

-- 2. Add confirmed_users and disputed_users text arrays to places table
alter table if exists public.places
add column if not exists confirmed_users text[] default array[]::text[],
add column if not exists disputed_users text[] default array[]::text[];

-- 3. Backfill empty arrays for any null values
update public.reports
set confirmed_users = array[]::text[]
where confirmed_users is null;

update public.reports
set disputed_users = array[]::text[]
where disputed_users is null;

update public.places
set confirmed_users = array[]::text[]
where confirmed_users is null;

update public.places
set disputed_users = array[]::text[]
where disputed_users is null;
