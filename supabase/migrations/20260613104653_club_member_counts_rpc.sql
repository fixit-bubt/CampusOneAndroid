-- BACKFILL (2026-08-08): applied live 2026-06-13, never had a file in this
-- repo until now (this is the exact RPC the 2026-06-19 audit doc flagged as
-- "exists in live DB but is in no migration file" -- confirmed still true,
-- now fixed). Exact original SQL from schema_migrations.statements — see
-- 20260612133457_notifications_and_prefs.sql for the full backfill note.

-- Accurate per-club member counts for the browse list. SECURITY DEFINER so a
-- non-member student sees the real count (the club_members RLS select policy
-- otherwise hides rows of clubs they haven't joined, yielding 0).
create or replace function public.club_member_counts()
returns table(club_id uuid, members bigint)
language sql
security definer
set search_path = public
as $$
  select cm.club_id, count(*)::bigint
  from club_members cm
  group by cm.club_id;
$$;

revoke all on function public.club_member_counts() from public;
grant execute on function public.club_member_counts() to authenticated;
