-- ============================================================================
-- FixIt — Migration 20261019000000: Announcements 360 & Automated BUBT Sync
-- ----------------------------------------------------------------------------
-- 1. Adds source, category, category_slug, department_code, external_id, external_url
--    to public.announcements.
-- 2. Creates announcement_bookmarks table for student saved/pinned circulars.
-- 3. Creates notice_sync_logs table for automated crawl audits.
-- 4. Updates notify_new_announcement() trigger for department-targeted alerts.
-- ============================================================================

-- 1. Schema Additions on public.announcements
alter table public.announcements
  add column if not exists source text not null default 'manual',
  add column if not exists category text,
  add column if not exists category_slug text,
  add column if not exists department_code text default 'ALL',
  add column if not exists external_id text,
  add column if not exists external_url text,
  add column if not exists deleted_at timestamptz;

-- Index for source and category queries
create index if not exists announcements_source_idx on public.announcements (source);
create index if not exists announcements_category_idx on public.announcements (category);
create index if not exists announcements_dept_code_idx on public.announcements (department_code);
create index if not exists announcements_external_id_idx on public.announcements (external_id);

-- 2. announcement_bookmarks table
create table if not exists public.announcement_bookmarks (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

create index if not exists announcement_bookmarks_user_idx on public.announcement_bookmarks (user_id);
create index if not exists announcement_bookmarks_announcement_idx on public.announcement_bookmarks (announcement_id);

revoke all on public.announcement_bookmarks from anon;
alter table public.announcement_bookmarks enable row level security;

grant select, insert, delete on public.announcement_bookmarks to authenticated;

drop policy if exists announcement_bookmarks_select on public.announcement_bookmarks;
create policy announcement_bookmarks_select on public.announcement_bookmarks
  for select to authenticated using (user_id = auth.uid());

drop policy if exists announcement_bookmarks_insert on public.announcement_bookmarks;
create policy announcement_bookmarks_insert on public.announcement_bookmarks
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists announcement_bookmarks_delete on public.announcement_bookmarks;
create policy announcement_bookmarks_delete on public.announcement_bookmarks
  for delete to authenticated using (user_id = auth.uid());

-- 3. notice_sync_logs table
create table if not exists public.notice_sync_logs (
  id                  uuid primary key default gen_random_uuid(),
  triggered_by        text not null default 'admin',
  status              text not null default 'running' check (status in ('running', 'success', 'failed')),
  total_scanned       integer not null default 0,
  new_added           integer not null default 0,
  updated_count       integer not null default 0,
  details             jsonb default '{}'::jsonb,
  error_message       text,
  duration_ms         integer,
  created_at          timestamptz not null default now()
);

create index if not exists notice_sync_logs_created_idx on public.notice_sync_logs (created_at desc);

revoke all on public.notice_sync_logs from anon;
alter table public.notice_sync_logs enable row level security;

drop policy if exists notice_sync_logs_admin_all on public.notice_sync_logs;
create policy notice_sync_logs_admin_all on public.notice_sync_logs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.notice_sync_logs to authenticated;

-- 4. Smart Department-Aware Push Notification Function
create or replace function public.notify_new_announcement()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_universal boolean;
begin
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
    where p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
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
      );
  end if;

  return new;
end;
$$;
