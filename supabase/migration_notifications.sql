-- ====================================================================
-- InclusiveMapper — Three-Tiered Notification Strategy
-- Tier 1: In-App   (notification center + Supabase Realtime)
-- Tier 2: Push     (Expo Push via Edge Function, fired by DB trigger)
-- Tier 3: Email    (Supabase Auth native + Edge Function via Resend)
-- NOTE: No caregiver-specific features — everything runs under the 'user' role.
-- Run AFTER supabase/schema.sql in the Supabase SQL Editor.
-- ====================================================================

-- ====================================================================
-- 1. UPGRADE notifications TABLE
-- Add a category column so the UI can render icons/filters per type.
-- Categories: verification | saved_place | badge | dispute | system
-- ====================================================================
alter table public.notifications add column if not exists category text default 'saved_place';

update public.notifications set category = 'saved_place' where category is null;

-- Reports can now carry the user-facing category for the trigger to copy.
alter table public.reports add column if not exists notification_category text;

-- ====================================================================
-- 2. REALTIME — broadcast notifications/places/reports changes
-- ====================================================================
alter table public.notifications replica identity full;
alter table public.places replica identity full;
alter table public.reports replica identity full;

-- Add tables to the supabase_realtime publication (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'places'
  ) then
    alter publication supabase_realtime add table public.places;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end $$;

-- ====================================================================
-- 3. HELPER — insert a notification row (used by all triggers)
-- ====================================================================
create or replace function public.insert_notification(
  p_user_id uuid,
  p_place_id text,
  p_place_name text,
  p_old_status text,
  p_new_status text,
  p_message text,
  p_category text
)
returns void
language plpgsql security definer
as $$
begin
  insert into public.notifications (id, user_id, place_id, place_name, old_status, new_status, message, category, read)
  values (
    'notif-' || gen_random_uuid()::text,
    p_user_id,
    p_place_id,
    p_place_name,
    p_old_status,
    p_new_status,
    p_message,
    p_category,
    false
  );
end;
$$;

-- ====================================================================
-- 4. TRIGGER A — Saved Place status changes (in-app)
-- When a place's status changes, notify every user who saved it.
-- ====================================================================
create or replace function public.notify_saved_place_status()
returns trigger
language plpgsql security definer
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (id, user_id, place_id, place_name, old_status, new_status, message, category, read)
    select
      'notif-' || gen_random_uuid()::text,
      sp.user_id,
      new.id,
      new.name,
      old.status,
      new.status,
      'Status updated: ' || new.name || ' is now marked ' || upper(new.status),
      'saved_place',
      false
    from public.user_saved_places sp
    where sp.place_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_place_status_change on public.places;
create trigger on_place_status_change
  after update of status on public.places
  for each row execute function public.notify_saved_place_status();

-- ====================================================================
-- 5. TRIGGER B — Verification updates (in-app)
-- When a verifier (or confirm/dispute flow) resolves a report,
-- notify the original submitter.
-- ====================================================================
create or replace function public.notify_report_verdict()
returns trigger
language plpgsql security definer
as $$
declare
  v_old text;
begin
  if new.status is distinct from old.status and new.submitter_id is not null then
    v_old := old.status;
    perform public.insert_notification(
      new.submitter_id,
      new.place_id,
      new.place_name,
      v_old,
      new.status,
      case new.status
        when 'verified' then 'Your report for ' || new.place_name || ' was verified by the community. Thank you!'
        when 'disputed' then 'Your report for ' || new.place_name || ' was disputed. A verifier will review it.'
        else 'Your report for ' || new.place_name || ' is now ' || new.status || '.'
      end,
      'verification'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_report_status_change on public.reports;
create trigger on_report_status_change
  after update of status on public.reports
  for each row execute function public.notify_report_verdict();

-- ====================================================================
-- 6. TRIGGER C — Community badges (in-app)
-- Award points/badges when a user's report gets verified, then notify.
-- ====================================================================
create or replace function public.notify_badge_earned()
returns trigger
language plpgsql security definer
as $$
declare
  v_points int;
  v_level text;
  v_badge text;
begin
  if new.status = 'verified' and old.status <> 'verified' and new.submitter_id is not null then
    -- +10 points per verified report
    update public.profiles
    set points = coalesce(points, 0) + 10,
        audits_count = coalesce(audits_count, 0) + 1,
        updated_at = now()
    where id = new.submitter_id
    returning points, level, badges into v_points, v_level, v_badge;

    -- Level ups at 50 / 150 / 400 points
    if v_points >= 400 and (v_level is null or v_level = 'Bronze Mapper') then
      update public.profiles set level = 'Gold Mapper' where id = new.submitter_id;
      perform public.insert_notification(
        new.submitter_id, new.place_id, new.place_name, null, 'verified',
        'Badge earned: Gold Mapper! Your consistent audits unlocked the top tier.',
        'badge'
      );
    elsif v_points >= 150 and (v_level is null or v_level in ('Bronze Mapper')) then
      update public.profiles set level = 'Silver Mapper' where id = new.submitter_id;
      perform public.insert_notification(
        new.submitter_id, new.place_id, new.place_name, null, 'verified',
        'Badge earned: Silver Mapper! Keep auditing to reach Gold.',
        'badge'
      );
    elsif v_points >= 50 and (v_level is null or v_level = 'Bronze Mapper') then
      update public.profiles set level = 'Advanced Mapper' where id = new.submitter_id;
      perform public.insert_notification(
        new.submitter_id, new.place_id, new.place_name, null, 'verified',
        'Badge earned: Advanced Mapper! You reached 50 community points.',
        'badge'
      );
    else
      perform public.insert_notification(
        new.submitter_id, new.place_id, new.place_name, null, 'verified',
        'Points earned: +10 for your verified report at ' || new.place_name || '.',
        'badge'
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_report_verified_badge on public.reports;
create trigger on_report_verified_badge
  after update of status on public.reports
  for each row execute function public.notify_badge_earned();

-- ====================================================================
-- 7. TRIGGER D — Push notifications (Tier 2)
-- On HIGH-priority report insert, notify users who saved the place
-- by invoking the push-notify Edge Function (service role bypasses RLS).
-- ====================================================================
create or replace function public.trigger_push_notification()
returns trigger
language plpgsql security definer
as $$
declare
  v_push_url text;
  v_service_key text;
begin
  -- Only fire when the Edge Function URL + service key are configured;
  -- otherwise skip silently so report inserts never fail.
  v_push_url := current_setting('app.settings.push_function_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  if new.priority = 'High' and v_push_url is not null and v_service_key is not null then
    begin
      perform net.http_post(
        url := v_push_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'type', 'high_priority_report',
          'place_id', new.place_id,
          'place_name', new.place_name,
          'note', new.note,
          'submitter_id', new.submitter_id
        )
      );
    exception when others then
      -- Push is best-effort: never block the report write.
      raise warning 'push-notify invoke failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists on_high_priority_report on public.reports;
create trigger on_high_priority_report
  after insert on public.reports
  for each row execute function public.trigger_push_notification();

-- pg_net extension (async HTTP from Postgres). Safe to re-run.
create extension if not exists pg_net;

-- --------------------------------------------------------------------
-- Configure once per project (REQUIRED for push trigger):
--   alter database postgres set app.settings.push_function_url = 'https://<project-ref>.supabase.co/functions/v1/push-notify';
--   alter database postgres set app.settings.service_role_key = '<service-role-key>';
-- (Or set them in Dashboard -> Database -> Settings. Reload after change.)
-- --------------------------------------------------------------------

-- ====================================================================
-- 8. PUSH TOKENS (device registry for Expo push)
-- ====================================================================
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text not null default 'unknown',
  device_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, expo_push_token)
);

alter table public.push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens"
  on public.push_tokens for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ====================================================================
-- 9. EMAIL REQUESTS queue (Tier 3 custom emails via Edge Function)
-- kind: account_export | monthly_digest | test
-- status: pending | sent | failed
-- ====================================================================
create table if not exists public.email_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null,
  to_email text,
  payload jsonb default '{}'::jsonb,
  status text default 'pending',
  error text,
  created_at timestamptz default now(),
  sent_at timestamptz
);

alter table public.email_requests enable row level security;

drop policy if exists "Users insert own email requests" on public.email_requests;
create policy "Users insert own email requests"
  on public.email_requests for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users view own email requests" on public.email_requests;
create policy "Users view own email requests"
  on public.email_requests for select to authenticated
  using (auth.uid() = user_id);

-- RLS note: the send-email Edge Function uses the service role key,
-- which bypasses RLS to read pending rows and mark them sent.

-- ====================================================================
-- 11. GRANTS
-- ====================================================================
grant execute on function public.insert_notification(uuid, text, text, text, text, text, text) to authenticated;
