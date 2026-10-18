-- Migration: 20261028010000_seed_all_departments_routines.sql
-- Description: Comprehensive master routine PDFs and section timetables for all university departments
-- covering CSE, EEE, BBA, English, Law, Civil, Textile, and Economics for Fall 2026.

-- 1. Master Departmental Routine Documents (PDFs)
INSERT INTO public.routines (type, title, department, semester, file_url, content_hash)
VALUES
  -- CSE Master Routines
  ('class', 'CSE Class Routine Fall 2026 (All Intakes & Sections)', 'Computer Science & Engineering', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/class-routines/2026/fall/cse/CSE-Class-Routine-Fall-2026.pdf', 'hash-cse-class-fall-2026'),
  ('exam', 'CSE Mid-Term & Final Examination Routine Fall 2026', 'Computer Science & Engineering', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/exam-routine/summer-2026/mid-term-exam/CSE-Midterm-Exam-Routine-Fall-2026.pdf', 'hash-cse-exam-fall-2026'),
  
  -- EEE Master Routines
  ('class', 'EEE Full Department Class Routine Fall 2026', 'Electrical & Electronic Engineering', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/class-routines/2026/summer/EEE/day/EEE-Day-43-Intake-Section1-Class-routine-Summer-2026.pdf', 'hash-eee-class-fall-2026'),
  ('exam', 'EEE Mid-Term & Final Examination Schedule Fall 2026', 'Electrical & Electronic Engineering', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/exam-routine/summer-2026/mid-term-exam/EEE-Midterm-Exam-Routine-Summer-2026.pdf', 'hash-eee-exam-fall-2026'),

  -- BBA / Faculty of Business
  ('class', 'Faculty of Business (BBA & MBA) Class Routine Fall 2026', 'Faculty of Business', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/class-routines/Class_Schedule_Summer_2026.pdf', 'hash-bba-class-fall-2026'),
  ('exam', 'Faculty of Business Examination Routine Fall 2026', 'Faculty of Business', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/exam-routine/summer-2026/mid-term-exam/BBA(Revised).pdf', 'hash-bba-exam-fall-2026'),

  -- Department of English
  ('class', 'Department of English BA (Hons) Class Routine Fall 2026', 'Department of English', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/class-routines/2026/fall/english/English-Class-Routine-Fall-2026.pdf', 'hash-eng-class-fall-2026'),
  ('exam', 'Department of English Examination Schedule Fall 2026', 'Department of English', 'Fall 2026', 'https://www.bubt.edu.bd/uploads/Viva_Schedule_B__A_(Hons)_in_English_Program_Fall_2025_bb.pdf', 'hash-eng-exam-fall-2026'),

  -- Law & Justice
  ('class', 'Department of Law & Justice Class Routine Fall 2026', 'Law & Justice', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/class-routines/2026/fall/law/Fall-2026-Routine-LLB-Honours.pdf', 'hash-law-class-fall-2026'),
  ('exam', 'Department of Law Examination Schedule Fall 2026', 'Law & Justice', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/exam-routine/summer-2026/law/final-exam/Final-Exam-Routine_LLB-(Hons)-Bi-Semester.pdf', 'hash-law-exam-fall-2026'),

  -- Civil Engineering
  ('class', 'Civil Engineering (CE) Class Routine Fall 2026', 'Civil Engineering', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/Class_Routine_CE_Evening_2026.pdf', 'hash-ce-class-fall-2026'),
  ('exam', 'Civil Engineering Examination Schedule Fall 2026', 'Civil Engineering', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/exam-routine/summer-2026/mid-term-exam/Day(Revised).pdf', 'hash-ce-exam-fall-2026'),

  -- Textile Engineering
  ('class', 'Textile Engineering Class Routine Fall 2026', 'Textile Engineering', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/class-routines/2026/summer/textile/Class-Routine-Day-Summer-2026.pdf', 'hash-te-class-fall-2026'),
  ('exam', 'Textile Engineering Examination Schedule Fall 2026', 'Textile Engineering', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/exam-routine/summer-2026/mid-term-exam/Evening(NB).pdf', 'hash-te-exam-fall-2026'),

  -- Economics
  ('class', 'Department of Economics Class Routine Fall 2026', 'Economics', 'Fall 2026', 'https://www.bubt.edu.bd/assets/frontend/uploads/class-routines/2026/fall/economics/Economics-Class-Routine-Fall-2026.pdf', 'hash-econ-class-fall-2026'),
  ('exam', 'Department of Economics Examination Schedule Fall 2026', 'Economics', 'Fall 2026', 'https://www.bubt.edu.bd/uploads/Viva_Voce_Examination_Schedule_of_B__Sc__(Hons)_in_Economics_Program_Fall_2025_bb.pdf', 'hash-econ-exam-fall-2026')
ON CONFLICT (content_hash) DO NOTHING;

-- 2. Additional Section Class Timetable Slots (routine_slots)
-- Law Intake 56 Section 1
INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  ('Law', '56', '1', 'Fall 2026', 'SAT', '09:45 AM to 11:15 AM', 1, 'LAW 101', 'Jurisprudence & Legal Theory', 'AKM', '4201', 'Building 4: Law & Humanities'),
  ('Law', '56', '1', 'Fall 2026', 'SAT', '11:15 AM to 12:45 PM', 2, 'LAW 103', 'Law of Contract', 'MSH', '4201', 'Building 4: Law & Humanities'),
  ('Law', '56', '1', 'Fall 2026', 'MON', '09:45 AM to 11:15 AM', 1, 'LAW 105', 'Constitutional Law of Bangladesh', 'FAT', '4201', 'Building 4: Law & Humanities'),
  ('Law', '56', '1', 'Fall 2026', 'WED', '11:15 AM to 12:45 PM', 2, 'LAW 103', 'Law of Contract', 'MSH', '4201', 'Building 4: Law & Humanities');

-- English Intake 44 Section 1
INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  ('English', '44', '1', 'Fall 2026', 'SUN', '09:45 AM to 11:15 AM', 1, 'ENG 201', 'Introduction to Linguistics', 'NHR', '4302', 'Building 4: Law & Humanities'),
  ('English', '44', '1', 'Fall 2026', 'SUN', '11:15 AM to 12:45 PM', 2, 'ENG 203', '16th & 17th Century Poetry', 'MZA', '4302', 'Building 4: Law & Humanities'),
  ('English', '44', '1', 'Fall 2026', 'TUE', '01:15 PM to 02:45 PM', 3, 'ENG 205', 'Shakespearean Drama', 'SBA', '4302', 'Building 4: Law & Humanities');

-- Civil Intake 37 Section 1
INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  ('Civil', '37', '1', 'Fall 2026', 'SAT', '08:15 AM to 09:45 AM', 0, 'CE 311', 'Structural Analysis & Design I', 'MZI', '3501', 'Building-3: Engineering Block'),
  ('Civil', '37', '1', 'Fall 2026', 'SAT', '09:45 AM to 11:15 AM', 1, 'CE 313', 'Geotechnical Engineering I', 'KRM', '3501', 'Building-3: Engineering Block'),
  ('Civil', '37', '1', 'Fall 2026', 'MON', '11:15 AM to 12:45 PM', 2, 'CE 315', 'Transportation Engineering', 'THS', '3501', 'Building-3: Engineering Block');

-- Textile Intake 40 Section 1
INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  ('Textile', '40', '1', 'Fall 2026', 'SUN', '09:45 AM to 11:15 AM', 1, 'TE 301', 'Fabric Manufacturing II', 'JHM', '3601', 'Building-3: Engineering Block'),
  ('Textile', '40', '1', 'Fall 2026', 'SUN', '11:15 AM to 12:45 PM', 2, 'TE 303', 'Yarn Manufacturing II', 'SHK', '3601', 'Building-3: Engineering Block'),
  ('Textile', '40', '1', 'Fall 2026', 'WED', '01:15 PM to 02:45 PM', 3, 'TE 305', 'Wet Processing Technology II', 'RKM', '3601', 'Building-3: Engineering Block');

-- Economics Intake 22 Section 1
INSERT INTO public.routine_slots (department, intake, section, semester, day_of_week, time_slot, slot_index, course_code, course_title, teacher_short_code, room, building)
VALUES
  ('Economics', '22', '1', 'Fall 2026', 'SAT', '09:45 AM to 11:15 AM', 1, 'ECO 201', 'Intermediate Microeconomics', 'SZA', '1402', 'Building 1 (Main Building)'),
  ('Economics', '22', '1', 'Fall 2026', 'SAT', '11:15 AM to 12:45 PM', 2, 'ECO 203', 'Mathematical Economics', 'MRT', '1402', 'Building 1 (Main Building)'),
  ('Economics', '22', '1', 'Fall 2026', 'TUE', '09:45 AM to 11:15 AM', 1, 'ECO 205', 'Development Economics', 'KHB', '1402', 'Building 1 (Main Building)');

-- 3. Additional Section Exam Slots (exam_slots)
INSERT INTO public.exam_slots (department, intake, section, semester, exam_date, day_of_week, shift, time_range, course_code, course_title, teacher_short_code, room, building, seat_range)
VALUES
  ('Law', '56', '1', 'Fall 2026', '2026-10-25', 'SUN', 'Shift 1', '09:30 AM to 11:30 AM', 'LAW 101', 'Jurisprudence & Legal Theory', 'AKM', '4201', 'Building 4: Law & Humanities', 'Roll: 001 - 045'),
  ('Law', '56', '1', 'Fall 2026', '2026-10-28', 'WED', 'Shift 2', '01:30 PM to 03:30 PM', 'LAW 103', 'Law of Contract', 'MSH', '4201', 'Building 4: Law & Humanities', 'Roll: 001 - 045'),
  ('English', '44', '1', 'Fall 2026', '2026-10-26', 'MON', 'Shift 1', '09:30 AM to 11:30 AM', 'ENG 201', 'Introduction to Linguistics', 'NHR', '4302', 'Building 4: Law & Humanities', 'Roll: 001 - 040'),
  ('Civil', '37', '1', 'Fall 2026', '2026-10-27', 'TUE', 'Shift 1', '09:30 AM to 11:30 AM', 'CE 311', 'Structural Analysis & Design I', 'MZI', '3501', 'Building-3: Engineering Block', 'Roll: 001 - 050'),
  ('Textile', '40', '1', 'Fall 2026', '2026-10-28', 'WED', 'Shift 2', '01:30 PM to 03:30 PM', 'TE 301', 'Fabric Manufacturing II', 'JHM', '3601', 'Building-3: Engineering Block', 'Roll: 001 - 045'),
  ('Economics', '22', '1', 'Fall 2026', '2026-10-29', 'THU', 'Shift 1', '09:30 AM to 11:30 AM', 'ECO 201', 'Intermediate Microeconomics', 'SZA', '1402', 'Building 1 (Main Building)', 'Roll: 001 - 040');
