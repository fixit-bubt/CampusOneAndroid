-- BACKFILL (2026-08-08): applied live 2026-06-13, never had a file in this
-- repo until now. Exact original SQL from schema_migrations.statements —
-- see 20260612133457_notifications_and_prefs.sql for the full backfill note.

-- The app posts club updates with an optional title (body-only allowed), so
-- allow NULL. The char_length(title) >= 1 CHECK already passes for NULL.
alter table public.club_posts alter column title drop not null;
