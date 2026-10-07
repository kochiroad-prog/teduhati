-- TEDUHATI — 0012 audio file counts tell the truth
--
-- `audio_missing_file` counted rows where file_path IS NULL, and that was the
-- wrong question.
--
-- The taxonomy seed in 0006 wrote optimistic paths — 'music/bedtime/moonlight.mp3'
-- and the like — for files nobody had uploaded yet. So every track has a
-- file_path and none of them is null, while 22 of 23 point at nothing. The
-- overview reported "0 audio tracks have no file" while the player was failing
-- on almost all of them: a dashboard confidently answering a question it was
-- never actually asking.
--
-- The honest question is whether the object exists in the bucket, so that is
-- what both functions below ask.

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
    'worksheets_published',(select count(*) from public.worksheets where status = 'published'),
    'worksheets_draft',   (select count(*) from public.worksheets where status in ('draft', 'review')),
    'audio_total',        (select count(*) from public.audio_tracks),
    -- Not "file_path is null": the seed filled that in for files that were
    -- never uploaded. The object either exists in the bucket or it does not.
    'audio_missing_file', (select count(*) from public.audio_tracks a
                            where a.file_path is null
                               or not exists (select 1 from storage.objects o
                                               where o.bucket_id = 'audio' and o.name = a.file_path)),
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

-- The same correction for the audio screen: a track whose object is missing is
-- what "no file" has to mean there too, or the console shows a player that
-- fetches a 404 and a parent meets silence.
create or replace function public.admin_audio_status()
returns table (id text, file_path text, has_object boolean)
language sql stable
security definer
set search_path = public, pg_temp
as $fn$
  select a.id, a.file_path,
         a.file_path is not null
           and exists (select 1 from storage.objects o
                        where o.bucket_id = 'audio' and o.name = a.file_path)
    from public.audio_tracks a
   where public.is_staff()
   order by a.kind, a.sort_order;
$fn$;

revoke execute on function public.admin_audio_status() from anon, public;
grant execute on function public.admin_audio_status() to authenticated;
