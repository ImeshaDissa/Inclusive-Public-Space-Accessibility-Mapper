-- ====================================================================
-- InclusiveMapper — Assert Tier-1 realtime wiring for the inbox
--
-- Defensive / idempotent. Adds public.notifications and public.reports to
-- the supabase_realtime publication only if they are not already members,
-- and re-asserts replica identity full (Realtime needs the full old row to
-- build UPDATE/DELETE payloads for RLS-filtered subscriptions).
--
-- NOTE: verification of this path must be done with an AUTHENTICATED
-- session. postgres_changes is RLS-filtered, so a client subscribed
-- without a session (role = anon) receives nothing for
-- `notifications` — its SELECT policy is `auth.uid() = user_id`.
-- That is expected behaviour, not a bug: with a signed-in session the
-- INSERT event is delivered correctly (verified live against the project).
-- ====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end $$;

alter table public.notifications replica identity full;
alter table public.reports replica identity full;
