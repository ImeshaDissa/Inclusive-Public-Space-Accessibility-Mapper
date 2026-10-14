-- ====================================================================
-- Backfill profiles & user_roles for auth accounts created before the
-- on_auth_user_created triggers existed (or via a path that skipped them).
--
-- Without a public.profiles row, every insert into public.notifications
-- and public.email_requests fails the profiles(id) foreign key — so SOS
-- emails and inbox notifications silently never queue ("email service
-- not working"). New sign-ups are still covered by the triggers in
-- 20260926043042; this only repairs older accounts. Idempotent.
-- ====================================================================
insert into public.profiles (id, email, name, role)
select
  u.id,
  coalesce(u.email, u.id::text || '@missing.invalid'),
  coalesce(
    u.raw_user_meta_data ->> 'display_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, 'mapper'), '@', 1)
  ),
  'user'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'user'
from auth.users u
where not exists (select 1 from public.user_roles r where r.user_id = u.id)
on conflict (user_id) do nothing;
