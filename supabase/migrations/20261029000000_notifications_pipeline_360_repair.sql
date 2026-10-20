-- Migration: 20261029000000_notifications_pipeline_360_repair.sql
-- 1. Drop duplicate trigger on connections (eliminate double notification & push spam)
-- 2. Update notify_connection_event with notif_prefs check
-- 3. Enhance notify_new_announcement to recognize all university administrative offices as universal
--    and ensure students with unset departments receive notices
-- 4. Enhance notify_new_event with safe publication window for upcoming campus events
-- 5. Centrally enforce notif_prefs (master pause & per-sector push toggle) in push_on_notification()

-- ── 1. Drop duplicate connection trigger ──
drop trigger if exists notify_connection_trg on public.connections;
drop function if exists public.notify_connection();

-- ── 2. Update notify_connection_event with notif_prefs guard ──
create or replace function public.notify_connection_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
  v_recipient uuid;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    v_recipient := new.addressee_id;

    -- Respect user notification preferences
    if exists (
      select 1 from public.notif_prefs
      where user_id = v_recipient
        and (
          (sector = '_paused' and enabled = true)
          or (sector = 'directory' and enabled = false)
        )
    ) then
      return new;
    end if;

    select full_name into v_actor_name from public.profiles where id = new.requester_id;
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    values (
      v_recipient,
      'directory',
      'Connection Request',
      coalesce(v_actor_name, 'A student') || ' sent you a connection request.',
      new.requester_id::text,
      'connection_request'
    );
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status = 'pending' then
    v_recipient := new.requester_id;

    -- Respect user notification preferences
    if exists (
      select 1 from public.notif_prefs
      where user_id = v_recipient
        and (
          (sector = '_paused' and enabled = true)
          or (sector = 'directory' and enabled = false)
        )
    ) then
      return new;
    end if;

    select full_name into v_actor_name from public.profiles where id = new.addressee_id;
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    values (
      v_recipient,
      'directory',
      'Connection Accepted',
      coalesce(v_actor_name, 'A student') || ' accepted your connection request.',
      new.addressee_id::text,
      'connection_accepted'
    );
  end if;
  return new;
end;
$$;

-- ── 3. Enhance notify_new_announcement for Universal Administrative Offices ──
create or replace function public.notify_new_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_universal boolean;
  v_is_recent boolean;
begin
  -- 1. Deliver notifications for notices published within 48 hours (covers weekends/off-hours crawling)
  v_is_recent := (coalesce(new.created_at, now()) >= (now() - interval '48 hours'));
  if not v_is_recent then
    return new;
  end if;

  -- 2. Administrative offices publish university-wide circulars for ALL students
  v_is_universal := (
    new.department is null
    or trim(new.department) = ''
    or new.department in (
      'All', 'University-Wide', 'Administration', 'ALL', 'General',
      'Office of the Registrar', 'Controller of Examinations',
      'Office of the Vice Chancellor', 'Proctor Office', 'Library',
      'Medical Center', 'Accounts Office', 'Career Guidance & Placement Office'
    )
    or coalesce(new.department_code, 'ALL') in ('ALL', 'All', 'REG', 'EXAM', 'VC', 'PROCTOR', 'LIB', 'MED', 'ACC', 'CGPO')
    or new.department ilike '%Registrar%'
    or new.department ilike '%Examination%'
    or new.department ilike '%Administration%'
    or new.department ilike '%Vice Chancellor%'
  );

  if v_is_universal then
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    select p.id, 'announce', new.title, left(coalesce(new.body, ''), 120), new.code, 'announcement'
    from public.profiles p
    where p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
    on conflict do nothing;
  else
    -- For department-specific circulars, also include students with unassigned/null department
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    select p.id, 'announce', new.title, left(coalesce(new.body, ''), 120), new.code, 'announcement'
    from public.profiles p
    where p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
      and (
        p.department is null
        or trim(p.department) = ''
        or p.department ilike '%' || new.department || '%'
        or new.department ilike '%' || p.department || '%'
        or (new.department_code is not null and p.department ilike '%' || new.department_code || '%')
      )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- ── 4. Enhance notify_new_event for upcoming campus events ──
create or replace function public.notify_new_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_recent boolean;
begin
  -- 1. Never notify for past events
  if (new.date < current_date) then
    return new;
  end if;

  -- 2. Only notify for events created within the last 7 days
  v_is_recent := (coalesce(new.created_at, now()) >= (now() - interval '7 days'));
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

-- ── 5. Centrally enforce notif_prefs in push_on_notification() ──
create or replace function public.push_on_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'net'
as $$
declare
  v_secret text;
begin
  -- Check if user has globally paused notifications OR muted this specific sector's push channel
  if exists (
    select 1 from public.notif_prefs
    where user_id = new.user_id
      and (
        (sector = '_paused' and enabled = true)
        or (sector = new.sector and (enabled = false or push = false))
      )
  ) then
    return new;
  end if;

  select value into v_secret from public.app_config where key = 'push_secret';

  perform net.http_post(
    url := 'https://xhgpxvyqrufbbuivttmi.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZ3B4dnlxcnVmYmJ1aXZ0dG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTkxNTIsImV4cCI6MjA5NTk5NTE1Mn0.hjKh52Svwou5xZCvDic-WLkpGCFfuGWdDksIy4vUXcs',
      'x-push-secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object(
      'user_id',        new.user_id,
      'title',          new.title,
      'body',           new.body,
      'sector',         new.sector,
      'reference_id',   new.reference_id,
      'reference_type', new.reference_type
    )
  );
  return new;
end;
$$;

revoke execute on function public.push_on_notification() from public, anon;
grant execute on function public.push_on_notification() to postgres;

