-- Migration: 20261018000000_faculty_360_enhancements.sql
-- Description:
-- 1. Adds institutional fields to public.faculty: short_code (routine initial),
--    room_number, building, floor, counseling_hours, blood_group, scopus_url,
--    and is_accepting_research flag.
-- 2. Creates faculty_sync_logs table for automated crawl audits.
-- 3. Adds indexes for fast initial code search and research discovery.

-- 1. Schema Additions on public.faculty
alter table public.faculty
  add column if not exists short_code text,
  add column if not exists room_number text,
  add column if not exists building text,
  add column if not exists floor text,
  add column if not exists counseling_hours text,
  add column if not exists blood_group text,
  add column if not exists scopus_url text,
  add column if not exists is_accepting_research boolean not null default true;

create index if not exists faculty_short_code_idx on public.faculty (lower(short_code));

-- 2. Audit Table for Automated Scraper Syncs
create table if not exists public.faculty_sync_logs (
  id                  uuid primary key default gen_random_uuid(),
  triggered_by        text not null default 'admin',
  status              text not null default 'running' check (status in ('running', 'success', 'failed')),
  total_scanned       integer not null default 0,
  new_added           integer not null default 0,
  promotions_updated  integer not null default 0,
  photos_updated      integer not null default 0,
  details             jsonb default '{}'::jsonb,
  error_message       text,
  duration_ms         integer,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz
);

revoke all on public.faculty_sync_logs from anon;
alter table public.faculty_sync_logs enable row level security;

-- Admin can read/manage sync logs
create policy faculty_sync_logs_admin_all on public.faculty_sync_logs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.faculty_sync_logs to authenticated;

-- 3. Initial Known Short Codes & Room Assignments
update public.faculty
set short_code = 'DALM',
    building = 'Building 2',
    room_number = '405',
    floor = '4th Floor',
    counseling_hours = 'Sun & Tue: 11:30 AM - 1:00 PM | Thu: 2:00 PM - 3:30 PM',
    blood_group = 'AB+'
where name ilike '%Ahmed Al Mansur%';

update public.faculty
set short_code = 'SR',
    building = 'Building 2',
    room_number = '301',
    floor = '3rd Floor',
    counseling_hours = 'Sun, Mon, Wed: 10:00 AM - 11:30 AM'
where name ilike '%Saifur Rahman%';

update public.faculty
set short_code = 'SAM',
    building = 'Building 2',
    room_number = '308',
    floor = '3rd Floor',
    counseling_hours = 'Mon & Wed: 12:00 PM - 1:30 PM'
where name ilike '%Shamim Ahmed%';

update public.faculty
set short_code = 'MMA',
    building = 'Building 2',
    room_number = '302',
    floor = '3rd Floor',
    counseling_hours = 'Sun & Tue: 2:00 PM - 3:30 PM'
where name ilike '%Aminur Rahaman%';

