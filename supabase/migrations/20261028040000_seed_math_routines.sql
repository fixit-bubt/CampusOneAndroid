-- Migration: 20261028040000_seed_math_routines.sql
-- Description: Adds official Master Class and Exam Routine documents for Mathematics & Statistics department.

INSERT INTO public.routines (type, title, department, semester, file_url, content_hash)
VALUES
  ('class', 'Mathematics & Statistics Class Routine Fall 2026', 'Mathematics & Statistics', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/class-routines/Class_Schedule_Summer_2026.pdf', 'hash-math-class-fall-2026'),
  ('exam', 'Mathematics & Statistics Mid-Term & Final Examination Schedule Fall 2026', 'Mathematics & Statistics', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/exam-routine/summer-2026/mid-term-exam/Day(Revised).pdf', 'hash-math-exam-fall-2026')
ON CONFLICT (content_hash) DO NOTHING;

