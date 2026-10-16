-- ============================================================================
-- FixIt — Migration 20261021000000: Auto-Sync Secret & Push Notification Guard
-- ----------------------------------------------------------------------------
-- 1. Inserts dedicated sync_secret into public.app_config.
-- 2. Reschedules auto-sync-bubt-notices and auto-sync-bubt-events with hardened secret.
-- 3. Hardens notify_new_announcement() to only dispatch notifications for notices
--    published in the last 48 hours, preventing massive notification cascades on crawl.
-- ============================================================================

-- 1. Ensure sync_secret exists in public.app_config
insert into public.app_config (key, value)
values ('sync_secret', 'campusone_auto_sync_secret_2026')
on conflict (key) do update set value = excluded.value;

-- 2. Harden Announcement Push Notification Trigger (48-Hour Threshold)
create or replace function public.notify_new_announcement()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_universal boolean;
  v_is_recent    boolean;
begin
  -- Only generate push notifications for recently published circulars (within 48 hours).
  -- Historical or backfilled notices crawled from the archive are silently stored without spamming users.
  v_is_recent := (coalesce(new.created_at, now()) >= (now() - interval '48 hours'));

  if not v_is_recent then
    return new;
  end if;

  -- Determine if notice is universal/all-campus or department-specific
  v_is_universal := (
    new.department is null
    or new.department in ('All', 'University-Wide', 'Administration', 'ALL', 'General')
    or coalesce(new.department_code, 'ALL') in ('ALL', 'All')
  );

  if v_is_universal then
    -- Universal notice (holidays, general exams, university rules): notify all users
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    select p.id, 'announce', new.title, left(coalesce(new.body, ''), 120), new.code, 'announcement'
    from public.profiles p
    where p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
    on conflict do nothing;
  else
    -- Department-targeted notice (e.g. CSE, Civil, EEE): target students in that department
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    select p.id, 'announce', new.title, left(coalesce(new.body, ''), 120), new.code, 'announcement'
    from public.profiles p
    where p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
      and (
        p.department ilike '%' || new.department || '%'
        or new.department ilike '%' || p.department || '%'
        or (new.department_code is not null and p.department ilike '%' || new.department_code || '%')
      )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- 3. Reschedule cron jobs with hardened sync_secret
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('auto-sync-bubt-notices')
where exists (select 1 from cron.job where jobname = 'auto-sync-bubt-notices');

select cron.schedule(
  'auto-sync-bubt-notices',
  '*/30 2-16 * * *',
  $$
  select net.http_post(
    url := 'https://xhgpxvyqrufbbuivttmi.supabase.co/functions/v1/sync-notices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', 'campusone_auto_sync_secret_2026'
    ),
    body := '{"triggered_by":"cron"}'::jsonb
  );
  $$
);

select cron.unschedule('auto-sync-bubt-events')
where exists (select 1 from cron.job where jobname = 'auto-sync-bubt-events');

select cron.schedule(
  'auto-sync-bubt-events',
  '*/30 2-16 * * *',
  $$
  select net.http_post(
    url := 'https://xhgpxvyqrufbbuivttmi.supabase.co/functions/v1/sync-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', 'campusone_auto_sync_secret_2026'
    ),
    body := '{"triggered_by":"cron"}'::jsonb
  );
  $$
);
