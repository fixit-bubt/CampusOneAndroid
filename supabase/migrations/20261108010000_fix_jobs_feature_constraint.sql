-- Migration 20261108010000: Fix crawler_audit_logs feature constraint (missing 'jobs')
--
-- The crawler_audit_logs.feature CHECK constraint was missing 'jobs'.
-- Calling bubt-crawler?feature=jobs would throw a constraint violation and crash.

alter table public.crawler_audit_logs
  drop constraint if exists crawler_audit_logs_feature_check;

alter table public.crawler_audit_logs
  add constraint crawler_audit_logs_feature_check
  check (feature in ('all', 'notices', 'events', 'faculty', 'routines', 'calendar', 'bus', 'jobs'));
