-- TEDUHATI — 0001 taxonomy
-- Reference tables: locales, age bands, domains, skills, material tags, audio.
-- These are locale-neutral code tables with a companion *_translations table.
-- Text never lives in the base table; it always lives in a translations row.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- locales
-- ---------------------------------------------------------------------------
create table if not exists public.locales (
  code        text primary key check (code ~ '^[a-z]{2}$'),
  label       text not null,
  is_default  boolean not null default false,
  sort_order  smallint not null default 0
);

insert into public.locales (code, label, is_default, sort_order) values
  ('id', 'Bahasa Indonesia', true,  1),
  ('en', 'English',          false, 2)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- age bands  (9 segments, 0-60 months)
-- ---------------------------------------------------------------------------
create table if not exists public.age_bands (
  code            text primary key,
  age_min_months  smallint not null check (age_min_months >= 0),
  age_max_months  smallint not null check (age_max_months <= 72),
  stage_key       text not null,          -- product-facing stage: bonding/explore/...
  sort_order      smallint not null,
  constraint age_bands_range check (age_max_months > age_min_months)
);

create table if not exists public.age_band_translations (
  age_band_code text not null references public.age_bands(code) on delete cascade,
  locale        text not null references public.locales(code)   on delete cascade,
  name          text not null,
  stage_name    text not null,
  focus         text not null,
  primary key (age_band_code, locale)
);

-- ---------------------------------------------------------------------------
-- domains  (10 developmental domains)
-- ---------------------------------------------------------------------------
create table if not exists public.domains (
  code          text primary key,
  color_token   text not null,            -- maps to a CSS custom property
  icon_key      text not null,
  -- Kebun Tumbuh shows six beds, not ten. Academic domains fold into the bed
  -- they grow out of: literacy into language, numeracy into cognitive, and so on.
  in_garden     boolean not null default true,
  garden_domain text,                     -- self-reference, wired up after inserts
  sort_order    smallint not null
);

create table if not exists public.domain_translations (
  domain_code text not null references public.domains(code) on delete cascade,
  locale      text not null references public.locales(code) on delete cascade,
  name        text not null,
  description text not null,
  primary key (domain_code, locale)
);

-- ---------------------------------------------------------------------------
-- skills  (a domain's targetable skills)
-- ---------------------------------------------------------------------------
create table if not exists public.skills (
  code        text primary key,
  domain_code text not null references public.domains(code) on delete cascade,
  sort_order  smallint not null default 0
);

create table if not exists public.skill_translations (
  skill_code text not null references public.skills(code)   on delete cascade,
  locale     text not null references public.locales(code)  on delete cascade,
  name       text not null,
  primary key (skill_code, locale)
);

create index if not exists skills_domain_idx on public.skills (domain_code);

-- ---------------------------------------------------------------------------
-- material tags  (drives the "bahan yang saya punya" filter)
-- ---------------------------------------------------------------------------
create table if not exists public.material_tags (
  code         text primary key,
  is_household boolean not null default true,  -- true = almost every home has it
  sort_order   smallint not null default 0
);

create table if not exists public.material_tag_translations (
  material_tag_code text not null references public.material_tags(code) on delete cascade,
  locale            text not null references public.locales(code)       on delete cascade,
  name              text not null,
  primary key (material_tag_code, locale)
);

-- ---------------------------------------------------------------------------
-- audio catalog  (music modes + sfx; files live in storage)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.audio_kind as enum ('music', 'sfx', 'signature');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.music_mode as enum ('morning', 'play', 'bonding', 'bedtime');
exception when duplicate_object then null; end $$;

create table if not exists public.audio_tracks (
  id               text primary key,
  kind             public.audio_kind not null,
  mode             public.music_mode,
  title            text not null,          -- track titles are proper nouns, not translated
  bpm_min          smallint,
  bpm_max          smallint,
  duration_seconds integer,
  instruments      text[] not null default '{}',
  file_path        text,
  is_loop          boolean not null default false,
  is_premium       boolean not null default false,
  license_note     text,
  sort_order       smallint not null default 0,
  constraint audio_music_needs_mode check (kind <> 'music' or mode is not null)
);

create index if not exists audio_tracks_kind_idx on public.audio_tracks (kind, mode);
