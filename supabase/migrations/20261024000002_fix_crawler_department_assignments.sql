-- Migration: 20261024000002_fix_crawler_department_assignments.sql
-- Description: Corrects misassigned department rows in routines and announcements,
-- heals truncated event description, and marks historical events beyond 120-day cutoff as deleted.

-- 1. Correct Law & Justice and Business routines misassigned under EEE and Textile
UPDATE public.routines
SET department = 'Law & Justice'
WHERE (title ILIKE '%LL. B%' OR title ILIKE '%LL.M%' OR title ILIKE '%Law & Justice%')
  AND (department IS NULL OR department = 'Electrical & Electronic Engineering');

UPDATE public.routines
SET department = 'Faculty of Business'
WHERE title = 'Class Schedule Summer 2026'
  AND department = 'Textile Engineering';

-- 2. Correct misassigned announcements
UPDATE public.announcements
SET department = 'Law & Justice',
    department_code = 'Law',
    updated_at = now()
WHERE code = 'BUBT-N-1552';

UPDATE public.announcements
SET department = 'Faculty of Business',
    department_code = 'BBA',
    updated_at = now()
WHERE code IN ('BUBT-N-1494', 'BUBT-N-1495', 'BUBT-N-1493');

-- 3. Heal truncated event description for Civil Club executive committee
UPDATE public.events
SET title = 'Congratulations to the Newly Elected Executive Committee | BUBT Civil Club 2026',
    description = 'The Civil Engineering Department, BUBT, extends its heartfelt congratulations to the newly elected Executive Committee Members of the BUBT Civil Club 2026. Your dedication, enthusiasm, and leadership qualities have made this achievement possible. We believe that under your leadership, the club will continue to grow and contribute positively to both the department and the student community.',
    updated_at = now()
WHERE code = 'EVT-congratulationstothe-f8eb1b'
  AND length(description) < 200;

-- 4. Mark any historical events older than 120 days as deleted so app feeds omit them
UPDATE public.events
SET deleted_at = now()
WHERE date < (current_date - interval '120 days')
  AND deleted_at IS NULL;

