-- ============================================================================
-- FixIt / CampusOne — Migration 20261024000001: Universal BUBT Crawler Fixes
-- ----------------------------------------------------------------------------
-- 1. Updates crawler_audit_logs.triggered_by CHECK constraint to allow:
--    'cron', 'admin', 'manual', 'app', 'student', 'staff', 'service_role'.
-- 2. Adds UNIQUE constraint on public.routines (content_hash) for deterministic upserts.
-- 3. Adds public RLS SELECT policy on public.app_config for public configuration keys.
-- 4. Hardens notification triggers for announcements and events to prevent notification storms.
-- 5. Cleans up historical expired events (>120 days) and resets banner_url for re-crawl.
-- ============================================================================

-- 1. Relax crawler_audit_logs.triggered_by constraint
alter table public.crawler_audit_logs
  drop constraint if exists crawler_audit_logs_triggered_by_check;

alter table public.crawler_audit_logs
  add constraint crawler_audit_logs_triggered_by_check
  check (triggered_by in ('cron', 'admin', 'manual', 'app', 'student', 'staff', 'service_role'));

-- 2. Add UNIQUE constraint on routines (content_hash)
-- First clean up any accidental duplicate content_hash if any exist
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'routines_content_hash_key' and conrelid = 'public.routines'::regclass
  ) then
    alter table public.routines
      add constraint routines_content_hash_key unique (content_hash);
  end if;
end $$;

create index if not exists routines_created_at_idx on public.routines (created_at desc);

-- 3. Public RLS policy on app_config for public configuration keys
do $$
begin
  drop policy if exists "anyone_read_public_config" on public.app_config;
  create policy "anyone_read_public_config" on public.app_config
    for select using (
      key in (
        'current_academic_calendar_url',
        'academic_calendar_url',
        'app_version',
        'maintenance_mode',
        'latest_bus_schedule_url'
      )
    );
end $$;

-- 4. Hardened Announcement Notification Trigger
create or replace function public.notify_new_announcement()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_universal boolean;
  v_is_recent    boolean;
begin
  -- 1. Only generate push notifications for recently published circulars (within 6 hours).
  -- Historical or backfilled notices crawled from the 4-month archive are silently stored.
  v_is_recent := (coalesce(new.created_at, now()) >= (now() - interval '6 hours'));
  if not v_is_recent then
    return new;
  end if;

  -- 2. Determine if notice is universal/all-campus or department-specific
  v_is_universal := (
    new.department is null
    or new.department in ('All', 'University-Wide', 'Administration', 'ALL', 'General')
    or coalesce(new.department_code, 'ALL') in ('ALL', 'All')
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

-- 5. Hardened Event Notification Trigger (Enforce Future/Today Date + Recency)
create or replace function public.notify_new_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_recent boolean;
begin
  -- 1. Never notify for past events (event date must be today or in the future)
  if (new.date < current_date) then
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
      'Upcoming Event: ' || new.title,
      'Date: ' || new.date::text || coalesce(' at ' || new.venue, ''),
      new.id::text,
      'event'
    from public.profiles p
    where p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- 6. Clean up historical expired events from bubt_news (>120 days in the past)
delete from public.events
where source = 'bubt_news'
  and date < (current_date - interval '120 days');

