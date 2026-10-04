-- TEDUHATI — 0002 content
-- Activities, bonding moments, stories, worksheets. All bilingual via *_translations.
-- `activities` holds only filterable, locale-neutral metadata so the recommendation
-- pipeline (age -> domain -> duration -> materials -> safety -> rank) runs on indexes.

do $$ begin
  create type public.content_status as enum ('draft', 'review', 'published', 'retired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bonding_moment_type as enum
    ('morning', 'play', 'meal', 'bath', 'outdoor', 'bedtime', 'anytime');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------------
create table if not exists public.activities (
  id                  text primary key check (id ~ '^ACT-[0-9]{4}$'),
  age_min_months      smallint not null check (age_min_months >= 0),
  age_max_months      smallint not null check (age_max_months <= 72),
  age_band_code       text not null references public.age_bands(code),
  primary_domain      text not null references public.domains(code),
  secondary_domains   text[] not null default '{}',
  skill_codes         text[] not null default '{}',
  duration_minutes    smallint not null check (duration_minutes between 1 and 60),
  difficulty          smallint not null default 1 check (difficulty between 1 and 3),
  materials           text[] not null default '{}',   -- material_tags.code values
  no_materials        boolean not null default false, -- true = bare hands, nothing needed
  screen_free         boolean not null default true,
  needs_supervision   boolean not null default true,
  bonding_level       smallint not null default 2 check (bonding_level between 1 and 3),
  music_mode          public.music_mode,
  illustration_path   text,
  character_animation text not null default 'tumi-happy',
  completion_sound    text not null default 'complete',
  source_reference    text,                           -- framework used as reference, if any
  status              public.content_status not null default 'published',
  is_premium          boolean not null default false,
  reviewed_by_expert  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint activities_range check (age_max_months > age_min_months)
);

create table if not exists public.activity_translations (
  activity_id   text not null references public.activities(id) on delete cascade,
  locale        text not null references public.locales(code)  on delete cascade,
  title         text not null,
  summary       text not null,
  learning_goal text not null,
  steps         jsonb not null default '[]'::jsonb,  -- [{ "title": "...", "body": "..." }]
  parent_tip    text,
  safety_notes  text,
  variations    text[] not null default '{}',
  materials_text text,                               -- human-readable material list
  primary key (activity_id, locale),
  constraint activity_steps_is_array check (jsonb_typeof(steps) = 'array')
);

create index if not exists activities_age_idx       on public.activities (age_min_months, age_max_months);
create index if not exists activities_band_idx      on public.activities (age_band_code);
create index if not exists activities_domain_idx    on public.activities (primary_domain);
create index if not exists activities_duration_idx  on public.activities (duration_minutes);
create index if not exists activities_status_idx    on public.activities (status) where status = 'published';
create index if not exists activities_materials_idx on public.activities using gin (materials);
create index if not exists activities_skills_idx    on public.activities using gin (skill_codes);

-- ---------------------------------------------------------------------------
-- bonding moments  (its own product module, not an activity subtype)
-- A bonding moment is a 1-3 minute prompt tied to a part of the day.
-- ---------------------------------------------------------------------------
create table if not exists public.bonding_moments (
  id               text primary key check (id ~ '^BND-[0-9]{4}$'),
  age_min_months   smallint not null check (age_min_months >= 0),
  age_max_months   smallint not null check (age_max_months <= 72),
  moment_type      public.bonding_moment_type not null,
  duration_minutes smallint not null default 2 check (duration_minutes between 1 and 15),
  music_mode       public.music_mode,
  character_animation text not null default 'tumi-happy',
  status           public.content_status not null default 'published',
  is_premium       boolean not null default false,
  sort_order       smallint not null default 0,
  created_at       timestamptz not null default now(),
  constraint bonding_range check (age_max_months > age_min_months)
);

create table if not exists public.bonding_moment_translations (
  bonding_moment_id text not null references public.bonding_moments(id) on delete cascade,
  locale            text not null references public.locales(code)       on delete cascade,
  title             text not null,
  prompt            text not null,   -- what the parent says or does, in one breath
  why_it_matters    text not null,
  primary key (bonding_moment_id, locale)
);

create index if not exists bonding_age_idx  on public.bonding_moments (age_min_months, age_max_months);
create index if not exists bonding_type_idx on public.bonding_moments (moment_type);

-- ---------------------------------------------------------------------------
-- stories
-- ---------------------------------------------------------------------------
create table if not exists public.stories (
  id             text primary key check (id ~ '^STR-[0-9]{4}$'),
  age_min_months smallint not null,
  age_max_months smallint not null,
  theme          text not null,
  is_interactive boolean not null default false,
  reading_minutes smallint not null default 4,
  music_mode     public.music_mode default 'bedtime',
  cover_path     text,
  status         public.content_status not null default 'published',
  is_premium     boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint stories_range check (age_max_months > age_min_months)
);

create table if not exists public.story_translations (
  story_id text not null references public.stories(id)    on delete cascade,
  locale   text not null references public.locales(code)  on delete cascade,
  title    text not null,
  blurb    text not null,
  pages    jsonb not null default '[]'::jsonb,  -- [{ "text": "...", "choices": [...] }]
  primary key (story_id, locale),
  constraint story_pages_is_array check (jsonb_typeof(pages) = 'array')
);

create index if not exists stories_age_idx on public.stories (age_min_months, age_max_months);

-- ---------------------------------------------------------------------------
-- worksheets  (printable, premium digital product)
-- ---------------------------------------------------------------------------
create table if not exists public.worksheets (
  id             text primary key check (id ~ '^WRK-[0-9]{4}$'),
  age_min_months smallint not null,
  age_max_months smallint not null,
  primary_domain text not null references public.domains(code),
  page_count     smallint not null default 1,
  file_path      text,
  preview_path   text,
  status         public.content_status not null default 'published',
  is_premium     boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint worksheets_range check (age_max_months > age_min_months)
);

create table if not exists public.worksheet_translations (
  worksheet_id text not null references public.worksheets(id)   on delete cascade,
  locale       text not null references public.locales(code)    on delete cascade,
  title        text not null,
  description  text not null,
  primary key (worksheet_id, locale)
);
