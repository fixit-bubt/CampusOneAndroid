-- BACKFILL (2026-08-08): applied live 2026-07-23, never had a file in this
-- repo until now. Exact original SQL from schema_migrations.statements —
-- see 20260612133457_notifications_and_prefs.sql for the full backfill note.

-- The connections INSERT policy verified the addressee with a plain subquery
-- against profiles. That subquery runs as the caller, so profiles RLS
-- (self / admin / lost-found-matched only) hid every other student's row and
-- the EXISTS was always false — no student could ever send a connection
-- request. Route the check through a SECURITY DEFINER helper instead, the same
-- way student_directory() already reads the roster.

create or replace function public.is_directory_student(p uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles x
    where x.id = p and x.role = 'student' and x.directory_visible = true
  );
$$;

revoke all on function public.is_directory_student(uuid) from public;
revoke all on function public.is_directory_student(uuid) from anon;
grant execute on function public.is_directory_student(uuid) to authenticated;

drop policy if exists connections_insert on public.connections;
create policy connections_insert on public.connections
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and requester_id <> addressee_id
    and public.is_directory_student((select auth.uid()))
    and public.is_directory_student(addressee_id)
  );
