-- TEDUHATI — 0007 function hardening
--
-- Three problems the database linter surfaced after 0004 and 0005:
--
-- 1. bump_usage accepted a negative p_delta. It is SECURITY DEFINER and callable
--    over /rest/v1/rpc, so any signed-in parent could have called it with -100
--    and wiped their own free-tier counter. The delta is now clamped.
-- 2. age_in_months, resolve_age_band and touch_updated_at had a mutable
--    search_path, which is the standard privilege-escalation route into a
--    function that runs with someone else's rights.
-- 3. Every SECURITY DEFINER function was callable by `anon`. None of them are
--    meant for a signed-out caller.
--
-- Note on the grants below: has_premium and owns_child are used inside RLS
-- policies, and a policy expression is evaluated with the privileges of the
-- querying role. Revoking EXECUTE from `authenticated` would break every policy
-- that calls them, so only `anon` is revoked there.

-- ---------------------------------------------------------------------------
-- 1. search_path
-- ---------------------------------------------------------------------------
alter function public.age_in_months(date, date)   set search_path = public, pg_temp;
alter function public.resolve_age_band(integer)   set search_path = public, pg_temp;
alter function public.touch_updated_at()          set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- 2. bump_usage can only ever count upwards
-- ---------------------------------------------------------------------------
create or replace function public.bump_usage(p_field text, p_delta integer default 1)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_user   uuid := auth.uid();
  v_period date := date_trunc('month', now() at time zone 'utc')::date;
  v_step   integer := least(greatest(coalesce(p_delta, 1), 0), 10);
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
  using v_step, v_user, v_period;

  return v_value;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 3. grants
-- ---------------------------------------------------------------------------

-- A trigger function is invoked by the system, not by the inserting role, so
-- nobody needs EXECUTE on it.
revoke all on function public.handle_new_user() from anon, authenticated, public;

-- Called by the app with a signed-in session, never by a signed-out visitor.
revoke execute on function public.bump_usage(text, integer)  from anon, public;
revoke execute on function public.current_plan(uuid)         from anon, public;

-- Used inside RLS policies: `authenticated` must keep EXECUTE.
revoke execute on function public.has_premium(uuid)          from anon, public;
revoke execute on function public.owns_child(uuid)           from anon, public;

grant execute on function public.bump_usage(text, integer)   to authenticated;
grant execute on function public.current_plan(uuid)          to authenticated;
grant execute on function public.has_premium(uuid)           to authenticated;
grant execute on function public.owns_child(uuid)            to authenticated;
