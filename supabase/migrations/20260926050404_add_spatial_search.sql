-- ====================================================================
-- add_spatial_search
-- 1. Enable PostGIS.
-- 2. find_nearby_accessible_places RPC used by the ai-orchestrator
--    Edge Function (searchAccessiblePlaces tool).
--    p_radius is in kilometres; distance is returned in metres.
-- ====================================================================

-- 1. POSTGIS -----------------------------------------------------------
create extension if not exists postgis with schema extensions;

-- API roles execute this RPC, so make sure they can resolve objects
-- inside the extensions schema regardless of default privileges.
grant usage on schema extensions to anon, authenticated, service_role;

-- 2. NEARBY SEARCH RPC -------------------------------------------------
-- Replaces any earlier version (parameter names may differ).
drop function if exists public.find_nearby_accessible_places;

create or replace function public.find_nearby_accessible_places(
  p_lat double precision,
  p_lng double precision,
  p_radius double precision,
  p_disability_type text
)
returns table (
  id text,
  name text,
  category text,
  address text,
  lat double precision,
  lng double precision,
  features jsonb,
  photos text[],
  confirm_count integer,
  dispute_count integer,
  status text,
  description text,
  created_at timestamptz,
  distance double precision
)
language plpgsql
stable
-- Resolve ST_* whether PostGIS lives in `public` or `extensions`.
set search_path = public, extensions, pg_temp
as $$
begin
  return query
  with nearby as (
    select
      pl.*,
      -- Convert the existing lat/lng double precision columns into
      -- geographic points on the fly.
      st_distance(
        st_setsrid(st_makepoint(pl.lng, pl.lat), 4326)::geography,
        st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
      ) as distance_m
    from public.places pl
    where
      -- Radius filter (p_radius in kilometres -> metres).
      st_dwithin(
        st_setsrid(st_makepoint(pl.lng, pl.lat), 4326)::geography,
        st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        coalesce(p_radius, 5) * 1000
      )
      -- JSONB feature filter; 'General' skips the feature check.
      and (
        p_disability_type = 'General'
        or (pl.features ->> p_disability_type)::boolean = true
      )
  )
  select
    n.id,
    n.name,
    n.category,
    n.address,
    n.lat,
    n.lng,
    n.features,
    n.photos,
    n.confirm_count,
    n.dispute_count,
    n.status,
    n.description,
    n.created_at,
    n.distance_m
  from nearby n
  order by n.distance_m;
end;
$$;

grant execute on function public.find_nearby_accessible_places(
  double precision,
  double precision,
  double precision,
  text
) to anon, authenticated, service_role;
