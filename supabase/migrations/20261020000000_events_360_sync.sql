-- ============================================================================
-- FixIt — Migration 20261020000000: Events 360 & Automated BUBT Sync Engine
-- ----------------------------------------------------------------------------
-- 1. Adds source, external_id, external_url, tags, deleted_at to public.events.
-- 2. Creates event_bookmarks table for student saved campus events.
-- 3. Creates event_sync_logs table for automated crawl audits.
-- 4. Creates notify_new_event() trigger for campus-wide event alerts.
-- 5. Creates bookmark_event RPC for atomic saved event toggles.
-- ============================================================================

-- 1. Schema Additions on public.events
alter table public.events
  add column if not exists source text not null default 'manual',
  add column if not exists external_id text,
  add column if not exists external_url text,
  add column if not exists tags text[] default '{}'::text[],
  add column if not exists deleted_at timestamptz;

-- Indexing for performance
create index if not exists events_source_idx on public.events (source);
create index if not exists events_external_id_idx on public.events (external_id);
create index if not exists events_date_idx on public.events (date);
create index if not exists events_club_id_idx on public.events (club_id);
create index if not exists events_deleted_at_idx on public.events (deleted_at);

-- 2. event_bookmarks table
create table if not exists public.event_bookmarks (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists event_bookmarks_user_idx on public.event_bookmarks (user_id);
create index if not exists event_bookmarks_event_idx on public.event_bookmarks (event_id);

revoke all on public.event_bookmarks from anon;
alter table public.event_bookmarks enable row level security;

grant select, insert, delete on public.event_bookmarks to authenticated;

drop policy if exists event_bookmarks_select on public.event_bookmarks;
create policy event_bookmarks_select on public.event_bookmarks
  for select to authenticated using (user_id = auth.uid());

drop policy if exists event_bookmarks_insert on public.event_bookmarks;
create policy event_bookmarks_insert on public.event_bookmarks
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists event_bookmarks_delete on public.event_bookmarks;
create policy event_bookmarks_delete on public.event_bookmarks
  for delete to authenticated using (user_id = auth.uid());

-- 3. event_sync_logs table
create table if not exists public.event_sync_logs (
  id            uuid primary key default gen_random_uuid(),
  triggered_by  text not null default 'cron' check (triggered_by in ('cron', 'manual', 'admin')),
  status        text not null default 'running' check (status in ('running', 'success', 'failed')),
  total_scanned integer not null default 0,
  new_added     integer not null default 0,
  updated_count integer not null default 0,
  details       jsonb default '{}'::jsonb,
  error_message text,
  duration_ms   integer,
  created_at    timestamptz not null default now()
);

create index if not exists event_sync_logs_created_idx on public.event_sync_logs (created_at desc);

revoke all on public.event_sync_logs from anon;
alter table public.event_sync_logs enable row level security;

drop policy if exists event_sync_logs_admin_all on public.event_sync_logs;
create policy event_sync_logs_admin_all on public.event_sync_logs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.event_sync_logs to authenticated;

-- 4. Smart Push Notification Trigger for New Campus Events
create or replace function public.notify_new_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Only notify for newly active events
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
    where p.id != coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.notify_new_event() from public, anon;
grant execute on function public.notify_new_event() to authenticated, service_role;

drop trigger if exists trg_notify_new_event on public.events;
create trigger trg_notify_new_event
  after insert on public.events
  for each row
  execute function public.notify_new_event();

-- 5. Atomic Event Bookmark Toggle RPC
create or replace function public.toggle_event_bookmark(p_event_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists  boolean;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select exists(
    select 1 from public.event_bookmarks
    where user_id = v_user_id and event_id = p_event_id
  ) into v_exists;

  if v_exists then
    delete from public.event_bookmarks
    where user_id = v_user_id and event_id = p_event_id;
    return false;
  else
    insert into public.event_bookmarks (user_id, event_id)
    values (v_user_id, p_event_id)
    on conflict do nothing;
    return true;
  end if;
end;
$$;

revoke execute on function public.toggle_event_bookmark(uuid) from public, anon;
grant execute on function public.toggle_event_bookmark(uuid) to authenticated;
