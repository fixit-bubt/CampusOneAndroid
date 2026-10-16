-- ============================================================================
-- FixIt / CampusOne — Migration 20261024000000: Universal BUBT Ingestion Hub
-- ----------------------------------------------------------------------------
-- 1. Creates unified crawler_audit_logs table replacing scattered sync logs.
-- 2. Adds content_hash columns for zero-write delta detection on target tables.
-- 3. Ensures app_config keys exist for academic calendar and sync secrets.
-- 4. Hardens notification triggers (announcements & events) with recency thresholds
--    and session-level crawler silent suppression to prevent push storms.
-- 5. Consolidates pg_cron schedules into a two-tier 24/7 autonomous pipeline.
-- ============================================================================

-- 1. Unified crawler_audit_logs table
create table if not exists public.crawler_audit_logs (
  id              uuid primary key default gen_random_uuid(),
  feature         text not null check (feature in ('all', 'notices', 'events', 'faculty', 'routines', 'calendar', 'bus')),
  triggered_by    text not null default 'cron' check (triggered_by in ('cron', 'admin', 'manual', 'app')),
  status          text not null default 'running' check (status in ('running', 'success', 'warning', 'failed')),
  items_scanned   integer not null default 0,
  items_added     integer not null default 0,
  items_updated   integer not null default 0,
  items_unchanged integer not null default 0,
  duration_ms     integer,
  details         jsonb default '{}'::jsonb,
  error_message   text,
  created_at      timestamptz not null default now()
);

create index if not exists crawler_audit_logs_feature_idx on public.crawler_audit_logs (feature, created_at desc);
create index if not exists crawler_audit_logs_created_idx on public.crawler_audit_logs (created_at desc);

revoke all on public.crawler_audit_logs from anon;
alter table public.crawler_audit_logs enable row level security;

drop policy if exists crawler_audit_logs_admin_all on public.crawler_audit_logs;
create policy crawler_audit_logs_admin_all on public.crawler_audit_logs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.crawler_audit_logs to authenticated;
grant all on public.crawler_audit_logs to service_role;

-- 2. Content Hash columns for delta detection (zero-write optimization)
alter table public.announcements add column if not exists content_hash text;
alter table public.events add column if not exists content_hash text;
alter table public.routines add column if not exists content_hash text;

create index if not exists announcements_content_hash_idx on public.announcements (content_hash);
create index if not exists events_content_hash_idx on public.events (content_hash);
create index if not exists routines_content_hash_idx on public.routines (content_hash);

-- 3. Dynamic App Config defaults
insert into public.app_config (key, value)
values 
  ('sync_secret', 'campusone_auto_sync_secret_2026'),
  ('current_academic_calendar_url', 'https://fixit-campus-theta.vercel.app/bubt-academic-calendar-summer-2026.pdf')
on conflict (key) do nothing;

-- 4. Hardened Announcement Push Notification Trigger (Recency & Silent Suppression Guard)
create or replace function public.notify_new_announcement()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_universal boolean;
  v_is_recent    boolean;
begin
  -- 1. Suppress push notifications during bulk crawler imports
  if current_setting('app.crawler_silent_mode', true) = 'on' then
    return new;
  end if;

  -- 2. Only generate push notifications for recently published circulars (within 6 hours).
  -- Historical or backfilled notices crawled from the 4-month archive are silently stored without spamming users.
  v_is_recent := (coalesce(new.created_at, now()) >= (now() - interval '6 hours'));
  if not v_is_recent then
    return new;
  end if;

  -- 3. Determine if notice is universal/all-campus or department-specific
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

-- 5. Hardened Event Push Notification Trigger (Recency & Silent Suppression Guard)
create or replace function public.notify_new_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_recent boolean;
begin
  -- 1. Suppress during bulk crawler imports
  if current_setting('app.crawler_silent_mode', true) = 'on' then
    return new;
  end if;

  -- 2. Only notify for recently created events (within 6 hours)
  v_is_recent := (coalesce(new.created_at, now()) >= (now() - interval '6 hours'));
  if not v_is_recent then
    return new;
  end if;

  -- 3. Only notify for active events
  if (new.deleted_at is null) then
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

-- 6. Two-Tier Automated Scheduling with pg_cron
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Unschedule legacy fragmented cron jobs
select cron.unschedule('auto-sync-bubt-notices') where exists (select 1 from cron.job where jobname = 'auto-sync-bubt-notices');
select cron.unschedule('auto-sync-bubt-events') where exists (select 1 from cron.job where jobname = 'auto-sync-bubt-events');
select cron.unschedule('auto-sync-bubt-faculty') where exists (select 1 from cron.job where jobname = 'auto-sync-bubt-faculty');
select cron.unschedule('bubt-crawler-fast-cycle') where exists (select 1 from cron.job where jobname = 'bubt-crawler-fast-cycle');
select cron.unschedule('bubt-crawler-faculty-daily') where exists (select 1 from cron.job where jobname = 'bubt-crawler-faculty-daily');

-- Tier 1: Fast cycle every 30 minutes 24/7 (Notices, Events, Routines, Calendar)
select cron.schedule(
  'bubt-crawler-fast-cycle',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://xhgpxvyqrufbbuivttmi.supabase.co/functions/v1/bubt-crawler?tier=fast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', 'campusone_auto_sync_secret_2026'
    ),
    body := '{"mode":"fast","source":"cron"}'::jsonb
  );
  $$
);

-- Tier 2: Faculty roster deep sweep daily at 03:00 AM Dhaka (21:00 UTC)
select cron.schedule(
  'bubt-crawler-faculty-daily',
  '0 21 * * *',
  $$
  select net.http_post(
    url := 'https://xhgpxvyqrufbbuivttmi.supabase.co/functions/v1/bubt-crawler?tier=faculty',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', 'campusone_auto_sync_secret_2026'
    ),
    body := '{"mode":"faculty","source":"cron"}'::jsonb
  );
  $$
);

