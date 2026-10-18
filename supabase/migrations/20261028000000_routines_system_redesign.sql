-- Migration: 20261028000000_routines_system_redesign.sql
-- Description: Unlocks public read access for routines, routine_slots, and exam_slots,
-- ensuring both guest (anon) and authenticated students can access all routine datasets.

-- 1. Grant SELECT privileges on routines tables
GRANT SELECT ON public.routines TO anon, authenticated;
GRANT SELECT ON public.routine_slots TO anon, authenticated;
GRANT SELECT ON public.exam_slots TO anon, authenticated;

-- 2. Clean and standardize Row Level Security policies
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_read_routines" ON public.routines;
DROP POLICY IF EXISTS "routines_anon_select" ON public.routines;
CREATE POLICY "anyone_read_routines" ON public.routines FOR SELECT USING (true);

ALTER TABLE public.routine_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_read_routine_slots" ON public.routine_slots;
CREATE POLICY "anyone_read_routine_slots" ON public.routine_slots FOR SELECT USING (true);

ALTER TABLE public.exam_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_read_exam_slots" ON public.exam_slots;
CREATE POLICY "anyone_read_exam_slots" ON public.exam_slots FOR SELECT USING (true);
