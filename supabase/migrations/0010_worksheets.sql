-- TEDUHATI — 0010 worksheets
--
-- The worksheet library is the first paid content in the product, and that one
-- fact decides the whole design: the bucket is PRIVATE.
--
-- `audio` and `illustrations` are public buckets because that content is free
-- and decorative — a plain URL is cheaper than a signed one and nothing is lost
-- if it leaks. A worksheet PDF is the thing a parent pays for. A public URL
-- would be copyable into a WhatsApp group and the paywall would be decoration.
-- So downloads go through a signed URL, issued server-side only after the
-- caller's plan has been checked.

-- ---------------------------------------------------------------------------
-- columns the import needs
-- ---------------------------------------------------------------------------
alter table public.worksheets add column if not exists file_bytes   bigint;
alter table public.worksheets add column if not exists source_name  text;
alter table public.worksheets add column if not exists sort_order   smallint not null default 0;
alter table public.worksheets add column if not exists skill_codes  text[] not null default '{}';

-- `source_name` is the original filename from the pack. Kept so a row can be
-- traced back to the file it came from after it has been retitled, and so a
-- re-import can recognise what it already has.
create unique index if not exists worksheets_source_name_idx
  on public.worksheets (source_name) where source_name is not null;

create index if not exists worksheets_browse_idx
  on public.worksheets (status, age_min_months, age_max_months);

-- ---------------------------------------------------------------------------
-- the publish gate
-- ---------------------------------------------------------------------------
-- Same rule as the rest of the content: a row cannot reach a parent until it is
-- actually usable. For a worksheet that means a file to download and both
-- languages present — offering a download that 404s is exactly the dead control
-- the project forbids.
create or replace function public.validate_worksheet(p_id text)
returns text[]
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  w public.worksheets;
  problems text[] := '{}';
  v_locale text;
  t public.worksheet_translations;
begin
  select * into w from public.worksheets where id = p_id;
  if w.id is null then return array['worksheet not found']; end if;

  if coalesce(btrim(w.file_path), '') = '' then
    problems := problems || 'no file: a worksheet with nothing to download must not be published';
  end if;

  -- The product is for nought to five. A sheet tagged outside that range would
  -- be recommended to nobody, so it is a mistake worth catching at publish time.
  if w.age_min_months > 72 or w.age_max_months > 72 then
    problems := problems || 'age range falls outside the product (0-72 months)';
  end if;

  foreach v_locale in array array['id', 'en'] loop
    select * into t from public.worksheet_translations
     where worksheet_id = p_id and locale = v_locale;
    if t.worksheet_id is null then
      problems := problems || format('missing "%s" translation', v_locale);
      continue;
    end if;
    if coalesce(btrim(t.title), '') = '' then
      problems := problems || format('%s.title is empty', v_locale);
    end if;
    if coalesce(btrim(t.description), '') = '' then
      problems := problems || format('%s.description is empty', v_locale);
    end if;
  end loop;

  return problems;
end;
$fn$;

revoke execute on function public.validate_worksheet(text) from anon, public;
grant execute on function public.validate_worksheet(text) to authenticated;

create or replace function public.guard_worksheet_publish()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
declare problems text[];
begin
  if new.status <> 'published' then return new; end if;
  problems := public.validate_worksheet(new.id);
  if coalesce(array_length(problems, 1), 0) > 0 then
    raise exception 'cannot publish %: %', new.id, array_to_string(problems, '; ');
  end if;
  return new;
end;
$fn$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'worksheets_publish_gate'
                   and tgrelid = 'public.worksheets'::regclass) then
    create constraint trigger worksheets_publish_gate
      after insert or update on public.worksheets
      deferrable initially deferred
      for each row execute function public.guard_worksheet_publish();
  end if;
end $$;

-- set_content_status knew three validators and fell through to "no problems"
-- for worksheets, so a publish the constraint trigger was always going to
-- refuse looked like it had passed, and the admin met a raw constraint error
-- instead of the readable list this function exists to give.
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

  if p_status = 'published' then
    problems := case p_table
      when 'activities'      then public.validate_activity(p_id)
      when 'stories'         then public.validate_story(p_id)
      when 'bonding_moments' then public.validate_bonding(p_id)
      when 'worksheets'      then public.validate_worksheet(p_id)
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
    format('%s %s: %s -> %s', p_table, p_id, v_before, p_status),
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));

  return '{}'::text[];
end;
$fn$;

revoke execute on function public.set_content_status(text, text, public.content_status) from anon, public;
grant execute on function public.set_content_status(text, text, public.content_status) to authenticated;

-- ---------------------------------------------------------------------------
-- storage
-- ---------------------------------------------------------------------------
-- public = false. Everything above depends on this.
insert into storage.buckets (id, name, public)
values ('worksheets', 'worksheets', false)
on conflict (id) do update set public = false;

do $$ begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'storage' and policyname = 'staff manage worksheets') then
    create policy "staff manage worksheets" on storage.objects for all to authenticated
      using (bucket_id = 'worksheets' and public.is_staff())
      with check (bucket_id = 'worksheets' and public.is_staff());
  end if;
end $$;

-- No read policy for parents, deliberately. A signed URL is minted by the
-- server after it has checked the plan, and a signed URL does not consult row
-- level security — which is precisely why the check has to happen before it is
-- issued, in the function below.

-- ---------------------------------------------------------------------------
-- who may download
-- ---------------------------------------------------------------------------
-- Returns the storage path to sign, or raises. The caller cannot reach the file
-- without this saying yes, so the plan check and the feature switch both live
-- here rather than in the page that happens to render the button.
create or replace function public.worksheet_path_for_download(p_id text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  w public.worksheets;
  v_enabled boolean;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;

  select coalesce((select (value)::boolean from public.app_settings
                    where key = 'feature.worksheets'), false)
    into v_enabled;
  if not v_enabled and not public.is_staff() then
    raise exception 'worksheets are not switched on';
  end if;

  select * into w from public.worksheets where id = p_id;
  if w.id is null or coalesce(btrim(w.file_path), '') = '' then
    raise exception 'worksheet not found';
  end if;

  -- Staff see drafts so they can check a file before publishing it; a parent
  -- only ever reaches a published one.
  if w.status <> 'published' and not public.is_staff() then
    raise exception 'worksheet not found';
  end if;

  if w.is_premium and not public.has_premium() and not public.is_staff() then
    raise exception 'this worksheet is part of Premium';
  end if;

  return w.file_path;
end;
$fn$;

revoke execute on function public.worksheet_path_for_download(text) from anon, public;
grant execute on function public.worksheet_path_for_download(text) to authenticated;

-- ---------------------------------------------------------------------------
-- the library, for the parent-facing screen
-- ---------------------------------------------------------------------------
create or replace function public.worksheets_for_child(
  p_child_id uuid, p_locale text default 'id', p_limit integer default 60
)
returns table (
  worksheet_id text, title text, description text, primary_domain text,
  page_count integer, is_premium boolean, preview_path text
)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  with months as (
    select public.age_in_months(c.birth_date) as m
      from public.children c
     where c.id = p_child_id and public.owns_child(p_child_id)
  )
  select w.id, t.title, t.description, w.primary_domain,
         w.page_count::integer, w.is_premium, w.preview_path
    from public.worksheets w
    join public.worksheet_translations t
      on t.worksheet_id = w.id and t.locale = p_locale
    cross join months
   where w.status = 'published'
     and w.file_path is not null
     and months.m between w.age_min_months and w.age_max_months
   order by w.sort_order, w.id
   limit greatest(1, least(coalesce(p_limit, 60), 200));
$fn$;

revoke execute on function public.worksheets_for_child(uuid, text, integer) from anon, public;
grant execute on function public.worksheets_for_child(uuid, text, integer) to authenticated;
