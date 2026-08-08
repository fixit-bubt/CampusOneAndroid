-- BACKFILL (2026-08-08): applied live 2026-06-20, never had a file in this
-- repo until now. Exact original SQL from schema_migrations.statements —
-- see 20260612133457_notifications_and_prefs.sql for the full backfill note.
-- (Supersedes an earlier reverse-engineered attempt at capturing the
-- `routines` table from live introspection alone — this is the real thing.)
--
-- NOTE: live `routines` also carries a `routines_anon_select` policy
-- (SELECT to `anon`) and a `routines_published_by_idx` index that are NOT
-- part of this original migration — they were added separately later,
-- ad-hoc, with no tracked migration of their own. The index is redundant
-- with 0067_rls_initplan_and_intake_vote_scope.sql (which already creates
-- `routines_published_by_idx`). The anon-read policy is flagged separately
-- as a product decision (unauthenticated users can read routine data) —
-- not added here since this file should reflect the original migration
-- exactly, not the current live state.

-- Academic Calendar
CREATE TABLE academic_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  end_date date,
  event_type text NOT NULL DEFAULT 'general'
    CHECK (event_type IN ('holiday','exam','semester','general')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE academic_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_calendar" ON academic_calendar FOR SELECT USING (true);
CREATE POLICY "admin_manage_calendar" ON academic_calendar FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_update_calendar" ON academic_calendar FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_delete_calendar" ON academic_calendar FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Routines (class + exam)
CREATE TABLE routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('class','exam')),
  title text NOT NULL,
  department text,
  semester text,
  intake text,
  section text,
  file_url text,
  image_url text,
  published_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_routines" ON routines FOR SELECT USING (true);
CREATE POLICY "staff_admin_insert_routines" ON routines FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff')));
CREATE POLICY "staff_admin_update_routines" ON routines FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff')));
CREATE POLICY "staff_admin_delete_routines" ON routines FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff')));
