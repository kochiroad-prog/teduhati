-- TEDUHATI — 0013 illustrations, resolved as a ladder
--
-- Three scales were on the table: one picture per domain (ten), one per domain
-- and age band (up to ninety), one per activity (a hundred). Rather than
-- choosing, the app looks for the most specific image that exists and falls
-- back:
--
--   activities/ACT-0001.webp            the activity's own picture
--   bands/<domain>/<age_band>.webp      everything in that domain at that age
--   domains/<domain>.webp               everything in that domain
--   (nothing)                           Tumi, the mascot
--
-- So ten files make the whole library look illustrated today, and a specific
-- picture added next month takes over for that one activity with no code change
-- and no database write. Nothing ever renders a broken image, because the chain
-- only ever points at a file that is actually there.

-- The names of every object in the bucket, in one round trip. The parent-facing
-- app needs this before it can decide which rung of the ladder to use, and the
-- bucket is public, so anon may read it.
create or replace function public.illustration_index()
returns text[]
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(array_agg(name), '{}')
    from storage.objects
   where bucket_id = 'illustrations';
$fn$;

grant execute on function public.illustration_index() to anon, authenticated;

-- How far the ladder actually reaches, counted against the files that exist
-- rather than against a column somebody filled in optimistically.
--
-- `activities.illustration_path` holds 'activities/ACT-0001.webp' for all 100
-- rows while the bucket is empty — the same trap the audio counter fell into,
-- where a filled-in column was mistaken for a file. The column is not consulted
-- here at all.
create or replace function public.admin_illustration_coverage()
returns jsonb
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  with idx as (
    select name from storage.objects where bucket_id = 'illustrations'
  ),
  act as (
    select a.id,
           exists (select 1 from idx where name = 'activities/' || a.id || '.webp') as own,
           exists (select 1 from idx where name = 'bands/' || a.primary_domain || '/' || a.age_band_code || '.webp') as band,
           exists (select 1 from idx where name = 'domains/' || a.primary_domain || '.webp') as dom
      from public.activities a
  )
  select case when not public.is_staff() then null else jsonb_build_object(
    'files',    (select count(*) from idx),
    'total',    (select count(*) from act),
    'specific', (select count(*) from act where own),
    'band',     (select count(*) from act where not own and band),
    'domain',   (select count(*) from act where not own and not band and dom),
    'none',     (select count(*) from act where not own and not band and not dom),
    'domains_covered', (select count(*) from public.domains d
                         where exists (select 1 from idx
                                        where name = 'domains/' || d.code || '.webp')),
    'domains_total',   (select count(*) from public.domains)
  ) end;
$fn$;

revoke execute on function public.admin_illustration_coverage() from anon, public;
grant execute on function public.admin_illustration_coverage() to authenticated;
