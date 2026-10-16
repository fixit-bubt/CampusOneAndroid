-- Migration: 20261025020000_seed_more_sections.sql
-- Description: Additional routine and exam slots for CSE 51-3, EEE 48-1, and BBA 50-1

INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  -- CSE 51-3
  ('CSE', '51', '3', 'Fall 2026', 'SAT', '09:45 AM to 11:15 AM', 1, 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '3', 'Fall 2026', 'SAT', '11:15 AM to 12:45 PM', 2, 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '3', 'Fall 2026', 'MON', '09:45 AM to 11:15 AM', 1, 'CSE 477', 'Computer Graphics', 'TAB', '2909', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '3', 'Fall 2026', 'MON', '11:15 AM to 12:45 PM', 2, 'CSE 478', 'Computer Graphics Lab', 'TAB', '2517', 'Building-2: Martyr Sujan Mahmud Building'),
  ('CSE', '51', '3', 'Fall 2026', 'WED', '01:15 PM to 02:45 PM', 3, 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building'),

  -- EEE 48-1
  ('EEE', '48', '1', 'Fall 2026', 'SUN', '09:45 AM to 11:15 AM', 1, 'EEE 311', 'Power Systems I', 'MKH', '3402', 'Building-3: Martyr Tahmid Abdullah Building'),
  ('EEE', '48', '1', 'Fall 2026', 'SUN', '11:15 AM to 12:45 PM', 2, 'EEE 313', 'Digital Signal Processing', 'RKI', '3402', 'Building-3: Martyr Tahmid Abdullah Building'),
  ('EEE', '48', '1', 'Fall 2026', 'TUE', '01:15 PM to 02:45 PM', 3, 'EEE 311', 'Power Systems I', 'MKH', '3402', 'Building-3: Martyr Tahmid Abdullah Building'),

  -- BBA 50-1
  ('BBA', '50', '1', 'Fall 2026', 'SAT', '09:45 AM to 11:15 AM', 1, 'MKT 301', 'Principles of Marketing', 'MZH', '1302', 'Building 1 (Main Building)'),
  ('BBA', '50', '1', 'Fall 2026', 'SAT', '11:15 AM to 12:45 PM', 2, 'FIN 301', 'Corporate Finance', 'SMA', '1302', 'Building 1 (Main Building)'),
  ('BBA', '50', '1', 'Fall 2026', 'MON', '09:45 AM to 11:15 AM', 1, 'MGT 301', 'Organizational Behavior', 'TNA', '1302', 'Building 1 (Main Building)')
ON CONFLICT DO NOTHING;

INSERT INTO public.exam_slots (department, intake, section, semester, exam_date, day_of_week, shift, time_range, course_code, course_title, teacher_short_code, room, building, seat_range)
VALUES
  ('CSE', '51', '3', 'Fall 2026', '2026-10-25', 'SUN', 'Shift 1', '09:30 AM to 11:30 AM', 'CSE 465', 'Compiler Design', 'FJA', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 091 - 135'),
  ('CSE', '51', '3', 'Fall 2026', '2026-10-29', 'THU', 'Shift 1', '09:30 AM to 11:30 AM', 'CSE 467', 'Advanced Database Systems', 'SHD', '2909', 'Building-2: Martyr Sujan Mahmud Building', 'Roll: 091 - 135'),
  ('EEE', '48', '1', 'Fall 2026', '2026-10-26', 'MON', 'Shift 2', '01:30 PM to 03:30 PM', 'EEE 311', 'Power Systems I', 'MKH', '3402', 'Building-3: Martyr Tahmid Abdullah Building', 'Roll: 001 - 040'),
  ('BBA', '50', '1', 'Fall 2026', '2026-10-28', 'WED', 'Shift 1', '09:30 AM to 11:30 AM', 'MKT 301', 'Principles of Marketing', 'MZH', '1302', 'Building 1 (Main Building)', 'Roll: 001 - 050')
ON CONFLICT DO NOTHING;
