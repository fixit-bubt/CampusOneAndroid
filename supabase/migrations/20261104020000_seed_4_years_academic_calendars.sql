-- Migration: 20261104020000_seed_4_years_academic_calendars.sql
-- Seed complete 4-year archive of official BUBT Academic Calendars (2023 - 2026)

insert into public.academic_calendar (title, description, event_date, file_url, file_type, semester, is_active, event_type)
values
  -- 2026 Semesters
  ('Fall 2026 Academic Calendar', 'Official BUBT Academic Calendar for Fall 2026 Semester', '2026-09-05', 'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2026.pdf', 'pdf', 'Fall 2026', true, 'general'),
  ('Summer 2026 Academic Calendar', 'Official BUBT Academic Calendar for Summer 2026 Semester', '2026-05-06', 'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2026.pdf', 'pdf', 'Summer 2026', false, 'general'),
  ('Spring 2026 Academic Calendar', 'Official BUBT Academic Calendar for Spring 2026 Semester', '2026-01-10', 'https://www.bubt.edu.bd/uploads/notice/academic_calendar_spring_2026.pdf', 'pdf', 'Spring 2026', false, 'general'),

  -- 2025 Semesters
  ('Fall 2025 Academic Calendar (Revised)', 'Official BUBT Academic Calendar for Fall 2025 Semester', '2025-09-06', 'https://www.bubt.edu.bd/uploads/notice/academic_calendar_fall_2025_revised.pdf', 'pdf', 'Fall 2025', false, 'general'),
  ('Summer 2025 Academic Calendar', 'Official BUBT Academic Calendar for Summer 2025 Semester', '2025-05-07', 'https://www.bubt.edu.bd/uploads/notice/academic_calendar_summer_2025.pdf', 'pdf', 'Summer 2025', false, 'general'),
  ('Spring 2025 Academic Calendar', 'Official BUBT Academic Calendar for Spring 2025 Semester', '2025-01-11', 'https://www.bubt.edu.bd/uploads/notice/academic_calendar_spring_2025.pdf', 'pdf', 'Spring 2025', false, 'general'),

  -- 2024 Semesters
  ('Fall 2024 Academic Calendar', 'Official BUBT Academic Calendar for Fall 2024 Semester', '2024-09-07', 'https://www.bubt.edu.bd/uploads/notice/academic_calendar_fall_2024.pdf', 'pdf', 'Fall 2024', false, 'general'),
  ('Summer 2024 Academic Calendar', 'Official BUBT Academic Calendar for Summer 2024 Semester', '2024-05-08', 'https://www.bubt.edu.bd/uploads/notice/academic_calendar_summer_2024.pdf', 'pdf', 'Summer 2024', false, 'general'),
  ('Spring 2024 Academic Calendar', 'Official BUBT Academic Calendar for Spring 2024 Semester', '2024-01-13', 'https://www.bubt.edu.bd/uploads/notice/academic_calendar_spring_2024.pdf', 'pdf', 'Spring 2024', false, 'general'),

  -- 2023 Semesters
  ('Fall 2023 Academic Calendar', 'Official BUBT Academic Calendar for Fall 2023 Semester', '2023-09-09', 'https://www.bubt.edu.bd/uploads/notice/academic_calendar_fall_2023.pdf', 'pdf', 'Fall 2023', false, 'general'),
  ('Summer 2023 Academic Calendar', 'Official BUBT Academic Calendar for Summer 2023 Semester', '2023-05-10', 'https://www.bubt.edu.bd/uploads/notice/academic_calendar_summer_2023.pdf', 'pdf', 'Summer 2023', false, 'general'),
  ('Spring 2023 Academic Calendar', 'Official BUBT Academic Calendar for Spring 2023 Semester', '2023-01-14', 'https://www.bubt.edu.bd/uploads/notice/academic_calendar_spring_2023.pdf', 'pdf', 'Spring 2023', false, 'general')
on conflict do nothing;
