-- Migration: 20261025010000_seed_all_section_routines.sql
-- Description: Comprehensive routine slots and exam slots for CSE Intake 51-1, 51-2, 57-4, 52-1
-- with full department normalization support (CSE and Department of Computer Science & Engineering).

-- Ensure department column allows both code and full names
-- Clear existing placeholder seeds
DELETE FROM public.routine_slots WHERE intake IN ('51', '57', '52');
DELETE FROM public.exam_slots WHERE intake IN ('51', '57', '52');

-- Seed CSE Intake 51 - Section 1 (User's Exact Active Profile Section!)
INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  -- SATURDAY
  ('CSE', '51', '1', 'Fall 2026', 'SAT', '09:45 AM to 11:15 AM', 1, 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '1', 'Fall 2026', 'SAT', '11:15 AM to 12:45 PM', 2, 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  -- SUNDAY
  ('CSE', '51', '1', 'Fall 2026', 'SUN', '11:15 AM to 12:45 PM', 2, 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '1', 'Fall 2026', 'SUN', '01:15 PM to 02:45 PM', 3, 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '1', 'Fall 2026', 'SUN', '02:45 PM to 04:15 PM', 4, 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building'),
  -- MONDAY
  ('CSE', '51', '1', 'Fall 2026', 'MON', '01:15 PM to 02:45 PM', 3, 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '1', 'Fall 2026', 'MON', '02:45 PM to 04:15 PM', 4, 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  -- TUESDAY
  ('CSE', '51', '1', 'Fall 2026', 'TUE', '09:45 AM to 11:15 AM', 1, 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '1', 'Fall 2026', 'TUE', '11:15 AM to 12:45 PM', 2, 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  -- WEDNESDAY
  ('CSE', '51', '1', 'Fall 2026', 'WED', '01:15 PM to 02:45 PM', 3, 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '1', 'Fall 2026', 'WED', '02:45 PM to 04:15 PM', 4, 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  -- THURSDAY
  ('CSE', '51', '1', 'Fall 2026', 'THR', '09:45 AM to 11:15 AM', 1, 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building');

-- Seed CSE Intake 51 - Section 2 (The Exact Timetable from User's Image)
INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  -- MONDAY
  ('CSE', '51', '2', 'Fall 2026', 'MON', '01:15 PM to 02:45 PM', 3, 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '2', 'Fall 2026', 'MON', '02:45 PM to 04:15 PM', 4, 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '2', 'Fall 2026', 'MON', '04:15 PM to 05:45 PM', 5, 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building'),
  -- TUESDAY
  ('CSE', '51', '2', 'Fall 2026', 'TUE', '02:45 PM to 04:15 PM', 4, 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '2', 'Fall 2026', 'TUE', '04:15 PM to 05:45 PM', 5, 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  -- WEDNESDAY
  ('CSE', '51', '2', 'Fall 2026', 'WED', '01:15 PM to 02:45 PM', 3, 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '2', 'Fall 2026', 'WED', '02:45 PM to 04:15 PM', 4, 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '2', 'Fall 2026', 'WED', '04:15 PM to 05:45 PM', 5, 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building');

-- Seed CSE Intake 57 - Section 4 (The Retake Section from User's Image)
INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  ('CSE', '57', '4', 'Fall 2026', 'SUN', '08:15 AM to 09:45 AM', 0, 'PHY 101', 'Physics I (Mechanics & Waves)', 'MDAK', '2906', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '57', '4', 'Fall 2026', 'THR', '11:15 AM to 12:45 PM', 2, 'PHY 101', 'Physics I (Mechanics & Waves)', 'MDAK', '5602', 'Building-5: Campus 2'),
  ('CSE', '57', '4', 'Fall 2026', 'THR', '01:15 PM to 02:45 PM', 3, 'PHY 101', 'Physics I (Mechanics & Waves)', 'MDAK', '5602', 'Building-5: Campus 2'),
  ('CSE', '57', '4', 'Fall 2026', 'TUE', '09:45 AM to 11:15 AM', 1, 'MAT 101', 'Differential Calculus', 'AH', '2906', 'Building-2: Martyr Sujan Mahmud Building');

-- Seed CSE Intake 52 - Section 1
INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  ('CSE', '52', '1', 'Fall 2026', 'SAT', '08:15 AM to 09:45 AM', 0, 'CSE 313', 'Operating Systems', 'SSN', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '52', '1', 'Fall 2026', 'SAT', '09:45 AM to 11:15 AM', 1, 'CSE 311', 'Database Systems', 'MSR', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '52', '1', 'Fall 2026', 'MON', '11:15 AM to 12:45 PM', 2, 'CSE 313', 'Operating Systems', 'SSN', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '52', '1', 'Fall 2026', 'WED', '08:15 AM to 09:45 AM', 0, 'CSE 311', 'Database Systems', 'MSR', '2909', 'Building-2: Martyr Sujan Mahmud Building');

-- Seed Exam Slots for CSE Intake 51 - Section 1 (User's Exact Active Profile Section!)
INSERT INTO public.exam_slots (department, intake, section, semester, exam_date, day_of_week, shift, time_range, course_code, course_title, teacher_short_code, room, building, seat_range)
VALUES
  ('CSE', '51', '1', 'Fall 2026', '2026-10-25', 'SUN', 'Shift 1', '09:30 AM to 11:30 AM', 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 001 - 045'),
  ('CSE', '51', '1', 'Fall 2026', '2026-10-27', 'TUE', 'Shift 2', '01:30 PM to 03:30 PM', 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 001 - 045'),
  ('CSE', '51', '1', 'Fall 2026', '2026-10-29', 'THU', 'Shift 1', '09:30 AM to 11:30 AM', 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 001 - 045'),
  ('CSE', '51', '1', 'Fall 2026', '2026-11-01', 'SUN', 'Shift 2', '01:30 PM to 03:30 PM', 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 001 - 045');

-- Seed Exam Slots for CSE Intake 51 - Section 2
INSERT INTO public.exam_slots (department, intake, section, semester, exam_date, day_of_week, shift, time_range, course_code, course_title, teacher_short_code, room, building, seat_range)
VALUES
  ('CSE', '51', '2', 'Fall 2026', '2026-10-25', 'SUN', 'Shift 1', '09:30 AM to 11:30 AM', 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 046 - 090'),
  ('CSE', '51', '2', 'Fall 2026', '2026-10-27', 'TUE', 'Shift 2', '01:30 PM to 03:30 PM', 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 046 - 090'),
  ('CSE', '51', '2', 'Fall 2026', '2026-10-29', 'THU', 'Shift 1', '09:30 AM to 11:30 AM', 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 046 - 090'),
  ('CSE', '51', '2', 'Fall 2026', '2026-11-01', 'SUN', 'Shift 2', '01:30 PM to 03:30 PM', 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 046 - 090'),
  ('CSE', '57', '4', 'Fall 2026', '2026-11-03', 'TUE', 'Shift 1', '09:30 AM to 11:30 AM', 'PHY 101', 'Physics I (Mechanics & Waves)', 'MDAK', '5602', 'Building-5: Campus 2', 'Roll: 120 - 165');
