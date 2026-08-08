-- 0081 backfill: `routines` table exists on the live database but has no
-- migration anywhere in this repo (predates migration discipline, or was
-- created directly via SQL editor). Without this file, a fresh DB build from
-- migrations alone is missing the table entirely — RoutinesBrowseScreen and
-- the AI chatbot's get_routines tool would break on a new environment.
--
-- Written from the LIVE schema (introspected via `supabase db query --linked`
-- against information_schema/pg_constraint/pg_policies/grants on 2026-08-08),
-- not guessed. Every statement is idempotent (`if not exists` / duplicate-safe
-- exception blocks) so this is a no-op against the current production DB —
-- it only matters for rebuilding from scratch.
--
-- NOTE (not changed here, just documented): `routines_anon_select` grants
-- SELECT to the `anon` role — unauthenticated users can read all routine
-- rows including file_url. Every other table in this app uses `to
-- authenticated`. Left as-is since routine PDFs (department/semester/section
-- + a file link, no student PII) are plausibly meant to be publicly
-- shareable — flag for a product decision, not silently tightened here.

create table if not exists public.routines (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('class', 'exam')),
  title        text not null,
  department   text,
  semester     text,
  intake       text,
  section      text,
  file_url     text,
  image_url    text,
  published_by uuid references auth.users (id),
  created_at   timestamptz default now()
);

create index if not exists routines_published_by_idx on public.routines (published_by);

alter table public.routines enable row level security;

do $$ begin
  create policy routines_anon_select on public.routines
    for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy anyone_read_routines on public.routines
    for select to public using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy staff_admin_insert_routines on public.routines
    for insert to public
    with check (exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin', 'staff'])
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy staff_admin_update_routines on public.routines
    for update to public
    using (exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin', 'staff'])
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy staff_admin_delete_routines on public.routines
    for delete to public
    using (exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = any (array['admin', 'staff'])
    ));
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on public.routines to authenticated;
