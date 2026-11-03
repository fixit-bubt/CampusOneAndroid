-- Migration: 20261104010000_academic_calendar_documents.sql
-- Add document and archive fields to academic_calendar for simplified PDF/photo archive

alter table public.academic_calendar
  add column if not exists file_url text,
  add column if not exists file_type text default 'pdf',
  add column if not exists semester text,
  add column if not exists is_active boolean default false;

alter table public.academic_calendar
  alter column event_date set default current_date;

alter table public.academic_calendar
  alter column event_type set default 'general';

-- Index for fast ordering by created_at
create index if not exists academic_calendar_created_at_idx
  on public.academic_calendar (created_at desc);

-- Seed initial archive records with file_url
insert into public.academic_calendar (title, description, event_date, file_url, file_type, semester, is_active, event_type)
values
  ('Fall 2026 Academic Calendar', 'Official BUBT Academic Calendar for Fall 2026 Semester', '2026-09-05', 'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2026.pdf', 'pdf', 'Fall 2026', true, 'general'),
  ('Summer 2026 Academic Calendar', 'Official BUBT Academic Calendar for Summer 2026 Semester', '2026-05-06', 'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2026.pdf', 'pdf', 'Summer 2026', false, 'general'),
  ('Spring 2026 Academic Calendar', 'Official BUBT Academic Calendar for Spring 2026 Semester', '2026-01-10', 'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2026.pdf', 'pdf', 'Spring 2026', false, 'general')
on conflict do nothing;

