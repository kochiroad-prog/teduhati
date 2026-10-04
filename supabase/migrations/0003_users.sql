-- TEDUHATI — 0003 users
-- Everything tied to a signed-in parent: profile, children, completions,
-- AI history, subscription, and the monthly counters that enforce free limits.

do $$ begin
  create type public.plan_tier as enum ('free', 'premium', 'annual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum
    ('active', 'past_due', 'canceled', 'expired', 'trialing');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  parent_role   text,                       -- what the child calls them: Ayah, Ibu, Oma...
  locale        text not null default 'id' references public.locales(code),
  timezone      text not null default 'Asia/Jakarta',
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- A profile row must exist the moment a user signs up, or the first query fails.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'id')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Created only when absent, so re-running this file never drops a live trigger.
do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- children
-- ---------------------------------------------------------------------------
create table if not exists public.children (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 60),
  birth_date  date not null check (birth_date <= current_date),
  interests   text[] not null default '{}',
  avatar_seed smallint not null default 1 check (avatar_seed between 1 and 8),
  notes       text,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists children_user_idx on public.children (user_id) where not is_archived;

-- ---------------------------------------------------------------------------
-- activity completions
-- ---------------------------------------------------------------------------
create table if not exists public.activity_completions (
  id               uuid primary key default gen_random_uuid(),
  child_id         uuid not null references public.children(id)     on delete cascade,
  activity_id      text not null references public.activities(id)   on delete restrict,
  completed_at     timestamptz not null default now(),
  rating           smallint check (rating between 1 and 5),
  child_mood       text check (child_mood in ('loved_it', 'okay', 'not_today')),
  actual_minutes   smallint,
  note             text
);

create index if not exists completions_child_idx on public.activity_completions (child_id, completed_at desc);
create index if not exists completions_activity_idx on public.activity_completions (activity_id);

-- ---------------------------------------------------------------------------
-- bonding + story logs  (kept separate: different products, different analytics)
-- ---------------------------------------------------------------------------
create table if not exists public.bonding_completions (
  id                uuid primary key default gen_random_uuid(),
  child_id          uuid not null references public.children(id)         on delete cascade,
  bonding_moment_id text not null references public.bonding_moments(id)  on delete restrict,
  completed_at      timestamptz not null default now()
);

create index if not exists bonding_completions_child_idx
  on public.bonding_completions (child_id, completed_at desc);

create table if not exists public.story_reads (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children(id) on delete cascade,
  story_id   text not null references public.stories(id)  on delete restrict,
  read_at    timestamptz not null default now(),
  finished   boolean not null default false
);

create index if not exists story_reads_child_idx on public.story_reads (child_id, read_at desc);

-- ---------------------------------------------------------------------------
-- AI conversations
-- ---------------------------------------------------------------------------
create table if not exists public.ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  child_id     uuid references public.children(id) on delete set null,
  question     text not null,
  answer       text not null,
  locale       text not null default 'id',
  provider     text,
  model        text,
  input_tokens integer,
  output_tokens integer,
  created_at   timestamptz not null default now()
);

create index if not exists ai_conversations_user_idx
  on public.ai_conversations (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  plan        public.plan_tier not null default 'free',
  status      public.subscription_status not null default 'active',
  provider    text,                     -- payment gateway name
  external_id text,                     -- gateway's own reference
  started_at  timestamptz not null default now(),
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists subscriptions_active_per_user
  on public.subscriptions (user_id)
  where status in ('active', 'trialing');

-- ---------------------------------------------------------------------------
-- usage counters  (one row per user per month; enforces free-tier limits)
-- ---------------------------------------------------------------------------
create table if not exists public.usage_counters (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  period            date not null,     -- first day of the month, UTC
  ai_questions      integer not null default 0,
  stories_opened    integer not null default 0,
  activities_opened integer not null default 0,
  updated_at        timestamptz not null default now(),
  primary key (user_id, period)
);

-- ---------------------------------------------------------------------------
-- keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'children', 'activities', 'subscriptions']
  loop
    if not exists (
      select 1 from pg_trigger
      where tgname = 'touch_' || t and tgrelid = ('public.' || t)::regclass
    ) then
      execute format(
        'create trigger touch_%1$s before update on public.%1$s
           for each row execute function public.touch_updated_at()', t);
    end if;
  end loop;
end $$;
