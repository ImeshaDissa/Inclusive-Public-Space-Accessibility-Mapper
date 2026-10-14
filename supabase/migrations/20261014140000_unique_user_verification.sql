-- Migration: 20261014140000_unique_user_verification.sql
-- Enforces that a record is verified only when 3 unique users confirm it,
-- and prevents repeated confirmations from the same user from incrementing confirm_count.

-- 1. Add confirmed_by array to places and reports tables if not present
alter table public.places
  add column if not exists confirmed_by text[] default array[]::text[];

alter table public.reports
  add column if not exists confirmed_by text[] default array[]::text[];

-- 2. Update report verification threshold trigger function
create or replace function public.handle_report_verification_threshold()
returns trigger as $$
declare
  unique_confirms integer;
begin
  if new.confirmed_by is not null and array_length(new.confirmed_by, 1) > 0 then
    select count(distinct lower(trim(u))) into unique_confirms from unnest(new.confirmed_by) as u;
    new.confirm_count := unique_confirms;
  end if;

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
  before insert or update of confirm_count, dispute_count, confirmed_by on public.reports
  for each row execute function public.handle_report_verification_threshold();

-- 3. Update place verification threshold trigger function
create or replace function public.handle_place_verification_threshold()
returns trigger as $$
declare
  unique_confirms integer;
begin
  if new.confirmed_by is not null and array_length(new.confirmed_by, 1) > 0 then
    select count(distinct lower(trim(u))) into unique_confirms from unnest(new.confirmed_by) as u;
    new.confirm_count := unique_confirms;
  end if;

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
  before insert or update of confirm_count, dispute_count, confirmed_by on public.places
  for each row execute function public.handle_place_verification_threshold();
