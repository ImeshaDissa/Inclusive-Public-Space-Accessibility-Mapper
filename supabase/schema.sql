-- ====================================================================
-- InclusiveMapper - Supabase PostgreSQL Database Schema
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ====================================================================

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
-- category: verification | saved_place | badge | dispute | system
create table if not exists public.notifications (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  place_id text references public.places(id) on delete cascade,
  place_name text not null,
  old_status text,
  new_status text not null,
  message text not null,
  category text default 'saved_place',
  read boolean default false,
  created_at timestamptz default now()
);

-- ====================================================================
-- SECURE AUTOMATED USER & ROLE TRIGGERS (ESCALATION PREVENTION)
-- Automatically inserts default user role into public.user_roles & public.profiles
-- ====================================================================

-- Trigger for user_roles
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

-- Trigger for profiles with metadata
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
    'user' -- Secure default role (prevents client escalation)
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

-- User Roles Policies (Read-only for owner; no client escalation)
drop policy if exists "Users can view their own role" on public.user_roles;
create policy "Users can view their own role" on public.user_roles
  for select using (auth.uid() = user_id);

drop policy if exists "Allow auth admin to read user roles" on public.user_roles;
create policy "Allow auth admin to read user roles"
  on public.user_roles as permissive for select
  to supabase_auth_admin using (true);

-- ====================================================================
-- SUPABASE CUSTOM ACCESS TOKEN AUTH HOOK
-- Embeds user_role into access token JWT claims (app_metadata & root claims)
-- ====================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable
as $$
declare
  claims jsonb;
  user_role text;
begin
  -- Fetch the user role from public.user_roles
  select role into user_role from public.user_roles where user_id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_role is not null then
    -- Set custom claim in app_metadata and root claims
    claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{app_metadata, user_role}', '"user"');
    claims := jsonb_set(claims, '{user_role}', '"user"');
  end if;

  -- Update 'claims' object in original event
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Restrict execution of the hook to the auth admin
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- ====================================================================
-- SECURE ROLE ELEVATION FUNCTION (SECURITY DEFINER)
-- Enables admins to safely promote users to 'verifier' or 'admin'
-- ====================================================================

create or replace function public.promote_user_role(
  target_user_id uuid,
  new_role text
)
returns jsonb
language plpgsql security definer
as $$
declare
  calling_user_id uuid := auth.uid();
  calling_user_role text;
begin
  -- Enforce security check: caller must be admin or service role
  if calling_user_id is not null then
    select role into calling_user_role from public.user_roles where user_id = calling_user_id;
    if calling_user_role is null or calling_user_role != 'admin' then
      raise exception 'Unauthorized: Only administrators can alter user roles.';
    end if;
  end if;

  -- Validate target role
  if new_role not in ('user', 'verifier', 'admin') then
    raise exception 'Invalid role. Must be user, verifier, or admin.';
  end if;

  -- Update public.user_roles
  insert into public.user_roles (user_id, role)
  values (target_user_id, new_role)
  on conflict (user_id) do update set role = excluded.role;

  -- Update public.profiles
  update public.profiles
  set role = new_role, updated_at = now()
  where id = target_user_id;

  return jsonb_build_object('success', true, 'user_id', target_user_id, 'new_role', new_role);
end;
$$;

grant execute on function public.promote_user_role to authenticated;

-- Profiles Policies
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Places Policies
drop policy if exists "Places are viewable by everyone" on public.places;
create policy "Places are viewable by everyone" on public.places
  for select using (true);

drop policy if exists "Authenticated users can insert places" on public.places;
create policy "Authenticated users can insert places" on public.places
  for insert with check (auth.role() = 'authenticated' or auth.role() = 'anon');

drop policy if exists "Authenticated users can update places" on public.places;
create policy "Authenticated users can update places" on public.places
  for update using (true);

-- Reports Policies (JWT Claim-Based Security)
drop policy if exists "Reports are viewable by everyone" on public.reports;
create policy "Reports are viewable by everyone" on public.reports
  for select using (true);

drop policy if exists "Users can submit reports" on public.reports;
create policy "Users can submit reports" on public.reports
  for insert with check (true);

drop policy if exists "Verifiers can update reports" on public.reports;
create policy "Verifiers can update reports" on public.reports
  for update to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'user_role') in ('verifier', 'admin')
    or (auth.jwt() ->> 'user_role') in ('verifier', 'admin')
    or auth.uid() = submitter_id
  );

-- Saved Places Policies (Strict WITH CHECK + USING)
drop policy if exists "Users manage own saved places" on public.user_saved_places;
create policy "Users manage own saved places" on public.user_saved_places
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications Policies
drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- ====================================================================
-- AVATAR STORAGE BUCKET (Profile Photos)
-- Public-read bucket; authenticated users may upload only into their own folder
-- ====================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Allow authenticated uploads to own avatar folder" on storage.objects;
create policy "Allow authenticated uploads to own avatar folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Allow users to update own avatar" on storage.objects;
create policy "Allow users to update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Allow users to delete own avatar" on storage.objects;
create policy "Allow users to delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

-- ====================================================================
-- SEED MOCK PLACES INTO DATABASE
-- ====================================================================

insert into public.places (id, name, category, address, lat, lng, features, photos, confirm_count, dispute_count, status, description)
values
  (
    'place-1',
    'Central City Transit Center',
    'Public Transit Hub',
    '100 Main Street, Suite A',
    37.7749,
    -122.4194,
    '{"ramp": true, "elevator": true, "toilet": true, "parking": true, "stepFree": true, "tactilePaving": true, "automaticDoor": true}'::jsonb,
    array['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'],
    5,
    0,
    'verified',
    'Fully accessible transit hub featuring automated wide-access elevators, tactile guide lines, and barrier-free platform boarding.'
  ),
  (
    'place-2',
    'Metro Station - North Entrance',
    'Subway Station',
    '240 Metro Boulevard',
    37.7833,
    -122.4167,
    '{"ramp": true, "elevator": false, "toilet": true, "parking": false, "stepFree": false, "tactilePaving": true, "automaticDoor": false}'::jsonb,
    array['https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80'],
    1,
    2,
    'disputed',
    'Elevator out of order since yesterday. Ramp gradient is steep (1:8 incline). Restroom is open.'
  ),
  (
    'place-3',
    'Civic Plaza Community Library',
    'Public Facility',
    '450 Civic Center Plaza',
    37.7795,
    -122.4138,
    '{"ramp": true, "elevator": true, "toilet": true, "parking": true, "stepFree": true, "tactilePaving": true, "automaticDoor": true}'::jsonb,
    array['https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80'],
    4,
    0,
    'verified',
    'Includes automatic sliding doors, Braille signage, power-assisted elevator, and gender-neutral accessible restroom.'
  )
on conflict (id) do nothing;
