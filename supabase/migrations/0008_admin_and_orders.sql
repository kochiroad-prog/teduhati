-- TEDUHATI — 0008 admin and orders
--
-- Two additions that depend on each other: a role so a small number of people
-- can see the whole picture, and an order trail so a subscription can be paid
-- for and activated without a payment gateway account existing yet.
--
-- The manual-transfer flow is the one that works today in Indonesia: the parent
-- gets an amount with a unique suffix, transfers it, and an admin confirms the
-- payment in the dashboard. When a gateway is wired up later it writes to the
-- same `orders` table and the rest of the product does not change.

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('parent', 'editor', 'admin');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists role public.user_role not null default 'parent';

-- SECURITY DEFINER so a policy can ask "is this person staff?" without the
-- person needing read access to anyone else's profile row.
create or replace function public.is_staff(p_user_id uuid default auth.uid())
returns boolean
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role in ('editor', 'admin')
  );
$fn$;

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from public.profiles where id = p_user_id and role = 'admin'
  );
$fn$;

revoke execute on function public.is_staff(uuid) from anon, public;
revoke execute on function public.is_admin(uuid) from anon, public;
grant execute on function public.is_staff(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.order_status as enum
    ('awaiting_payment', 'awaiting_confirmation', 'paid', 'rejected', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  plan            public.plan_tier not null check (plan in ('premium', 'annual')),
  -- Rupiah, stored as a whole number: there are no sub-unit amounts here.
  amount          integer not null check (amount > 0),
  -- A small per-order suffix makes a bank transfer identifiable without asking
  -- the payer to type a reference the bank may strip.
  unique_suffix   smallint not null check (unique_suffix between 0 and 999),
  total           integer not null check (total > 0),
  status          public.order_status not null default 'awaiting_payment',
  provider        text not null default 'manual_transfer',
  external_id     text,
  payer_note      text,
  proof_path      text,
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  review_note     text,
  expires_at      timestamptz not null default now() + interval '24 hours',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists orders_user_idx   on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

do $$ begin
  if not exists (select 1 from pg_trigger
                 where tgname = 'touch_orders' and tgrelid = 'public.orders'::regclass) then
    create trigger touch_orders before update on public.orders
      for each row execute function public.touch_updated_at();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- confirming an order is what grants the subscription
-- ---------------------------------------------------------------------------
create or replace function public.approve_order(p_order_id uuid, p_note text default null)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  o public.orders;
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'only an admin can approve an order';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if o.id is null then
    raise exception 'order not found';
  end if;
  if o.status = 'paid' then
    return o;                                   -- approving twice is a no-op
  end if;

  v_until := case when o.plan = 'annual'
                  then now() + interval '1 year'
                  else now() + interval '1 month' end;

  -- One active subscription per user, so extend the existing row rather than
  -- inserting a second one that the unique index would reject.
  update public.subscriptions
     set plan = o.plan,
         status = 'active',
         provider = o.provider,
         external_id = o.reference,
         expires_at = greatest(coalesce(expires_at, now()), now()) +
                      case when o.plan = 'annual' then interval '1 year' else interval '1 month' end,
         updated_at = now()
   where user_id = o.user_id and status in ('active', 'trialing');

  if not found then
    insert into public.subscriptions (user_id, plan, status, provider, external_id, expires_at)
    values (o.user_id, o.plan, 'active', o.provider, o.reference, v_until);
  end if;

  update public.orders
     set status = 'paid', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
   where id = p_order_id
   returning * into o;

  return o;
end;
$fn$;

create or replace function public.reject_order(p_order_id uuid, p_note text default null)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare o public.orders;
begin
  if not public.is_admin() then
    raise exception 'only an admin can reject an order';
  end if;

  update public.orders
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
   where id = p_order_id and status <> 'paid'
   returning * into o;

  if o.id is null then
    raise exception 'order not found, or it is already paid';
  end if;
  return o;
end;
$fn$;

revoke execute on function public.approve_order(uuid, text) from anon, public;
revoke execute on function public.reject_order(uuid, text) from anon, public;
grant execute on function public.approve_order(uuid, text) to authenticated;
grant execute on function public.reject_order(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;

-- A parent sees and starts their own orders; only the functions above may
-- change one, which is why there is no update policy here.
create policy "own orders read" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "own orders insert" on public.orders for insert to authenticated
  with check (user_id = auth.uid());

-- Staff read access across the user tables, for the dashboard.
create policy "staff read profiles" on public.profiles for select to authenticated
  using (public.is_staff());

create policy "staff read children" on public.children for select to authenticated
  using (public.is_staff());

create policy "staff read subscriptions" on public.subscriptions for select to authenticated
  using (public.is_staff());

create policy "staff read usage" on public.usage_counters for select to authenticated
  using (public.is_staff());

create policy "staff read completions" on public.activity_completions for select to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------------
-- dashboard figures, computed in one place
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select case when not public.is_staff() then null else jsonb_build_object(
    'parents',            (select count(*) from public.profiles where role = 'parent'),
    'children',           (select count(*) from public.children where not is_archived),
    'active_subs',        (select count(*) from public.subscriptions
                            where status in ('active', 'trialing')
                              and plan in ('premium', 'annual')),
    'orders_pending',     (select count(*) from public.orders where status = 'awaiting_confirmation'),
    'mrr',                (select coalesce(sum(case when plan = 'annual' then 249000 / 12 else 39000 end), 0)
                             from public.subscriptions
                            where status in ('active', 'trialing') and plan in ('premium', 'annual')),
    'completions_7d',     (select count(*) from public.activity_completions
                            where completed_at > now() - interval '7 days'),
    'ai_questions_month', (select coalesce(sum(ai_questions), 0) from public.usage_counters
                            where period = date_trunc('month', now() at time zone 'utc')::date),
    'activities_published',(select count(*) from public.activities where status = 'published'),
    'activities_total',   (select count(*) from public.activities),
    'stories_published',  (select count(*) from public.stories where status = 'published'),
    'bonding_published',  (select count(*) from public.bonding_moments where status = 'published'),
    'signups_30d',        (select count(*) from public.profiles where created_at > now() - interval '30 days')
  ) end;
$fn$;

revoke execute on function public.admin_overview() from anon, public;
grant execute on function public.admin_overview() to authenticated;

-- Daily sign-ups and completions for the dashboard chart.
create or replace function public.admin_daily(p_days integer default 30)
returns table (day date, signups integer, completions integer)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  with days as (
    select generate_series(
      (current_date - (greatest(1, least(p_days, 180)) - 1)),
      current_date, interval '1 day')::date as day
  )
  select d.day,
         (select count(*) from public.profiles p
           where p.created_at::date = d.day and public.is_staff())::integer,
         (select count(*) from public.activity_completions c
           where c.completed_at::date = d.day and public.is_staff())::integer
  from days d
  order by d.day;
$fn$;

revoke execute on function public.admin_daily(integer) from anon, public;
grant execute on function public.admin_daily(integer) to authenticated;
