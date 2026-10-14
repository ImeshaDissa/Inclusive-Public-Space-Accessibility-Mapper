-- ====================================================================
-- Allow the new `place_added` confirmation email kind.
-- The client queues a row whenever the user adds a new place (Submit
-- wizard or the AI assistant), and send-email renders the matching
-- template. Without this check, every insert would be rejected.
-- Run: supabase db push
-- ====================================================================
alter table public.email_requests drop constraint if exists email_requests_kind_check;
alter table public.email_requests add constraint email_requests_kind_check
  check (kind in (
    'account_export', 'emergency_alert', 'monthly_digest', 'test',
    'welcome', 'place_update', 'place_added'
  ));
