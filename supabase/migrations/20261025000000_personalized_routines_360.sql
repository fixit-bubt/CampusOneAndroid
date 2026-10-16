-- Migration: 20261025000000_personalized_routines_360.sql
-- Description: Interactive visual routine timetable grid, personalized exam grid,
-- and custom retake/improvement course bindings.

-- 1. Routine Slots Table (Class Schedules)
CREATE TABLE IF NOT EXISTS public.routine_slots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department          text NOT NULL,                 -- e.g. 'CSE'
  intake              text NOT NULL,                 -- e.g. '51'
  section             text NOT NULL,                 -- e.g. '2'
  semester            text DEFAULT 'Fall 2026',
  day_of_week         text NOT NULL CHECK (day_of_week IN ('SAT', 'SUN', 'MON', 'TUE', 'WED', 'THR', 'FRI')),
  time_slot           text NOT NULL,                 -- e.g. '08:15 AM to 09:45 AM'
  slot_index          integer NOT NULL CHECK (slot_index >= 0 AND slot_index <= 5),
  course_code         text NOT NULL,                 -- e.g. 'CSE 467'
  course_title        text,                          -- e.g. 'Advanced Database Management'
  teacher_short_code  text,                          -- e.g. 'SHD'
  room                text NOT NULL,                 -- e.g. '2909'
  building            text DEFAULT 'Building 2: Martyr Sujan Mahmud Building',
  is_lab              boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Index for instant lookup of a section's full weekly timetable
CREATE INDEX IF NOT EXISTS routine_slots_lookup_idx
  ON public.routine_slots (department, intake, section, day_of_week, slot_index);

CREATE INDEX IF NOT EXISTS routine_slots_course_idx
  ON public.routine_slots (course_code, department);

-- 2. User Custom Retake/Improvement Course Slots
CREATE TABLE IF NOT EXISTS public.user_custom_routine_slots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id             uuid NOT NULL REFERENCES public.routine_slots(id) ON DELETE CASCADE,
  created_at          timestamptz DEFAULT now(),
  CONSTRAINT user_custom_routine_slots_unique UNIQUE (user_id, slot_id)
);

CREATE INDEX IF NOT EXISTS user_custom_routine_slots_user_idx
  ON public.user_custom_routine_slots (user_id);

-- 3. Exam Timetable Grid Slots
CREATE TABLE IF NOT EXISTS public.exam_slots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department          text NOT NULL,                 -- e.g. 'CSE'
  intake              text NOT NULL,                 -- e.g. '51'
  section             text NOT NULL,                 -- e.g. '2'
  semester            text DEFAULT 'Fall 2026',
  exam_date           date NOT NULL,                 -- e.g. '2026-10-25'
  day_of_week         text NOT NULL,                 -- e.g. 'SUN'
  shift               text NOT NULL CHECK (shift IN ('Shift 1', 'Shift 2', 'Shift 3')),
  time_range          text NOT NULL,                 -- e.g. '09:30 AM to 11:30 AM'
  course_code         text NOT NULL,                 -- e.g. 'CSE 467'
  course_title        text,
  teacher_short_code  text,
  room                text NOT NULL,                 -- e.g. '2909'
  building            text DEFAULT 'Building 2: Martyr Sujan Mahmud Building',
  seat_range          text,                          -- e.g. 'Roll: 001 - 045'
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exam_slots_lookup_idx
  ON public.exam_slots (department, intake, section, exam_date, shift);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.routine_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_routine_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_slots ENABLE ROW LEVEL SECURITY;

-- Policies for routine_slots
DROP POLICY IF EXISTS "anyone_read_routine_slots" ON public.routine_slots;
CREATE POLICY "anyone_read_routine_slots" ON public.routine_slots
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_admin_manage_routine_slots" ON public.routine_slots;
CREATE POLICY "staff_admin_manage_routine_slots" ON public.routine_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'staff')
    )
  );

-- Policies for user_custom_routine_slots
DROP POLICY IF EXISTS "users_manage_own_custom_slots" ON public.user_custom_routine_slots;
CREATE POLICY "users_manage_own_custom_slots" ON public.user_custom_routine_slots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for exam_slots
DROP POLICY IF EXISTS "anyone_read_exam_slots" ON public.exam_slots;
CREATE POLICY "anyone_read_exam_slots" ON public.exam_slots
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_admin_manage_exam_slots" ON public.exam_slots;
CREATE POLICY "staff_admin_manage_exam_slots" ON public.exam_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'staff')
    )
  );

-- 5. Seed Real BUBT Schedule Data (Matching User's Official Routine)
-- CSE Intake 51 - Section 2
INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  -- Monday
  ('CSE', '51', '2', 'Fall 2026', 'MON', '01:15 PM to 02:45 PM', 3, 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '2', 'Fall 2026', 'MON', '02:45 PM to 04:15 PM', 4, 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '2', 'Fall 2026', 'MON', '04:15 PM to 05:45 PM', 5, 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building'),
  -- Tuesday
  ('CSE', '51', '2', 'Fall 2026', 'TUE', '02:45 PM to 04:15 PM', 4, 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '2', 'Fall 2026', 'TUE', '04:15 PM to 05:45 PM', 5, 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  -- Wednesday
  ('CSE', '51', '2', 'Fall 2026', 'WED', '01:15 PM to 02:45 PM', 3, 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '2', 'Fall 2026', 'WED', '02:45 PM to 04:15 PM', 4, 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '2', 'Fall 2026', 'WED', '04:15 PM to 05:45 PM', 5, 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  
  -- CSE Intake 57 - Section 4 (The Retake / Junior Section)
  ('CSE', '57', '4', 'Fall 2026', 'SUN', '08:15 AM to 09:45 AM', 0, 'PHY 101', 'Physics I (Mechanics & Waves)', 'MDAK', '2906', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '57', '4', 'Fall 2026', 'THR', '11:15 AM to 12:45 PM', 2, 'PHY 101', 'Physics I (Mechanics & Waves)', 'MDAK', '5602', 'Building-5: Campus 2'),
  ('CSE', '57', '4', 'Fall 2026', 'THR', '01:15 PM to 02:45 PM', 3, 'PHY 101', 'Physics I (Mechanics & Waves)', 'MDAK', '5602', 'Building-5: Campus 2'),

  -- CSE Intake 57 - Section 2 (Alternative retake section that has a clash on Monday)
  ('CSE', '57', '2', 'Fall 2026', 'MON', '01:15 PM to 02:45 PM', 3, 'PHY 101', 'Physics I (Mechanics & Waves)', 'MDAK', '2908', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '57', '2', 'Fall 2026', 'WED', '01:15 PM to 02:45 PM', 3, 'PHY 101', 'Physics I (Mechanics & Waves)', 'MDAK', '2908', 'Building-2: Martyr Sujan Mahmud Building'),

  -- CSE Intake 51 - Section 1
  ('CSE', '51', '1', 'Fall 2026', 'SAT', '09:45 AM to 11:15 AM', 1, 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '1', 'Fall 2026', 'SAT', '11:15 AM to 12:45 PM', 2, 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '1', 'Fall 2026', 'MON', '09:45 AM to 11:15 AM', 1, 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building')
ON CONFLICT DO NOTHING;

-- Seed Exam Slots for CSE 51-2 and CSE 57-4
INSERT INTO public.exam_slots (department, intake, section, semester, exam_date, day_of_week, shift, time_range, course_code, course_title, teacher_short_code, room, building, seat_range)
VALUES
  ('CSE', '51', '2', 'Fall 2026', '2026-10-25', 'SUN', 'Shift 1', '09:30 AM to 11:30 AM', 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 001 - 045'),
  ('CSE', '51', '2', 'Fall 2026', '2026-10-27', 'TUE', 'Shift 2', '01:30 PM to 03:30 PM', 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 001 - 045'),
  ('CSE', '51', '2', 'Fall 2026', '2026-10-29', 'THU', 'Shift 1', '09:30 AM to 11:30 AM', 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 001 - 045'),
  ('CSE', '51', '2', 'Fall 2026', '2026-11-01', 'SUN', 'Shift 2', '01:30 PM to 03:30 PM', 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 001 - 045'),
  
  -- Retake exam for Intake 57-4 PHY 101
  ('CSE', '57', '4', 'Fall 2026', '2026-11-03', 'TUE', 'Shift 1', '09:30 AM to 11:30 AM', 'PHY 101', 'Physics I (Mechanics & Waves)', 'MDAK', '5602', 'Building-5: Campus 2', 'Roll: 120 - 165')
ON CONFLICT DO NOTHING;
