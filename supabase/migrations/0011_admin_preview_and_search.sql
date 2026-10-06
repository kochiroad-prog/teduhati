-- TEDUHATI — 0011 admin preview, search and bulk edits
--
-- Three things the console could not do: look at the product through the eyes
-- of a parent with a child of a given age, search activities by id and title at
-- the same time, and tag a thousand worksheets without a request per row.

-- ---------------------------------------------------------------------------
-- preview
-- ---------------------------------------------------------------------------
-- These are deliberately NOT a refactor of recommend_activities. That function
-- ranks against a particular child's history: how often a domain has been
-- played, what is already done, what the parent listed as interests. An age on
-- its own has none of that.
--
-- What these return is what a parent sees on their FIRST day — a child with no
-- completions and no interests, where every history term in the ranking is
-- zero. That is a real and useful view (it is the first impression the product
-- makes), and calling it anything else would be a lie.
create or replace function public.admin_preview_activities(
  p_months integer,
  p_locale text default 'id',
  p_limit integer default 12,
  p_include_premium boolean default true
)
returns table (
  activity_id text, title text, summary text, duration_minutes smallint,
  primary_domain text, domain_name text, difficulty smallint,
  is_premium boolean, illustration_path text, age_min_months smallint,
  age_max_months smallint
)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select a.id, t.title, t.summary, a.duration_minutes,
         a.primary_domain, dt.name, a.difficulty,
         a.is_premium, a.illustration_path, a.age_min_months, a.age_max_months
    from public.activities a
    join public.activity_translations t
      on t.activity_id = a.id and t.locale = p_locale
    left join public.domain_translations dt
      on dt.domain_code = a.primary_domain and dt.locale = p_locale
   where public.is_staff()
     and a.status = 'published'
     and p_months >= a.age_min_months
     and p_months <  a.age_max_months
     and (p_include_premium or not a.is_premium)
   -- No history to rank against, so the order is the one a fresh child gets:
   -- the base score is identical for every row, leaving the tie-break.
   order by a.primary_domain, a.difficulty, a.id
   limit greatest(1, least(coalesce(p_limit, 12), 100));
$fn$;

revoke execute on function public.admin_preview_activities(integer, text, integer, boolean) from anon, public;
grant execute on function public.admin_preview_activities(integer, text, integer, boolean) to authenticated;

create or replace function public.admin_preview_bonding(
  p_months integer, p_locale text default 'id', p_limit integer default 6
)
returns table (
  bonding_moment_id text, title text, prompt text, why_it_matters text,
  moment_type public.bonding_moment_type, duration_minutes smallint, is_premium boolean
)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select b.id, t.title, t.prompt, t.why_it_matters,
         b.moment_type, b.duration_minutes, b.is_premium
    from public.bonding_moments b
    join public.bonding_moment_translations t
      on t.bonding_moment_id = b.id and t.locale = p_locale
   where public.is_staff()
     and b.status = 'published'
     and p_months >= b.age_min_months
     and p_months <  b.age_max_months
   order by b.sort_order, b.id
   limit greatest(1, least(coalesce(p_limit, 6), 50));
$fn$;

revoke execute on function public.admin_preview_bonding(integer, text, integer) from anon, public;
grant execute on function public.admin_preview_bonding(integer, text, integer) to authenticated;

create or replace function public.admin_preview_worksheets(
  p_months integer, p_locale text default 'id', p_limit integer default 12
)
returns table (
  worksheet_id text, title text, description text, primary_domain text,
  page_count integer, is_premium boolean
)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select w.id, t.title, t.description, w.primary_domain,
         w.page_count::integer, w.is_premium
    from public.worksheets w
    join public.worksheet_translations t
      on t.worksheet_id = w.id and t.locale = p_locale
   where public.is_staff()
     and w.status = 'published'
     and w.file_path is not null
     and p_months >= w.age_min_months
     and p_months <= w.age_max_months
   order by w.sort_order, w.id
   limit greatest(1, least(coalesce(p_limit, 12), 100));
$fn$;

revoke execute on function public.admin_preview_worksheets(integer, text, integer) from anon, public;
grant execute on function public.admin_preview_worksheets(integer, text, integer) to authenticated;

create or replace function public.admin_preview_stories(
  p_months integer, p_locale text default 'id', p_limit integer default 8
)
returns table (
  story_id text, title text, blurb text, theme text,
  reading_minutes smallint, is_premium boolean
)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select s.id, t.title, t.blurb, s.theme, s.reading_minutes, s.is_premium
    from public.stories s
    join public.story_translations t on t.story_id = s.id and t.locale = p_locale
   where public.is_staff()
     and s.status = 'published'
     and p_months >= s.age_min_months
     and p_months <  s.age_max_months
   order by s.id
   limit greatest(1, least(coalesce(p_limit, 8), 50));
$fn$;

revoke execute on function public.admin_preview_stories(integer, text, integer) from anon, public;
grant execute on function public.admin_preview_stories(integer, text, integer) to authenticated;

-- How much of the library a child of this age can reach at all. The gaps are
-- the point: an age with two activities and no stories is a hole in the product.
create or replace function public.admin_preview_counts(p_months integer)
returns jsonb
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select case when not public.is_staff() then null else jsonb_build_object(
    'activities', (select count(*) from public.activities a
                    where a.status = 'published'
                      and p_months >= a.age_min_months and p_months < a.age_max_months),
    'activities_free', (select count(*) from public.activities a
                    where a.status = 'published' and not a.is_premium
                      and p_months >= a.age_min_months and p_months < a.age_max_months),
    'bonding',    (select count(*) from public.bonding_moments b
                    where b.status = 'published'
                      and p_months >= b.age_min_months and p_months < b.age_max_months),
    'stories',    (select count(*) from public.stories s
                    where s.status = 'published'
                      and p_months >= s.age_min_months and p_months < s.age_max_months),
    'worksheets', (select count(*) from public.worksheets w
                    where w.status = 'published' and w.file_path is not null
                      and p_months >= w.age_min_months and p_months <= w.age_max_months),
    'band',       (select b.code from public.age_bands b
                    where p_months >= b.age_min_months and p_months < b.age_max_months
                    order by b.sort_order limit 1)
  ) end;
$fn$;

revoke execute on function public.admin_preview_counts(integer) from anon, public;
grant execute on function public.admin_preview_counts(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- search
-- ---------------------------------------------------------------------------
-- PostgREST cannot `or` across a table and an embedded resource in one filter,
-- so the list had to choose: search ids or search titles. In SQL there is no
-- such limit. The caller gets the matching ids back and keeps its own query.
create or replace function public.admin_search_activity_ids(
  p_q text, p_locale text default 'id'
)
returns text[]
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(array_agg(distinct a.id), '{}')
    from public.activities a
    left join public.activity_translations t on t.activity_id = a.id
   where public.is_staff()
     and coalesce(btrim(p_q), '') <> ''
     and (
       a.id ilike '%' || p_q || '%'
       or t.title ilike '%' || p_q || '%'
       or t.summary ilike '%' || p_q || '%'
     );
$fn$;

revoke execute on function public.admin_search_activity_ids(text, text) from anon, public;
grant execute on function public.admin_search_activity_ids(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- bulk edits
-- ---------------------------------------------------------------------------
-- One statement instead of a request per row. Only the fields that were given
-- are touched, so "set the domain on these forty" does not silently reset their
-- age ranges. Status is NOT settable here: publishing runs through
-- set_content_status so that the validation and the audit entry still happen.
create or replace function public.admin_bulk_update_worksheets(
  p_ids text[],
  p_domain text default null,
  p_age_min integer default null,
  p_age_max integer default null,
  p_is_premium boolean default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare v_count integer;
begin
  if not public.is_staff() then
    raise exception 'staff only';
  end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 then
    return 0;
  end if;
  if coalesce(array_length(p_ids, 1), 0) > 500 then
    raise exception 'too many rows in one go (max 500)';
  end if;

  if (p_age_min is not null) <> (p_age_max is not null) then
    raise exception 'give both ends of the age range, or neither';
  end if;
  if p_age_min is not null and (p_age_min >= p_age_max or p_age_max > 72) then
    raise exception 'the age range must sit inside 0-72 months, minimum below maximum';
  end if;
  if p_domain is not null
     and not exists (select 1 from public.domains where code = p_domain) then
    raise exception 'unknown domain "%"', p_domain;
  end if;

  update public.worksheets w
     set primary_domain = coalesce(p_domain, w.primary_domain),
         age_min_months = coalesce(p_age_min, w.age_min_months),
         age_max_months = coalesce(p_age_max, w.age_max_months),
         is_premium     = coalesce(p_is_premium, w.is_premium)
   where w.id = any (p_ids);

  get diagnostics v_count = row_count;

  perform public.log_audit('worksheets.bulk_update', 'worksheets', null,
    format('%s row(s): domain=%s age=%s-%s premium=%s',
           v_count, coalesce(p_domain, '-'),
           coalesce(p_age_min::text, '-'), coalesce(p_age_max::text, '-'),
           coalesce(p_is_premium::text, '-')),
    null, jsonb_build_object('ids', to_jsonb(p_ids)));

  return v_count;
end;
$fn$;

revoke execute on function public.admin_bulk_update_worksheets(text[], text, integer, integer, boolean) from anon, public;
grant execute on function public.admin_bulk_update_worksheets(text[], text, integer, integer, boolean) to authenticated;
