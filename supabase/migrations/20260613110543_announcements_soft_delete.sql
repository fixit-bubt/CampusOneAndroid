-- BACKFILL (2026-08-08): applied live 2026-06-13, never had a file in this
-- repo until now. Exact original SQL from schema_migrations.statements —
-- see 20260612133457_notifications_and_prefs.sql for the full backfill note.

-- Soft-delete column to match the app's announcements list (filters deleted_at
-- IS NULL) and admin delete (sets deleted_at), consistent with reports/jobs/listings.
alter table public.announcements add column if not exists deleted_at timestamptz;
