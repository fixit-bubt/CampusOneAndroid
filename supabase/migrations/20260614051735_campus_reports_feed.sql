-- BACKFILL (2026-08-08): applied live 2026-06-14, never had a file in this
-- repo until now. Exact original SQL from schema_migrations.statements —
-- see 20260612133457_notifications_and_prefs.sql for the full backfill note.

-- Campus-wide reports feed: lets students see everyone's (non-deleted) reports.
-- SECURITY DEFINER so it bypasses the owner-only reports_select RLS, but it
-- only ever exposes report fields + the reporter's display name (no contact).
create or replace function public.campus_reports(p_limit int default 200)
returns table (
  id uuid,
  code text,
  category text,
  description text,
  building text,
  room text,
  status text,
  reporter_id uuid,
  reporter_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.code, r.category, r.description, r.building, r.room, r.status,
         r.reporter_id, p.full_name as reporter_name, r.created_at
  from public.reports r
  left join public.profiles p on p.id = r.reporter_id
  where r.deleted_at is null
  order by r.created_at desc
  limit greatest(1, least(p_limit, 500));
$$;

grant execute on function public.campus_reports(int) to authenticated;
