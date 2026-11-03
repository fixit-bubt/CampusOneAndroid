-- Clean up duplicate and broken calendar documents
DELETE FROM public.academic_calendar
WHERE file_url IS NOT NULL;

-- Insert verified, distinct 4-year academic calendar documents with precise chronological dates (Fall 2026 first)
INSERT INTO public.academic_calendar (
  id,
  title,
  description,
  file_url,
  file_type,
  semester,
  is_active,
  event_date,
  event_type,
  created_at
) VALUES
  (
    '00000000-0000-4000-a000-000000260905'::uuid,
    'Fall 2026 Academic Calendar',
    'Official BUBT Academic Calendar for Fall 2026 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-fall-2026.pdf',
    'pdf',
    'Fall 2026',
    true,
    '2026-09-05',
    'general',
    '2026-09-01T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000260506'::uuid,
    'Summer 2026 Academic Calendar',
    'Official BUBT Academic Calendar for Summer 2026 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2026.pdf',
    'pdf',
    'Summer 2026',
    false,
    '2026-05-06',
    'general',
    '2026-05-01T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000260110'::uuid,
    'Spring 2026 Academic Calendar',
    'Official BUBT Academic Calendar for Spring 2026 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-spring-2026.pdf',
    'pdf',
    'Spring 2026',
    false,
    '2026-01-10',
    'general',
    '2026-01-05T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000250906'::uuid,
    'Fall 2025 Academic Calendar (Revised)',
    'Official BUBT Academic Calendar for Fall 2025 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-fall-2025.pdf',
    'pdf',
    'Fall 2025',
    false,
    '2025-09-06',
    'general',
    '2025-09-01T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000250507'::uuid,
    'Summer 2025 Academic Calendar',
    'Official BUBT Academic Calendar for Summer 2025 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2025.pdf',
    'pdf',
    'Summer 2025',
    false,
    '2025-05-07',
    'general',
    '2025-05-01T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000250111'::uuid,
    'Spring 2025 Academic Calendar',
    'Official BUBT Academic Calendar for Spring 2025 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-spring-2025.pdf',
    'pdf',
    'Spring 2025',
    false,
    '2025-01-11',
    'general',
    '2025-01-05T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000240907'::uuid,
    'Fall 2024 Academic Calendar',
    'Official BUBT Academic Calendar for Fall 2024 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-fall-2024.pdf',
    'pdf',
    'Fall 2024',
    false,
    '2024-09-07',
    'general',
    '2024-09-01T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000240508'::uuid,
    'Summer 2024 Academic Calendar',
    'Official BUBT Academic Calendar for Summer 2024 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2024.pdf',
    'pdf',
    'Summer 2024',
    false,
    '2024-05-08',
    'general',
    '2024-05-01T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000240113'::uuid,
    'Spring 2024 Academic Calendar',
    'Official BUBT Academic Calendar for Spring 2024 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-spring-2024.pdf',
    'pdf',
    'Spring 2024',
    false,
    '2024-01-13',
    'general',
    '2024-01-05T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000230909'::uuid,
    'Fall 2023 Academic Calendar',
    'Official BUBT Academic Calendar for Fall 2023 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-fall-2023.pdf',
    'pdf',
    'Fall 2023',
    false,
    '2023-09-09',
    'general',
    '2023-09-01T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000230510'::uuid,
    'Summer 2023 Academic Calendar',
    'Official BUBT Academic Calendar for Summer 2023 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2023.pdf',
    'pdf',
    'Summer 2023',
    false,
    '2023-05-10',
    'general',
    '2023-05-01T00:00:00Z'
  ),
  (
    '00000000-0000-4000-a000-000000230114'::uuid,
    'Spring 2023 Academic Calendar',
    'Official BUBT Academic Calendar for Spring 2023 Semester · Registrar Office',
    'https://campusonebubt.vercel.app/bubt-academic-calendar-spring-2023.pdf',
    'pdf',
    'Spring 2023',
    false,
    '2023-01-14',
    'general',
    '2023-01-05T00:00:00Z'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  file_url = EXCLUDED.file_url,
  file_type = EXCLUDED.file_type,
  semester = EXCLUDED.semester,
  is_active = EXCLUDED.is_active,
  event_date = EXCLUDED.event_date,
  created_at = EXCLUDED.created_at;
