-- Migration 20261108000000: Fix crawler cron collision + push notification trigger
--
-- Fixes:
--   1. Kill the legacy auto-sync-bubt-notices cron that races against bubt-crawler-fast-cycle
--   2. Fix notify_new_announcement() trigger so it fires on insertion time (now()),
--      not on BUBT's original created_at timestamp, and suppresses re-notifications on UPDATE
--   3. Fix notify_new_event() trigger with the same insertion-time logic
--   4. Widen the crawler_audit_logs.triggered_by check to accept 'staff' and 'student'
--      (the index.ts passes those values, the old CHECK constraint rejects them)

-- 1. Kill the old fragmented cron that races with bubt-crawler-fast-cycle
select cron.unschedule('auto-sync-bubt-notices')
where exists (select 1 from cron.job where jobname = 'auto-sync-bubt-notices');

select cron.unschedule('auto-sync-bubt-events')
where exists (select 1 from cron.job where jobname = 'auto-sync-bubt-events');

select cron.unschedule('auto-sync-bubt-faculty')
where exists (select 1 from cron.job where jobname = 'auto-sync-bubt-faculty');

-- 2. Widen triggered_by constraint on crawler_audit_logs
--    Old CHECK only allowed: cron, admin, manual, app
--    index.ts also passes: staff, student, service_role
alter table public.crawler_audit_logs
  drop constraint if exists crawler_audit_logs_triggered_by_check;

alter table public.crawler_audit_logs
  add constraint crawler_audit_logs_triggered_by_check
  check (triggered_by in ('cron', 'admin', 'manual', 'app', 'staff', 'student', 'service_role'));

-- 3. Fix announcement push trigger
--    Old bug: used new.created_at (BUBT's publish date) for recency check.
--             A notice published 3 days ago but first synced today would always fail the 6h window.
--    Fix:     Use now() as the reference on INSERT (the row is brand-new to our DB).
--             On UPDATE suppress the notification entirely to avoid double-firing.
create or replace function public.notify_new_announcement()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_universal boolean;
  v_bubt_age_days numeric;
begin
  -- Suppress push notifications during bulk crawler imports
  if current_setting('app.crawler_silent_mode', true) = 'on' then
    return new;
  end if;

  -- Do not re-notify users on UPDATE (crawler refresh / content hash change).
  -- Only new rows entering the DB for the first time should fire a push.
  if TG_OP = 'UPDATE' then
    return new;
  end if;

  -- Suppress push for notices that BUBT published more than 7 days ago.
  -- This prevents a deep-crawl backfill from spamming users with old circulars.
  -- (7 days gives enough buffer for temporary crawler outages or weekends.)
  v_bubt_age_days := extract(epoch from (now() - coalesce(new.created_at, now()))) / 86400.0;
  if v_bubt_age_days > 7 then
    return new;
  end if;

  -- Determine scope: university-wide vs department-targeted
  v_is_universal := (
    new.department is null
    or new.department in ('All', 'University-Wide', 'Administration', 'ALL', 'General',
                          'Controller of Examinations', 'Office of the Registrar',
                          'Accounts & Admission', 'Proctor Office')
    or coalesce(new.department_code, 'ALL') in ('ALL', 'All', 'EXAM', 'REG')
  );

  if v_is_universal then
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    select p.id, 'announce', new.title, left(coalesce(new.body, ''), 120), new.code, 'announcement'
    from public.profiles p
    where p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
    on conflict do nothing;
  else
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

-- 4. Fix event push trigger with the same insertion-time logic
create or replace function public.notify_new_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_bubt_age_days numeric;
begin
  -- Suppress during bulk crawler imports
  if current_setting('app.crawler_silent_mode', true) = 'on' then
    return new;
  end if;

  -- Suppress re-notifications on UPDATE
  if TG_OP = 'UPDATE' then
    return new;
  end if;

  -- Suppress push for events older than 7 days (backfill guard)
  v_bubt_age_days := extract(epoch from (now() - coalesce(new.created_at, now()))) / 86400.0;
  if v_bubt_age_days > 7 then
    return new;
  end if;

  -- Only notify for active (non-archived) events
  if new.deleted_at is null then
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    select
      p.id,
      'events',
      'New Event: ' || left(new.title, 80),
      new.date || ' at ' || new.venue,
      new.code,
      'event'
    from public.profiles p
    where p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
    on conflict do nothing;
  end if;

  return new;
end;
$$;
