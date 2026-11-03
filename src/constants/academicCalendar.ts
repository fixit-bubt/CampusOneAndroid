export interface AcademicCalendarDoc {
  id: string;
  title: string;
  description?: string | null;
  file_url: string;
  file_type: 'pdf' | 'image';
  semester?: string | null;
  is_active?: boolean;
  event_date?: string;
  created_at?: string;
}

export const OFFICIAL_CALENDAR_DOCS: AcademicCalendarDoc[] = [
  // 2026
  {
    id: '00000000-0000-4000-a000-000000260905',
    title: 'Fall 2026 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Fall 2026 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-fall-2026.pdf',
    file_type: 'pdf',
    semester: 'Fall 2026',
    is_active: true,
    event_date: '2026-09-05',
    created_at: '2026-09-01T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000260506',
    title: 'Summer 2026 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Summer 2026 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2026.pdf',
    file_type: 'pdf',
    semester: 'Summer 2026',
    is_active: false,
    event_date: '2026-05-06',
    created_at: '2026-05-01T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000260110',
    title: 'Spring 2026 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Spring 2026 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-spring-2026.pdf',
    file_type: 'pdf',
    semester: 'Spring 2026',
    is_active: false,
    event_date: '2026-01-10',
    created_at: '2026-01-05T00:00:00Z',
  },
  // 2025
  {
    id: '00000000-0000-4000-a000-000000250906',
    title: 'Fall 2025 Academic Calendar (Revised)',
    description: 'Official BUBT Academic Calendar for Fall 2025 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-fall-2025.pdf',
    file_type: 'pdf',
    semester: 'Fall 2025',
    is_active: false,
    event_date: '2025-09-06',
    created_at: '2025-09-01T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000250507',
    title: 'Summer 2025 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Summer 2025 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2025.pdf',
    file_type: 'pdf',
    semester: 'Summer 2025',
    is_active: false,
    event_date: '2025-05-07',
    created_at: '2025-05-01T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000250111',
    title: 'Spring 2025 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Spring 2025 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-spring-2025.pdf',
    file_type: 'pdf',
    semester: 'Spring 2025',
    is_active: false,
    event_date: '2025-01-11',
    created_at: '2025-01-05T00:00:00Z',
  },
  // 2024
  {
    id: '00000000-0000-4000-a000-000000240907',
    title: 'Fall 2024 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Fall 2024 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-fall-2024.pdf',
    file_type: 'pdf',
    semester: 'Fall 2024',
    is_active: false,
    event_date: '2024-09-07',
    created_at: '2024-09-01T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000240508',
    title: 'Summer 2024 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Summer 2024 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2024.pdf',
    file_type: 'pdf',
    semester: 'Summer 2024',
    is_active: false,
    event_date: '2024-05-08',
    created_at: '2024-05-01T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000240113',
    title: 'Spring 2024 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Spring 2024 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-spring-2024.pdf',
    file_type: 'pdf',
    semester: 'Spring 2024',
    is_active: false,
    event_date: '2024-01-13',
    created_at: '2024-01-05T00:00:00Z',
  },
  // 2023
  {
    id: '00000000-0000-4000-a000-000000230909',
    title: 'Fall 2023 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Fall 2023 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-fall-2023.pdf',
    file_type: 'pdf',
    semester: 'Fall 2023',
    is_active: false,
    event_date: '2023-09-09',
    created_at: '2023-09-01T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000230510',
    title: 'Summer 2023 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Summer 2023 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-summer-2023.pdf',
    file_type: 'pdf',
    semester: 'Summer 2023',
    is_active: false,
    event_date: '2023-05-10',
    created_at: '2023-05-01T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000230114',
    title: 'Spring 2023 Academic Calendar',
    description: 'Official BUBT Academic Calendar for Spring 2023 Semester · Registrar Office',
    file_url: 'https://campusonebubt.vercel.app/bubt-academic-calendar-spring-2023.pdf',
    file_type: 'pdf',
    semester: 'Spring 2023',
    is_active: false,
    event_date: '2023-01-14',
    created_at: '2023-01-05T00:00:00Z',
  },
];
