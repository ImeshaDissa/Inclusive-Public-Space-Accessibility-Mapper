-- ====================================================================
-- InclusiveMapper - Supabase PostgreSQL Database Schema
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ====================================================================

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. USER ROLES TABLE (Privilege Escalation Prevention)
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
  created_at timestamptz default now()
);

-- 2. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  avatar text default 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  has_disability boolean default false,
  disability_type text default 'Wheelchair User',
  preferences jsonb default '{"requireRamp": true, "requireElevator": true, "requireAccessibleToilet": true, "requireStepFree": true}'::jsonb,
  role text default 'user',
  points integer default 0,
  audits_count integer default 0,
  level text default 'Bronze Mapper',
  badges text[] default array['First Audit', 'Accessibility Pioneer'],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MIGRATION: rename legacy 'auditor' roles to 'user' (idempotent)
update public.user_roles set role = 'user' where role = 'auditor';
update public.profiles set role = 'user' where role = 'auditor';

-- 3. PLACES TABLE
create table if not exists public.places (
  id text primary key,
  name text not null,
  category text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  features jsonb default '{}'::jsonb,
  photos text[] default array[]::text[],
  confirm_count integer default 0,
  dispute_count integer default 0,
  status text default 'pending',
  saved boolean default true,
  description text,
  created_at timestamptz default now()
);

-- 4. REPORTS TABLE
create table if not exists public.reports (
  id text primary key,
  place_id text references public.places(id) on delete cascade,
  place_name text not null,
  submitter_id uuid references public.profiles(id) on delete set null,
  submitter_name text not null,
  submitter_avatar text,
  note text,
  features_reported jsonb default '{}'::jsonb,
  photos text[] default array[]::text[],
  priority text default 'Medium',
  confirm_count integer default 1,
  dispute_count integer default 0,
  dispute_reasons text[] default array[]::text[],
  status text default 'pending',
  created_at timestamptz default now()
);

-- 5. USER SAVED PLACES JUNCTION TABLE
create table if not exists public.user_saved_places (
  user_id uuid references public.profiles(id) on delete cascade,
  place_id text references public.places(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, place_id)
);

-- 6. NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  place_id text references public.places(id) on delete cascade,
  place_name text not null,
  old_status text,
  new_status text not null,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- 7. DISPUTE REASONS TABLE
create table if not exists public.dispute_reasons (
  id uuid primary key default gen_random_uuid(),
  report_id text references public.reports(id) on delete cascade,
  place_id text references public.places(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text,
  reason text not null,
  note text,
  created_at timestamptz default now()
);

-- INDEXES FOR PERFORMANCE
create index if not exists idx_reports_place_id on public.reports (place_id);
create index if not exists idx_reports_status on public.reports (status);
create index if not exists idx_reports_created_at on public.reports (created_at desc);
create index if not exists idx_places_status on public.places (status);

-- ====================================================================
-- SECURE AUTOMATED USER & ROLE TRIGGERS
-- ====================================================================

create or replace function public.handle_new_user_role()
returns trigger as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar, has_disability, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'),
    coalesce((new.raw_user_meta_data->>'has_disability')::boolean, false),
    'user'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(excluded.name, public.profiles.name);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.reports enable row level security;
alter table public.user_saved_places enable row level security;
alter table public.notifications enable row level security;
alter table public.dispute_reasons enable row level security;

-- Policies
drop policy if exists "Users can view their own role" on public.user_roles;
create policy "Users can view their own role" on public.user_roles
  for select using (auth.uid() = user_id);

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Places are viewable by everyone" on public.places;
create policy "Places are viewable by everyone" on public.places
  for select using (true);

drop policy if exists "Anyone can insert places" on public.places;
create policy "Anyone can insert places" on public.places
  for insert with check (true);

drop policy if exists "Anyone can update places" on public.places;
create policy "Anyone can update places" on public.places
  for update using (true);

drop policy if exists "Reports are viewable by everyone" on public.reports;
create policy "Reports are viewable by everyone" on public.reports
  for select using (true);

drop policy if exists "Anyone can submit reports" on public.reports;
create policy "Anyone can submit reports" on public.reports
  for insert with check (true);

drop policy if exists "Anyone can update reports" on public.reports;
create policy "Anyone can update reports" on public.reports
  for update using (true);

drop policy if exists "Users manage own saved places" on public.user_saved_places;
create policy "Users manage own saved places" on public.user_saved_places
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their notifications" on public.notifications;
create policy "Users can insert their notifications" on public.notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications" on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their notifications" on public.notifications;
create policy "Users can delete their notifications" on public.notifications
  for delete using (auth.uid() = user_id);

drop policy if exists "Dispute reasons are viewable by everyone" on public.dispute_reasons;
create policy "Dispute reasons are viewable by everyone" on public.dispute_reasons
  for select using (true);

drop policy if exists "Anyone can submit a dispute reason" on public.dispute_reasons;
create policy "Anyone can submit a dispute reason" on public.dispute_reasons
  for insert with check (true);

-- ====================================================================
-- STORAGE BUCKET FOR AVATARS & PHOTOS
-- ====================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

drop policy if exists "Allow upload to avatars" on storage.objects;
create policy "Allow upload to avatars"
  on storage.objects for insert to public
  with check (bucket_id = 'avatars');

-- ====================================================================
-- SEED SAMPLE DATA (PLAZAS, VENUES & ACCESSIBILITY REPORTS)
-- ====================================================================

insert into public.places (id, name, category, address, lat, lng, features, photos, confirm_count, dispute_count, status, description)
values
  (
    'place-1',
    'Central Community Library',
    'Public Library & Learning Hub',
    '450 Civic Center Plaza, Downtown',
    37.7749,
    -122.4194,
    '{"ramp": true, "elevator": true, "toilet": true, "parking": true, "stepFree": true, "tactilePaving": true, "automaticDoor": true}'::jsonb,
    array['https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80'],
    5,
    0,
    'verified',
    'Fully accessible civic center with automated sliding doors, wide elevator corridors, and tactile audio floor guides.'
  ),
  (
    'place-2',
    'Metropolitan Train Station',
    'Transit Hub',
    '100 Grand Avenue, Central District',
    37.7833,
    -122.4167,
    '{"ramp": true, "elevator": false, "toilet": true, "parking": false, "stepFree": false, "tactilePaving": true, "automaticDoor": true}'::jsonb,
    array['https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80'],
    1,
    0,
    'pending',
    'Busy transit station. Main floor ramp is active, but Platform 2 elevator is currently undergoing maintenance.'
  ),
  (
    'place-3',
    'City Botanical Gardens',
    'Public Park & Leisure',
    '800 Greenery Way, East Park',
    37.7690,
    -122.4460,
    '{"ramp": false, "elevator": false, "toilet": false, "parking": true, "stepFree": false, "tactilePaving": false, "automaticDoor": false}'::jsonb,
    array['https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80'],
    0,
    2,
    'disputed',
    'Historic entrance has steep cobblestone steps. Accessible side ramp route was claimed but reported blocked.'
  )
on conflict (id) do nothing;

insert into public.reports (id, place_id, place_name, submitter_name, submitter_avatar, note, features_reported, photos, priority, confirm_count, dispute_count, dispute_reasons, status)
values
  (
    'report-1',
    'place-2',
    'Metropolitan Train Station',
    'Sarah Chen (Mobility Advocate)',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    'Platform 2 elevator out of service. High-priority issue for wheelchair commuters taking north-bound trains.',
    '{"ramp": true, "elevator": false, "toilet": true}'::jsonb,
    array['https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80'],
    'High',
    1,
    0,
    array[]::text[],
    'pending'
  ),
  (
    'report-2',
    'place-3',
    'City Botanical Gardens',
    'David Miller',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    'Side ramp gated and locked shut today. Main entrance still has 8 steep stone steps without handrails.',
    '{"ramp": false, "stepFree": false}'::jsonb,
    array['https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80'],
    'High',
    0,
    2,
    array['Ramp gated shut', 'No step-free alternative path'],
    'disputed'
  )
on conflict (id) do nothing;

-- ====================================================================
-- AUTOMATED VERIFICATION THRESHOLD TRIGGERS
-- ====================================================================

create or replace function public.handle_report_verification_threshold()
returns trigger as $$
begin
  if new.dispute_count >= 2 then
    new.status := 'disputed';
  elsif new.confirm_count >= 3 then
    new.status := 'verified';
  else
    new.status := 'pending';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_report_verification_update on public.reports;
create trigger on_report_verification_update
  before insert or update of confirm_count, dispute_count on public.reports
  for each row execute function public.handle_report_verification_threshold();

create or replace function public.handle_place_verification_threshold()
returns trigger as $$
begin
  if new.dispute_count >= 2 then
    new.status := 'disputed';
  elsif new.confirm_count >= 3 then
    new.status := 'verified';
  else
    new.status := 'pending';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_place_verification_update on public.places;
create trigger on_place_verification_update
  before insert or update of confirm_count, dispute_count on public.places
  for each row execute function public.handle_place_verification_threshold();
