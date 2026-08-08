-- `routines` had a `routines_anon_select` policy granting SELECT to the
-- `anon` role -- unauthenticated users could read all routine data,
-- inconsistent with every other table in this app (all gated `to
-- authenticated`). No code path in the app or the AI chatbot relies on
-- unauthenticated access to routines. Drop the anon policy; the existing
-- `anyone_read_routines` policy (to authenticated, using true) already
-- covers every logged-in user, so this only removes the logged-out case.

drop policy if exists routines_anon_select on public.routines;
revoke select on public.routines from anon;
