-- TEDUHATI — 0004 functions and views
-- Age maths, the recommendation pipeline, entitlements, and the Kebun Tumbuh view.

-- ---------------------------------------------------------------------------
-- age
-- ---------------------------------------------------------------------------
create or replace function public.age_in_months(birth_date date, at_date date default current_date)
returns integer
language sql immutable
as $$
  select greatest(
    0,
    (extract(year  from age(at_date, birth_date)) * 12
     + extract(month from age(at_date, birth_date)))::integer
  );
$$;

create or replace function public.resolve_age_band(months integer)
returns text
language sql stable
as $$
  select code
  from public.age_bands
  where months >= age_min_months and months < age_max_months
  order by sort_order
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- entitlements
-- ---------------------------------------------------------------------------
create or replace function public.current_plan(p_user_id uuid default auth.uid())
returns public.plan_tier
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select plan
     from public.subscriptions
     where user_id = p_user_id
       and status in ('active', 'trialing')
       and (expires_at is null or expires_at > now())
     order by started_at desc
     limit 1),
    'free'::public.plan_tier
  );
$$;

create or replace function public.has_premium(p_user_id uuid default auth.uid())
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select public.current_plan(p_user_id) in ('premium', 'annual');
$$;

-- Bumps a counter and returns the value AFTER the bump, so the caller can
-- compare it against the plan's limit in one round trip.
create or replace function public.bump_usage(p_field text, p_delta integer default 1)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_period date := date_trunc('month', now() at time zone 'utc')::date;
  v_value  integer;
begin
  if v_user is null then
    raise exception 'bump_usage requires an authenticated user';
  end if;

  if p_field not in ('ai_questions', 'stories_opened', 'activities_opened') then
    raise exception 'unknown usage field: %', p_field;
  end if;

  insert into public.usage_counters (user_id, period)
  values (v_user, v_period)
  on conflict (user_id, period) do nothing;

  execute format(
    'update public.usage_counters
        set %1$I = %1$I + $1, updated_at = now()
      where user_id = $2 and period = $3
      returning %1$I', p_field)
  into v_value
  using p_delta, v_user, v_period;

  return v_value;
end;
$$;

-- ---------------------------------------------------------------------------
-- recommendation pipeline
-- age -> domain -> duration -> materials -> safety -> rank
-- Ranking prefers: domains the child has done least, then variety (unseen
-- activities first), then a stable hash so the same day gives the same answer.
-- ---------------------------------------------------------------------------
create or replace function public.recommend_activities(
  p_child_id        uuid,
  p_locale          text default 'id',
  p_limit           integer default 3,
  p_max_minutes     integer default null,
  p_materials       text[] default null,   -- null = no material constraint
  p_domain          text default null,
  p_include_premium boolean default null   -- null = derive from the caller's plan
)
returns table (
  activity_id      text,
  title            text,
  summary          text,
  duration_minutes smallint,
  primary_domain   text,
  domain_name      text,
  difficulty       smallint,
  is_premium       boolean,
  illustration_path text,
  score            numeric
)
language sql stable
security invoker
set search_path = public
as $$
with child as (
  select c.id,
         public.age_in_months(c.birth_date) as months,
         c.interests
  from public.children c
  where c.id = p_child_id
),
allow_premium as (
  select coalesce(p_include_premium, public.has_premium()) as ok
),
done as (
  select ac.activity_id, count(*) as times, max(ac.completed_at) as last_done
  from public.activity_completions ac
  where ac.child_id = p_child_id
  group by ac.activity_id
),
domain_load as (
  select a.primary_domain as domain_code, count(*) as done_count
  from public.activity_completions ac
  join public.activities a on a.id = ac.activity_id
  where ac.child_id = p_child_id
  group by a.primary_domain
),
eligible as (
  select a.*,
         coalesce(d.times, 0)   as times_done,
         d.last_done,
         coalesce(dl.done_count, 0) as domain_done
  from public.activities a
  cross join child ch
  cross join allow_premium ap
  left join done d        on d.activity_id = a.id
  left join domain_load dl on dl.domain_code = a.primary_domain
  where a.status = 'published'
    and ch.months >= a.age_min_months
    and ch.months <  a.age_max_months
    and (p_domain is null or a.primary_domain = p_domain)
    and (p_max_minutes is null or a.duration_minutes <= p_max_minutes)
    and (
      p_materials is null
      or a.no_materials
      or a.materials <@ p_materials
    )
    and (ap.ok or not a.is_premium)
)
select e.id,
       t.title,
       t.summary,
       e.duration_minutes,
       e.primary_domain,
       dt.name,
       e.difficulty,
       e.is_premium,
       e.illustration_path,
       round(
           100
         - (e.domain_done  * 4.0)                       -- under-served domains rise
         - (e.times_done   * 25.0)                      -- already done sinks hard
         + (case when e.last_done is null then 8 else 0 end)
         + (case
              when exists (
                select 1 from child ch2
                where e.skill_codes && ch2.interests
                   or e.primary_domain = any (ch2.interests)
              ) then 6 else 0 end)
         + (('x' || substr(md5(e.id || current_date::text), 1, 4))::bit(16)::int % 5)
       , 2) as score
from eligible e
join public.activity_translations t
  on t.activity_id = e.id and t.locale = p_locale
left join public.domain_translations dt
  on dt.domain_code = e.primary_domain and dt.locale = p_locale
order by score desc, e.duration_minutes asc, e.id
limit greatest(1, least(p_limit, 20));
$$;

-- ---------------------------------------------------------------------------
-- Kebun Tumbuh
-- Completions per domain become a plant stage. Five stages, generous early so
-- the first week already shows movement, then slower.
--   0 -> seed, 1-2 -> sprout, 3-5 -> plant, 6-9 -> flower, 10+ -> tree
-- This is reflective, not a developmental assessment.
-- ---------------------------------------------------------------------------
create or replace view public.child_garden as
select c.id as child_id,
       d.code as domain_code,
       d.sort_order,
       d.color_token,
       coalesce(x.done_count, 0) as done_count,
       case
         when coalesce(x.done_count, 0) = 0 then 'seed'
         when x.done_count <= 2  then 'sprout'
         when x.done_count <= 5  then 'plant'
         when x.done_count <= 9  then 'flower'
         else 'tree'
       end as stage,
       x.last_done
from public.children c
cross join public.domains d
left join (
  select ac.child_id,
         coalesce(ad.garden_domain, ad.code) as bed,
         count(*) as done_count,
         max(ac.completed_at) as last_done
  from public.activity_completions ac
  join public.activities a on a.id = ac.activity_id
  join public.domains ad   on ad.code = a.primary_domain
  group by ac.child_id, coalesce(ad.garden_domain, ad.code)
) x on x.child_id = c.id and x.bed = d.code
where d.in_garden;

-- ---------------------------------------------------------------------------
-- today's bonding moment: one per child per day, stable for the whole day
-- ---------------------------------------------------------------------------
create or replace function public.bonding_moment_of_day(
  p_child_id uuid,
  p_locale   text default 'id'
)
returns table (
  bonding_moment_id text,
  title             text,
  prompt            text,
  why_it_matters    text,
  moment_type       public.bonding_moment_type,
  duration_minutes  smallint
)
language sql stable
set search_path = public
as $$
with child as (
  select public.age_in_months(birth_date) as months from public.children where id = p_child_id
)
select b.id, t.title, t.prompt, t.why_it_matters, b.moment_type, b.duration_minutes
from public.bonding_moments b
cross join child ch
join public.bonding_moment_translations t
  on t.bonding_moment_id = b.id and t.locale = p_locale
where b.status = 'published'
  and ch.months >= b.age_min_months
  and ch.months <  b.age_max_months
  and (b.is_premium = false or public.has_premium())
order by ('x' || substr(md5(b.id || p_child_id::text || current_date::text), 1, 4))::bit(16)::int
limit 1;
$$;
