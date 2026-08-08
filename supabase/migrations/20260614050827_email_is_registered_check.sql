-- BACKFILL (2026-08-08): applied live 2026-06-14, never had a file in this
-- repo until now. Exact original SQL from schema_migrations.statements —
-- see 20260612133457_notifications_and_prefs.sql for the full backfill note.

-- Lets the signup screen check (before calling auth.signUp) whether an email
-- already has an account, without exposing the profiles table via RLS.
create or replace function public.email_is_registered(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where lower(email) = lower(trim(p_email))
  );
$$;

grant execute on function public.email_is_registered(text) to anon, authenticated;
