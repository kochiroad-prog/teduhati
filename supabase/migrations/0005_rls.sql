-- TEDUHATI — 0005 row level security
-- Two rules, applied everywhere:
--   1. Content tables: anyone signed in may read published rows. Premium rows
--      require an active plan. Nobody writes content through the API.
--   2. User tables: a row is visible and writable only by the parent who owns it.

-- ---------------------------------------------------------------------------
-- reference + content: read-only to clients
-- ---------------------------------------------------------------------------
alter table public.locales                   enable row level security;
alter table public.age_bands                 enable row level security;
alter table public.age_band_translations      enable row level security;
alter table public.domains                   enable row level security;
alter table public.domain_translations        enable row level security;
alter table public.skills                    enable row level security;
alter table public.skill_translations         enable row level security;
alter table public.material_tags             enable row level security;
alter table public.material_tag_translations  enable row level security;
alter table public.audio_tracks              enable row level security;
alter table public.activities                enable row level security;
alter table public.activity_translations      enable row level security;
alter table public.bonding_moments           enable row level security;
alter table public.bonding_moment_translations enable row level security;
alter table public.stories                   enable row level security;
alter table public.story_translations         enable row level security;
alter table public.worksheets                enable row level security;
alter table public.worksheet_translations     enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'locales', 'age_bands', 'age_band_translations', 'domains', 'domain_translations',
    'skills', 'skill_translations', 'material_tags', 'material_tag_translations'
  ]
  loop
    execute format('drop policy if exists "read taxonomy" on public.%I', t);
    execute format(
      'create policy "read taxonomy" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Activities: published only. Premium rows need a plan.
drop policy if exists "read published activities" on public.activities;
create policy "read published activities" on public.activities
  for select to authenticated
  using (status = 'published' and (not is_premium or public.has_premium()));

drop policy if exists "read activity text" on public.activity_translations;
create policy "read activity text" on public.activity_translations
  for select to authenticated
  using (exists (
    select 1 from public.activities a
    where a.id = activity_id
      and a.status = 'published'
      and (not a.is_premium or public.has_premium())
  ));

drop policy if exists "read published bonding" on public.bonding_moments;
create policy "read published bonding" on public.bonding_moments
  for select to authenticated
  using (status = 'published' and (not is_premium or public.has_premium()));

drop policy if exists "read bonding text" on public.bonding_moment_translations;
create policy "read bonding text" on public.bonding_moment_translations
  for select to authenticated
  using (exists (
    select 1 from public.bonding_moments b
    where b.id = bonding_moment_id
      and b.status = 'published'
      and (not b.is_premium or public.has_premium())
  ));

drop policy if exists "read published stories" on public.stories;
create policy "read published stories" on public.stories
  for select to authenticated
  using (status = 'published' and (not is_premium or public.has_premium()));

drop policy if exists "read story text" on public.story_translations;
create policy "read story text" on public.story_translations
  for select to authenticated
  using (exists (
    select 1 from public.stories s
    where s.id = story_id
      and s.status = 'published'
      and (not s.is_premium or public.has_premium())
  ));

drop policy if exists "read published worksheets" on public.worksheets;
create policy "read published worksheets" on public.worksheets
  for select to authenticated
  using (status = 'published' and (not is_premium or public.has_premium()));

drop policy if exists "read worksheet text" on public.worksheet_translations;
create policy "read worksheet text" on public.worksheet_translations
  for select to authenticated
  using (exists (
    select 1 from public.worksheets w
    where w.id = worksheet_id
      and w.status = 'published'
      and (not w.is_premium or public.has_premium())
  ));

-- Audio: free tracks are readable by anyone signed in; premium tracks need a plan.
drop policy if exists "read audio" on public.audio_tracks;
create policy "read audio" on public.audio_tracks
  for select to authenticated
  using (not is_premium or public.has_premium());

-- ---------------------------------------------------------------------------
-- user-owned tables
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.children             enable row level security;
alter table public.activity_completions enable row level security;
alter table public.bonding_completions  enable row level security;
alter table public.story_reads          enable row level security;
alter table public.ai_conversations     enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.usage_counters       enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile write"  on public.profiles;
create policy "own profile read"  on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile write" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own children" on public.children;
create policy "own children" on public.children for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Child-scoped logs: ownership is checked through the child row.
create or replace function public.owns_child(p_child_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.children c where c.id = p_child_id and c.user_id = auth.uid()
  );
$$;

drop policy if exists "own completions" on public.activity_completions;
create policy "own completions" on public.activity_completions for all to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));

drop policy if exists "own bonding log" on public.bonding_completions;
create policy "own bonding log" on public.bonding_completions for all to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));

drop policy if exists "own story reads" on public.story_reads;
create policy "own story reads" on public.story_reads for all to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));

drop policy if exists "own ai history" on public.ai_conversations;
create policy "own ai history" on public.ai_conversations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Subscriptions and counters are written by the server (service role) only.
drop policy if exists "own subscription read" on public.subscriptions;
create policy "own subscription read" on public.subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "own usage read" on public.usage_counters;
create policy "own usage read" on public.usage_counters for select to authenticated
  using (user_id = auth.uid());

-- The garden view inherits RLS from activity_completions and children.
alter view public.child_garden set (security_invoker = true);
