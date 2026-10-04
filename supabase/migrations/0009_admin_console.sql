-- TEDUHATI — 0009 admin console
--
-- This migration is what turns the database from a seed target into the place
-- content actually lives. Three things follow from that, and all three are here
-- rather than in TypeScript:
--
--   1. Settings that used to be environment variables (bank account, prices,
--      free-tier limits) move into `app_settings`, so an admin changes them
--      without a redeploy.
--   2. The content safety gate moves out of scripts/validate-content.mjs and
--      into the database. A script cannot protect a row inserted by a dashboard,
--      so the rule "an activity with materials, or for a baby under twelve
--      months, must carry a safety note in both locales" is now a constraint.
--   3. Every privileged action writes to `audit_log`, because once content and
--      money can be changed from a browser, "who did this" has to be answerable.
--
-- Deliberately no DROP statements, so the file can be re-applied.

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------
-- Key/value rather than a column per setting: a new price or feature switch
-- should not need a migration. `is_public` is the important column — the
-- payment screen and the landing page read prices and bank details with the
-- anon key, while free-tier limits and internal switches stay staff-only.
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,
  label       text,
  description text,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Two policies, not one with an OR.
--
-- `is_public or public.is_staff()` looks right and is not: EXECUTE on is_staff()
-- is revoked from anon, and Postgres does not promise to short-circuit an OR, so
-- an anonymous read raises "permission denied for function is_staff" before the
-- `is_public` branch can save it. The landing page reads a price before anyone
-- signs in, so that path has to work. Each policy asks only what its own role is
-- allowed to ask, and policies are OR'd, so staff still see every row.
do $$ begin
  if not exists (select 1 from pg_policies
                 where tablename = 'app_settings' and policyname = 'public settings read') then
    create policy "public settings read" on public.app_settings for select
      using (is_public);
  end if;
  if not exists (select 1 from pg_policies
                 where tablename = 'app_settings' and policyname = 'staff reads all settings') then
    create policy "staff reads all settings" on public.app_settings for select to authenticated
      using (public.is_staff());
  end if;
end $$;

-- No insert/update/delete policy: `set_setting` below is the only writer, so a
-- compromised browser session cannot rewrite a price even as an admin.

insert into public.app_settings (key, value, is_public, label, description) values
  ('bank.name',            '""'::jsonb,      true,  'Nama bank',              'Bank tujuan transfer manual.'),
  ('bank.account_number',  '""'::jsonb,      true,  'Nomor rekening',         'Ditampilkan di layar pembayaran.'),
  ('bank.account_holder',  '""'::jsonb,      true,  'Nama pemilik rekening',  'Harus sama dengan nama di buku bank.'),
  ('price.premium',        '39000'::jsonb,   true,  'Harga bulanan (Rp)',     'Tagihan Premium per bulan.'),
  ('price.annual',         '249000'::jsonb,  true,  'Harga tahunan (Rp)',     'Tagihan Premium per tahun.'),
  ('free.children',        '1'::jsonb,       true,  'Jumlah anak (gratis)',   'Batas profil anak di paket gratis.'),
  ('free.activities_per_day', '1'::jsonb,    true,  'Aktivitas per hari',     'Batas harian paket gratis.'),
  ('free.stories_per_month',  '5'::jsonb,    true,  'Cerita per bulan',       'Batas bulanan paket gratis.'),
  ('free.ai_questions_per_month', '5'::jsonb, true, 'Pertanyaan AI per bulan','Batas bulanan paket gratis.'),
  ('order.window_hours',   '24'::jsonb,      true,  'Masa berlaku pesanan',   'Jam sebelum pesanan kedaluwarsa.'),
  ('feature.checkout',     'true'::jsonb,    true,  'Checkout aktif',         'Matikan untuk menyembunyikan pembayaran.'),
  ('feature.music',        'true'::jsonb,    true,  'Pemutar musik aktif',    'Matikan jika berkas audio belum diunggah.'),
  ('feature.ai',           'true'::jsonb,    true,  'Tanya TEDUHATI aktif',   'Matikan untuk menyembunyikan asisten.'),
  ('feature.worksheets',   'false'::jsonb,   true,  'Lembar kerja aktif',     'Nyalakan setelah ada berkas PDF.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_email text,
  action      text not null,
  object_type text not null,
  object_id   text,
  summary     text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_object_idx  on public.audit_log (object_type, object_id);

alter table public.audit_log enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies
                 where tablename = 'audit_log' and policyname = 'staff read audit') then
    create policy "staff read audit" on public.audit_log for select to authenticated
      using (public.is_staff());
  end if;
end $$;

-- Writes go through this function only, so the actor is always the caller and
-- cannot be forged by passing a different id.
create or replace function public.log_audit(
  p_action text,
  p_object_type text,
  p_object_id text default null,
  p_summary text default null,
  p_before jsonb default null,
  p_after jsonb default null
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare v_id bigint;
begin
  -- is_staff(), not is_privileged_writer(): that one is SECURITY INVOKER and so
  -- reads `current_user` at the call site, which inside this DEFINER function is
  -- the owner, postgres — it would return true for every caller and the check
  -- would do nothing. is_staff() is answered from auth.uid(), which a DEFINER
  -- boundary does not change. The admin functions that call this are all
  -- admin-only already, and the seed importer never calls it.
  if not public.is_staff() then
    raise exception 'only staff can write to the audit log';
  end if;

  insert into public.audit_log
    (actor_id, actor_email, action, object_type, object_id, summary, before, after)
  values
    (auth.uid(),
     (select email from auth.users where id = auth.uid()),
     p_action, p_object_type, p_object_id, p_summary, p_before, p_after)
  returning id into v_id;
  return v_id;
end;
$fn$;

revoke execute on function public.log_audit(text, text, text, text, jsonb, jsonb) from anon, public;
grant execute on function public.log_audit(text, text, text, text, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- changing a setting
-- ---------------------------------------------------------------------------
create or replace function public.set_setting(p_key text, p_value jsonb)
returns public.app_settings
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_before jsonb;
  v_row public.app_settings;
begin
  if not public.is_admin() then
    raise exception 'only an admin can change a setting';
  end if;

  select value into v_before from public.app_settings where key = p_key;
  if v_before is null and not exists (select 1 from public.app_settings where key = p_key) then
    raise exception 'unknown setting "%"', p_key;
  end if;

  -- A price of zero or a negative limit would silently break the paywall, so
  -- the numeric settings are range-checked here rather than trusted.
  if p_key like 'price.%' then
    if jsonb_typeof(p_value) <> 'number' or (p_value)::numeric < 1000 then
      raise exception 'a price must be a number of at least 1000 rupiah';
    end if;
  elsif p_key like 'free.%' or p_key = 'order.window_hours' then
    if jsonb_typeof(p_value) <> 'number' or (p_value)::numeric < 0 then
      raise exception 'a limit must be a number of zero or more';
    end if;
  elsif p_key like 'feature.%' then
    if jsonb_typeof(p_value) <> 'boolean' then
      raise exception 'a feature switch must be true or false';
    end if;
  elsif p_key like 'bank.%' then
    if jsonb_typeof(p_value) <> 'string' then
      raise exception 'a bank detail must be text';
    end if;
  end if;

  update public.app_settings
     set value = p_value, updated_by = auth.uid(), updated_at = now()
   where key = p_key
   returning * into v_row;

  perform public.log_audit('setting.update', 'app_settings', p_key,
    format('%s: %s → %s', p_key, v_before::text, p_value::text),
    jsonb_build_object('value', v_before), jsonb_build_object('value', p_value));

  return v_row;
end;
$fn$;

revoke execute on function public.set_setting(text, jsonb) from anon, public;
grant execute on function public.set_setting(text, jsonb) to authenticated;

-- Everything the app needs in one round trip, as a single object.
create or replace function public.public_settings()
returns jsonb
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    from public.app_settings where is_public;
$fn$;

grant execute on function public.public_settings() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- the content safety gate, as a database constraint
-- ---------------------------------------------------------------------------
-- validate_activity returns the problems with one activity, newest rule first.
-- An empty array means it is safe to publish. The dashboard calls this to show
-- warnings while editing; the trigger below calls it to refuse a publish.
create or replace function public.validate_activity(p_id text)
returns text[]
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  a public.activities;
  problems text[] := '{}';
  v_locale text;
  t public.activity_translations;
  v_needs_safety boolean;
  v_step_counts integer[] := '{}';
begin
  select * into a from public.activities where id = p_id;
  if a.id is null then
    return array['activity not found'];
  end if;

  v_needs_safety := coalesce(array_length(a.materials, 1), 0) > 0 or a.age_min_months < 12;

  if coalesce(array_length(a.materials, 1), 0) > 0 and a.no_materials then
    problems := problems || 'no_materials is true but materials are listed';
  end if;
  if coalesce(array_length(a.materials, 1), 0) = 0 and not a.no_materials then
    problems := problems || 'no materials listed, so no_materials should be true';
  end if;

  -- Age range has to sit inside its declared band, or the recommender hands a
  -- toddler activity to a newborn.
  if exists (
    select 1 from public.age_bands b
     where b.code = a.age_band_code
       and (a.age_min_months < b.age_min_months or a.age_max_months > b.age_max_months)
  ) then
    problems := problems || format('age range %s-%s falls outside band %s',
      a.age_min_months, a.age_max_months, a.age_band_code);
  end if;

  foreach v_locale in array array['id', 'en'] loop
    select * into t from public.activity_translations
     where activity_id = p_id and locale = v_locale;

    if t.activity_id is null then
      problems := problems || format('missing "%s" translation', v_locale);
      continue;
    end if;

    if coalesce(btrim(t.title), '') = ''         then problems := problems || format('%s.title is empty', v_locale); end if;
    if coalesce(btrim(t.summary), '') = ''       then problems := problems || format('%s.summary is empty', v_locale); end if;
    if coalesce(btrim(t.learning_goal), '') = '' then problems := problems || format('%s.learning_goal is empty', v_locale); end if;

    if jsonb_array_length(t.steps) < 3 then
      problems := problems || format('%s.steps needs at least 3 steps', v_locale);
    end if;
    v_step_counts := v_step_counts || jsonb_array_length(t.steps);

    if exists (
      select 1 from jsonb_array_elements(t.steps) s
       where coalesce(btrim(s->>'title'), '') = ''
          or length(coalesce(btrim(s->>'body'), '')) < 20
    ) then
      problems := problems || format('%s has a step with an empty title or a body too short to follow', v_locale);
    end if;

    -- Safety is not optional where it matters. This is the rule the whole gate
    -- exists for.
    if v_needs_safety and coalesce(btrim(t.safety_notes), '') = '' then
      problems := problems ||
        format('%s.safety_notes is required for an activity with materials or for under-twelve-months', v_locale);
    end if;
  end loop;

  if array_length(v_step_counts, 1) = 2 and v_step_counts[1] <> v_step_counts[2] then
    problems := problems || format('step count differs between locales (id: %s, en: %s)',
      v_step_counts[1], v_step_counts[2]);
  end if;

  return problems;
end;
$fn$;

-- A staff tool: the default PUBLIC grant would let an anonymous caller probe
-- which content ids are incomplete.
revoke execute on function public.validate_activity(text) from anon, public;
grant execute on function public.validate_activity(text) to authenticated;

-- A DEFERRABLE constraint trigger, not an ordinary one: the dashboard writes the
-- activity row and both translations in one transaction, in whatever order is
-- convenient. Checking at commit means the gate holds without forcing the
-- application to write the parent row last.
create or replace function public.guard_activity_publish()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare problems text[];
begin
  if new.status <> 'published' then
    return new;
  end if;
  problems := public.validate_activity(new.id);
  if coalesce(array_length(problems, 1), 0) > 0 then
    raise exception 'cannot publish %: %', new.id, array_to_string(problems, '; ');
  end if;
  return new;
end;
$fn$;

do $$ begin
  if not exists (select 1 from pg_trigger
                 where tgname = 'activities_publish_gate'
                   and tgrelid = 'public.activities'::regclass) then
    create constraint trigger activities_publish_gate
      after insert or update on public.activities
      deferrable initially deferred
      for each row execute function public.guard_activity_publish();
  end if;
end $$;

-- Translations can be edited after an activity is published, so they need the
-- same gate pointing back at the parent.
create or replace function public.guard_activity_translation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare problems text[];
begin
  if not exists (select 1 from public.activities
                  where id = new.activity_id and status = 'published') then
    return new;
  end if;
  problems := public.validate_activity(new.activity_id);
  if coalesce(array_length(problems, 1), 0) > 0 then
    raise exception 'cannot leave % published: %', new.activity_id, array_to_string(problems, '; ');
  end if;
  return new;
end;
$fn$;

do $$ begin
  if not exists (select 1 from pg_trigger
                 where tgname = 'activity_translations_publish_gate'
                   and tgrelid = 'public.activity_translations'::regclass) then
    create constraint trigger activity_translations_publish_gate
      after insert or update on public.activity_translations
      deferrable initially deferred
      for each row execute function public.guard_activity_translation();
  end if;
end $$;

-- Stories and bonding moments get the lighter version of the same idea: both
-- locales, and matching page counts where pages exist.
create or replace function public.validate_story(p_id text)
returns text[]
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  s public.stories;
  problems text[] := '{}';
  v_locale text;
  t public.story_translations;
  counts integer[] := '{}';
begin
  select * into s from public.stories where id = p_id;
  if s.id is null then return array['story not found']; end if;

  foreach v_locale in array array['id', 'en'] loop
    select * into t from public.story_translations where story_id = p_id and locale = v_locale;
    if t.story_id is null then
      problems := problems || format('missing "%s" translation', v_locale);
      continue;
    end if;
    if coalesce(btrim(t.title), '') = '' then problems := problems || format('%s.title is empty', v_locale); end if;
    if coalesce(btrim(t.blurb), '') = '' then problems := problems || format('%s.blurb is empty', v_locale); end if;
    if jsonb_array_length(t.pages) < 3 then
      problems := problems || format('%s.pages needs at least 3 pages', v_locale);
    end if;
    if exists (select 1 from jsonb_array_elements(t.pages) p
                where coalesce(btrim(p->>'text'), '') = '') then
      problems := problems || format('%s has a page with no text', v_locale);
    end if;
    if s.is_interactive and not exists (
      select 1 from jsonb_array_elements(t.pages) p
       where jsonb_typeof(p->'choices') = 'array' and jsonb_array_length(p->'choices') > 1
    ) then
      problems := problems || format('%s is marked interactive but no page offers two choices', v_locale);
    end if;
    counts := counts || jsonb_array_length(t.pages);
  end loop;

  if array_length(counts, 1) = 2 and counts[1] <> counts[2] then
    problems := problems || format('page count differs between locales (id: %s, en: %s)', counts[1], counts[2]);
  end if;

  return problems;
end;
$fn$;

-- A staff tool: the default PUBLIC grant would let an anonymous caller probe
-- which content ids are incomplete.
revoke execute on function public.validate_story(text) from anon, public;
grant execute on function public.validate_story(text) to authenticated;

create or replace function public.validate_bonding(p_id text)
returns text[]
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  problems text[] := '{}';
  v_locale text;
  t public.bonding_moment_translations;
begin
  if not exists (select 1 from public.bonding_moments where id = p_id) then
    return array['bonding moment not found'];
  end if;

  foreach v_locale in array array['id', 'en'] loop
    select * into t from public.bonding_moment_translations
     where bonding_moment_id = p_id and locale = v_locale;
    if t.bonding_moment_id is null then
      problems := problems || format('missing "%s" translation', v_locale);
      continue;
    end if;
    if coalesce(btrim(t.title), '') = ''          then problems := problems || format('%s.title is empty', v_locale); end if;
    if coalesce(btrim(t.prompt), '') = ''         then problems := problems || format('%s.prompt is empty', v_locale); end if;
    if coalesce(btrim(t.why_it_matters), '') = '' then problems := problems || format('%s.why_it_matters is empty', v_locale); end if;
    -- A prompt the parent cannot act on in one breath is not a moment.
    if length(coalesce(t.prompt, '')) > 220 then
      problems := problems || format('%s.prompt is too long for a one-to-three minute moment', v_locale);
    end if;
  end loop;

  return problems;
end;
$fn$;

-- A staff tool: the default PUBLIC grant would let an anonymous caller probe
-- which content ids are incomplete.
revoke execute on function public.validate_bonding(text) from anon, public;
grant execute on function public.validate_bonding(text) to authenticated;

create or replace function public.guard_story_publish()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare problems text[];
begin
  if new.status <> 'published' then return new; end if;
  problems := public.validate_story(new.id);
  if coalesce(array_length(problems, 1), 0) > 0 then
    raise exception 'cannot publish %: %', new.id, array_to_string(problems, '; ');
  end if;
  return new;
end;
$fn$;

create or replace function public.guard_bonding_publish()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare problems text[];
begin
  if new.status <> 'published' then return new; end if;
  problems := public.validate_bonding(new.id);
  if coalesce(array_length(problems, 1), 0) > 0 then
    raise exception 'cannot publish %: %', new.id, array_to_string(problems, '; ');
  end if;
  return new;
end;
$fn$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'stories_publish_gate'
                   and tgrelid = 'public.stories'::regclass) then
    create constraint trigger stories_publish_gate
      after insert or update on public.stories
      deferrable initially deferred
      for each row execute function public.guard_story_publish();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'bonding_publish_gate'
                   and tgrelid = 'public.bonding_moments'::regclass) then
    create constraint trigger bonding_publish_gate
      after insert or update on public.bonding_moments
      deferrable initially deferred
      for each row execute function public.guard_bonding_publish();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- who may write content
-- ---------------------------------------------------------------------------
-- An editor drafts and revises. Only an admin may put something in front of a
-- parent, or take it back down. The split lives in a trigger rather than in
-- eight policies, so the rule is stated once.
alter table public.bonding_moments add column if not exists updated_at timestamptz not null default now();
alter table public.stories        add column if not exists updated_at timestamptz not null default now();
alter table public.worksheets     add column if not exists updated_at timestamptz not null default now();

-- The seed importer connects with the service role and a migration runs as
-- postgres; neither has an auth.uid(), so neither is "an admin". They are
-- trusted to set a status. The validation gates above still apply to them —
-- that is the whole reason the safety rule moved into the database.
--
-- SECURITY INVOKER, and that is not incidental. As a DEFINER function this read
-- `current_user` as its own owner, postgres, so it returned true for everybody
-- and an editor could set status='published' straight on the table, past the
-- admin-only check in set_content_status. As an INVOKER function `current_user`
-- is the role PostgREST switched to: `authenticated` for a signed-in person,
-- `service_role` for the importer, `postgres` during a migration. is_admin()
-- stays DEFINER, which is how it reads profiles on the caller's behalf.
create or replace function public.is_privileged_writer()
returns boolean
language sql stable
security invoker
set search_path = public, pg_temp
as $fn$
  select current_user in ('postgres', 'service_role', 'supabase_admin')
      or public.is_admin();
$fn$;

grant execute on function public.is_privileged_writer() to authenticated, service_role;

create or replace function public.guard_publish_role()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  if tg_op = 'INSERT' and new.status = 'published' then
    raise exception 'only an admin can publish';
  end if;
  if tg_op = 'UPDATE' and (old.status = 'published' or new.status = 'published')
     and old.status is distinct from new.status then
    raise exception 'only an admin can publish or unpublish';
  end if;
  return new;
end;
$fn$;

do $$
declare t text;
begin
  foreach t in array array['activities', 'stories', 'bonding_moments', 'worksheets'] loop
    if not exists (select 1 from pg_trigger
                   where tgname = t || '_publish_role'
                     and tgrelid = ('public.' || t)::regclass) then
      execute format(
        'create trigger %I before insert or update on public.%I
           for each row execute function public.guard_publish_role()',
        t || '_publish_role', t);
    end if;
    -- updated_at on every content table, so the dashboard can sort by what
    -- changed most recently.
    if not exists (select 1 from pg_trigger
                   where tgname = 'touch_' || t and tgrelid = ('public.' || t)::regclass) then
      execute format(
        'create trigger %I before update on public.%I
           for each row execute function public.touch_updated_at()',
        'touch_' || t, t);
    end if;
  end loop;
end $$;

-- Staff write access. Read access on these tables is already public (published
-- content is the product), so only the write side is added here.
do $$
declare t text;
begin
  foreach t in array array[
    'activities', 'activity_translations',
    'stories', 'story_translations',
    'bonding_moments', 'bonding_moment_translations',
    'worksheets', 'worksheet_translations',
    'audio_tracks'
  ] loop
    if not exists (select 1 from pg_policies
                   where tablename = t and policyname = 'staff write ' || t) then
      execute format(
        'create policy %I on public.%I for all to authenticated
           using (public.is_staff()) with check (public.is_staff())',
        'staff write ' || t, t);
    end if;
  end loop;
end $$;

-- Staff need to see draft and retired rows too, which the public read policies
-- deliberately hide.
do $$
declare t text;
begin
  foreach t in array array['activities', 'stories', 'bonding_moments', 'worksheets'] loop
    if not exists (select 1 from pg_policies
                   where tablename = t and policyname = 'staff read all ' || t) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.is_staff())',
        'staff read all ' || t, t);
    end if;
  end loop;
  foreach t in array array['activity_translations', 'story_translations',
                           'bonding_moment_translations', 'worksheet_translations'] loop
    if not exists (select 1 from pg_policies
                   where tablename = t and policyname = 'staff read all ' || t) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.is_staff())',
        'staff read all ' || t, t);
    end if;
  end loop;
end $$;

-- Remaining staff read access for the dashboard's engagement figures.
do $$ begin
  if not exists (select 1 from pg_policies
                 where tablename = 'bonding_completions' and policyname = 'staff read bonding completions') then
    create policy "staff read bonding completions" on public.bonding_completions
      for select to authenticated using (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies
                 where tablename = 'story_reads' and policyname = 'staff read story reads') then
    create policy "staff read story reads" on public.story_reads
      for select to authenticated using (public.is_staff());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- content actions, with their audit entries
-- ---------------------------------------------------------------------------
create or replace function public.set_content_status(
  p_table text, p_id text, p_status public.content_status
)
returns text[]
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_before public.content_status;
  problems text[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'only an admin can change what parents can see';
  end if;
  if p_table not in ('activities', 'stories', 'bonding_moments', 'worksheets') then
    raise exception 'unknown content table "%"', p_table;
  end if;

  -- Validate before writing, so the caller gets the list of problems rather
  -- than a raw constraint error from the gate.
  if p_status = 'published' then
    problems := case p_table
      when 'activities'      then public.validate_activity(p_id)
      when 'stories'         then public.validate_story(p_id)
      when 'bonding_moments' then public.validate_bonding(p_id)
      else '{}'::text[] end;
    if coalesce(array_length(problems, 1), 0) > 0 then
      return problems;
    end if;
  end if;

  execute format('select status from public.%I where id = $1', p_table)
     into v_before using p_id;
  if v_before is null then
    raise exception '% % not found', p_table, p_id;
  end if;

  execute format('update public.%I set status = $1 where id = $2', p_table)
    using p_status, p_id;

  perform public.log_audit(
    'content.' || p_status::text, p_table, p_id,
    format('%s %s: %s → %s', p_table, p_id, v_before, p_status),
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));

  return '{}'::text[];
end;
$fn$;

revoke execute on function public.set_content_status(text, text, public.content_status) from anon, public;
grant execute on function public.set_content_status(text, text, public.content_status) to authenticated;

-- The next free id in a series, so the dashboard never asks an editor to invent
-- one and never collides with an id the seed files already use.
create or replace function public.next_content_id(p_table text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_prefix text;
  v_max integer;
begin
  if not public.is_staff() then
    raise exception 'staff only';
  end if;
  v_prefix := case p_table
    when 'activities' then 'ACT'
    when 'stories' then 'STR'
    when 'bonding_moments' then 'BND'
    when 'worksheets' then 'WRK'
    else null end;
  if v_prefix is null then
    raise exception 'unknown content table "%"', p_table;
  end if;

  execute format(
    'select coalesce(max(substring(id from 5)::integer), 0) from public.%I', p_table)
    into v_max;

  return v_prefix || '-' || lpad((v_max + 1)::text, 4, '0');
end;
$fn$;

revoke execute on function public.next_content_id(text) from anon, public;
grant execute on function public.next_content_id(text) to authenticated;

-- ---------------------------------------------------------------------------
-- people
-- ---------------------------------------------------------------------------
create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_before public.user_role;
  v_row public.profiles;
  v_admins integer;
begin
  if not public.is_admin() then
    raise exception 'only an admin can change a role';
  end if;

  select role into v_before from public.profiles where id = p_user_id;
  if v_before is null then
    raise exception 'user not found';
  end if;

  -- Removing the last admin would lock everyone out of the dashboard, and no
  -- amount of UI confirmation recovers from that.
  if v_before = 'admin' and p_role <> 'admin' then
    select count(*) into v_admins from public.profiles where role = 'admin';
    if v_admins <= 1 then
      raise exception 'this is the only admin left, so the role cannot be removed';
    end if;
  end if;

  update public.profiles set role = p_role, updated_at = now()
   where id = p_user_id returning * into v_row;

  perform public.log_audit('user.role', 'profiles', p_user_id::text,
    format('role: %s → %s', v_before, p_role),
    jsonb_build_object('role', v_before), jsonb_build_object('role', p_role));

  return v_row;
end;
$fn$;

revoke execute on function public.set_user_role(uuid, public.user_role) from anon, public;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;

-- Granting Premium by hand: a refund, a reviewer, a parent whose transfer
-- arrived outside the flow. It writes the same subscription row a paid order
-- would, so entitlements have exactly one source.
create or replace function public.grant_premium(
  p_user_id uuid, p_plan public.plan_tier default 'premium', p_months integer default 1, p_note text default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_row public.subscriptions;
  v_span interval;
  v_months integer := greatest(1, least(coalesce(p_months, 1), 36));
begin
  if not public.is_admin() then
    raise exception 'only an admin can grant a plan';
  end if;
  if p_plan not in ('premium', 'annual') then
    raise exception 'grant_premium only grants a paid plan';
  end if;

  v_span := case when p_plan = 'annual'
                 then make_interval(years => v_months)
                 else make_interval(months => v_months) end;

  update public.subscriptions
     set plan = p_plan, status = 'active', provider = 'manual_grant',
         expires_at = greatest(coalesce(expires_at, now()), now()) + v_span,
         updated_at = now()
   where user_id = p_user_id and status in ('active', 'trialing')
   returning * into v_row;

  if not found then
    insert into public.subscriptions (user_id, plan, status, provider, expires_at)
    values (p_user_id, p_plan, 'active', 'manual_grant', now() + v_span)
    returning * into v_row;
  end if;

  perform public.log_audit('subscription.grant', 'subscriptions', v_row.id::text,
    format('%s granted %s for %s', p_user_id, p_plan, v_months),
    null, jsonb_build_object('plan', p_plan, 'months', v_months, 'note', p_note));

  return v_row;
end;
$fn$;

revoke execute on function public.grant_premium(uuid, public.plan_tier, integer, text) from anon, public;
grant execute on function public.grant_premium(uuid, public.plan_tier, integer, text) to authenticated;

create or replace function public.cancel_subscription(p_subscription_id uuid, p_note text default null)
returns public.subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare v_row public.subscriptions;
begin
  if not public.is_admin() then
    raise exception 'only an admin can cancel a subscription';
  end if;

  update public.subscriptions
     set status = 'canceled', updated_at = now()
   where id = p_subscription_id
   returning * into v_row;

  if v_row.id is null then
    raise exception 'subscription not found';
  end if;

  perform public.log_audit('subscription.cancel', 'subscriptions', p_subscription_id::text,
    coalesce(p_note, 'cancelled by an admin'), null, jsonb_build_object('note', p_note));

  return v_row;
end;
$fn$;

revoke execute on function public.cancel_subscription(uuid, text) from anon, public;
grant execute on function public.cancel_subscription(uuid, text) to authenticated;

-- One row per parent, with the figures the people screen shows. Built in SQL
-- because doing it in the page means one query per parent.
create or replace function public.admin_users(
  p_search text default null, p_limit integer default 50, p_offset integer default 0
)
returns table (
  id uuid, email text, display_name text, role public.user_role,
  locale text, plan public.plan_tier, plan_expires_at timestamptz,
  children integer, completions integer, last_seen timestamptz, created_at timestamptz
)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select p.id,
         u.email::text,
         p.display_name,
         p.role,
         p.locale,
         public.current_plan(p.id),
         (select max(s.expires_at) from public.subscriptions s
           where s.user_id = p.id and s.status in ('active', 'trialing')),
         (select count(*)::integer from public.children c
           where c.user_id = p.id and not c.is_archived),
         (select count(*)::integer from public.activity_completions ac
            join public.children c on c.id = ac.child_id
           where c.user_id = p.id),
         greatest(
           p.updated_at,
           (select max(ac.completed_at) from public.activity_completions ac
              join public.children c on c.id = ac.child_id
             where c.user_id = p.id)
         ),
         p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
   where public.is_staff()
     and (p_search is null or btrim(p_search) = ''
          or p.display_name ilike '%' || p_search || '%'
          or u.email ilike '%' || p_search || '%')
   order by p.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$fn$;

revoke execute on function public.admin_users(text, integer, integer) from anon, public;
grant execute on function public.admin_users(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- dashboard figures
-- ---------------------------------------------------------------------------
-- admin_overview gains a previous-period column for every moving figure: a
-- count on its own does not say whether things are getting better.
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
    'mrr',                (select coalesce(sum(case when plan = 'annual'
                                                    then (select (value)::numeric from public.app_settings where key = 'price.annual') / 12
                                                    else (select (value)::numeric from public.app_settings where key = 'price.premium') end), 0)::bigint
                             from public.subscriptions
                            where status in ('active', 'trialing') and plan in ('premium', 'annual')),
    'completions_7d',     (select count(*) from public.activity_completions
                            where completed_at > now() - interval '7 days'),
    'completions_prev_7d',(select count(*) from public.activity_completions
                            where completed_at > now() - interval '14 days'
                              and completed_at <= now() - interval '7 days'),
    'ai_questions_month', (select coalesce(sum(ai_questions), 0) from public.usage_counters
                            where period = date_trunc('month', now() at time zone 'utc')::date),
    'activities_published',(select count(*) from public.activities where status = 'published'),
    'activities_draft',   (select count(*) from public.activities where status in ('draft', 'review')),
    'activities_total',   (select count(*) from public.activities),
    'stories_published',  (select count(*) from public.stories where status = 'published'),
    'stories_total',      (select count(*) from public.stories),
    'bonding_published',  (select count(*) from public.bonding_moments where status = 'published'),
    'bonding_total',      (select count(*) from public.bonding_moments),
    'worksheets_total',   (select count(*) from public.worksheets),
    'audio_total',        (select count(*) from public.audio_tracks),
    'audio_missing_file', (select count(*) from public.audio_tracks where file_path is null),
    'signups_7d',         (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'signups_prev_7d',    (select count(*) from public.profiles
                            where created_at > now() - interval '14 days'
                              and created_at <= now() - interval '7 days'),
    'signups_30d',        (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'revenue_30d',        (select coalesce(sum(total), 0) from public.orders
                            where status = 'paid' and reviewed_at > now() - interval '30 days'),
    'revenue_prev_30d',   (select coalesce(sum(total), 0) from public.orders
                            where status = 'paid'
                              and reviewed_at > now() - interval '60 days'
                              and reviewed_at <= now() - interval '30 days'),
    -- The action list: things an admin should do something about today.
    'needs_safety_note',  (select count(*) from public.activities a
                            where a.status = 'published'
                              and (coalesce(array_length(a.materials, 1), 0) > 0 or a.age_min_months < 12)
                              and exists (select 1 from public.activity_translations t
                                           where t.activity_id = a.id
                                             and coalesce(btrim(t.safety_notes), '') = '')),
    'missing_translation',(select count(*) from public.activities a
                            where (select count(*) from public.activity_translations t
                                    where t.activity_id = a.id) < 2),
    'bank_configured',    (select coalesce((select (value #>> '{}') <> '' from public.app_settings where key = 'bank.account_number'), false))
  ) end;
$fn$;

revoke execute on function public.admin_overview() from anon, public;
grant execute on function public.admin_overview() to authenticated;

-- How many people who signed up ever reached each step. The point of the funnel
-- is to show where parents stop, not to celebrate the total.
create or replace function public.admin_funnel(p_days integer default 30)
returns jsonb
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  with cohort as (
    select p.id from public.profiles p
     where p.role = 'parent'
       and p.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
  )
  select case when not public.is_staff() then null else jsonb_build_object(
    'signed_up',  (select count(*) from cohort),
    'added_child',(select count(distinct c.user_id) from public.children c
                    where c.user_id in (select id from cohort)),
    'did_one',    (select count(distinct c.user_id) from public.children c
                     join public.activity_completions ac on ac.child_id = c.id
                    where c.user_id in (select id from cohort)),
    'did_three',  (select count(*) from (
                     select c.user_id from public.children c
                       join public.activity_completions ac on ac.child_id = c.id
                      where c.user_id in (select id from cohort)
                      group by c.user_id having count(*) >= 3) t),
    'started_order',(select count(distinct o.user_id) from public.orders o
                      where o.user_id in (select id from cohort)),
    'paid',       (select count(distinct o.user_id) from public.orders o
                    where o.user_id in (select id from cohort) and o.status = 'paid')
  ) end;
$fn$;

revoke execute on function public.admin_funnel(integer) from anon, public;
grant execute on function public.admin_funnel(integer) to authenticated;

-- What parents actually do, and what nobody touches. The second list is the
-- useful one: it says where the content library is not earning its keep.
create or replace function public.admin_top_activities(p_days integer default 30, p_limit integer default 10)
returns table (activity_id text, title text, domain_code text, completions integer, avg_rating numeric)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select a.id, t.title, a.primary_domain,
         count(ac.id)::integer,
         round(avg(ac.rating)::numeric, 1)
    from public.activities a
    join public.activity_translations t on t.activity_id = a.id and t.locale = 'id'
    left join public.activity_completions ac on ac.activity_id = a.id
         and ac.completed_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
   where public.is_staff()
   group by a.id, t.title, a.primary_domain
   order by count(ac.id) desc, a.id
   limit greatest(1, least(coalesce(p_limit, 10), 100));
$fn$;

revoke execute on function public.admin_top_activities(integer, integer) from anon, public;
grant execute on function public.admin_top_activities(integer, integer) to authenticated;

create or replace function public.admin_domain_coverage()
returns table (domain_code text, name text, published integer, completions integer)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select d.code, dt.name,
         (select count(*)::integer from public.activities a
           where a.primary_domain = d.code and a.status = 'published'),
         (select count(*)::integer from public.activity_completions ac
            join public.activities a on a.id = ac.activity_id
           where a.primary_domain = d.code)
    from public.domains d
    left join public.domain_translations dt on dt.domain_code = d.code and dt.locale = 'id'
   where public.is_staff()
   order by d.sort_order;
$fn$;

revoke execute on function public.admin_domain_coverage() from anon, public;
grant execute on function public.admin_domain_coverage() to authenticated;

create or replace function public.admin_revenue_monthly(p_months integer default 12)
returns table (month date, orders integer, revenue bigint)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  with months as (
    select generate_series(
      date_trunc('month', now()) - make_interval(months => greatest(1, least(coalesce(p_months, 12), 36)) - 1),
      date_trunc('month', now()), interval '1 month')::date as month
  )
  select m.month,
         (select count(*)::integer from public.orders o
           where o.status = 'paid' and date_trunc('month', o.reviewed_at)::date = m.month),
         (select coalesce(sum(o.total), 0)::bigint from public.orders o
           where o.status = 'paid' and date_trunc('month', o.reviewed_at)::date = m.month)
    from months m
   where public.is_staff()
   order by m.month;
$fn$;

revoke execute on function public.admin_revenue_monthly(integer) from anon, public;
grant execute on function public.admin_revenue_monthly(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- storage
-- ---------------------------------------------------------------------------
-- Public read, staff write. Audio and illustrations are part of the product,
-- so a parent's browser must fetch them without a token; payment proofs are a
-- different matter and stay private.
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true), ('illustrations', 'illustrations', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'storage' and policyname = 'staff manage content assets') then
    create policy "staff manage content assets" on storage.objects for all to authenticated
      using (bucket_id in ('audio', 'illustrations') and public.is_staff())
      with check (bucket_id in ('audio', 'illustrations') and public.is_staff());
  end if;

  -- A parent uploads their own transfer receipt into a folder named after their
  -- user id, and can see only that folder. Staff see all of them.
  if not exists (select 1 from pg_policies
                 where schemaname = 'storage' and policyname = 'own proof write') then
    create policy "own proof write" on storage.objects for insert to authenticated
      with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies
                 where schemaname = 'storage' and policyname = 'own proof read') then
    create policy "own proof read" on storage.objects for select to authenticated
      using (bucket_id = 'proofs'
             and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
  end if;
end $$;
