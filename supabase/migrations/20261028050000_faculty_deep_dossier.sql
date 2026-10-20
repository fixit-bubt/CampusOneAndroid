-- Migration: 20261028050000_faculty_deep_dossier.sql
-- Description:
-- 1. Adds rich academic columns to public.faculty:
--    courses_taught (active BUBT course codes & titles),
--    teaching_areas (teaching specializations),
--    publications (structured journal & IEEE conference papers),
--    cell_phone (direct contact/WhatsApp),
--    personal_email,
--    academic_activities (curriculum/OBE development),
--    industrial_experience,
--    departmental_profile_url (direct link to departmental WordPress/subdomain profile).
-- 2. Creates GIN indexes for fast course-code and teaching-area search.
-- 3. Seeds verified deep dossier records across departments (EEE, CSE, Civil, Textile, Law, English, BBA, Math).

-- 1. Schema Additions
alter table public.faculty
  add column if not exists courses_taught text[] not null default '{}',
  add column if not exists teaching_areas text[] not null default '{}',
  add column if not exists publications jsonb not null default '[]'::jsonb,
  add column if not exists cell_phone text,
  add column if not exists personal_email text,
  add column if not exists academic_activities text[] not null default '{}',
  add column if not exists industrial_experience text,
  add column if not exists departmental_profile_url text;

-- 2. Indexes for High-Speed Subject & Routine Code Search
create index if not exists faculty_courses_gin on public.faculty using gin (courses_taught);
create index if not exists faculty_teaching_areas_gin on public.faculty using gin (teaching_areas);

-- 3. Deep Dossier Seeds for Verified Faculty Across Departments

-- ── EEE: Md. Ashik Khan (MDAK) ────────────────────────────────────────────────
update public.faculty
set short_code = 'MDAK',
    cell_phone = '+880 1885539040',
    phone = coalesce(phone, '+880 1885539040'),
    personal_email = 'mdashikkhan.eee17@gmail.com',
    departmental_profile_url = 'https://eee.bubt.edu.bd/faculty-members/md-ashik-khan',
    profile_url = 'https://www.bubt.edu.bd/department/department-of-electrical-electronic-engineering/faculty/profile/MDAK',
    blood_group = 'AB+',
    building = 'Building 2',
    room_number = '406',
    floor = '4th Floor',
    counseling_hours = 'Sun & Tue: 10:00 AM - 11:30 AM | Wed: 2:00 PM - 3:30 PM',
    qualifications = '["B.Sc. in Electrical & Electronic Engineering (2022), Islamic University of Technology (IUT)", "Higher Secondary Certificate (HSC) in Science, Dhaka (2017)", "Secondary School Certificate (SSC) in Science, Dhaka (2015)"]'::jsonb,
    teaching_areas = array['Mechatronics', 'Electronics', 'Power Electronics'],
    research_interests = array['DC-DC Converter & Optimization Algorithm', 'PID Controller', 'Control System', 'Power Electronics'],
    courses_taught = array[
      'MT 201 – Mechatronics Circuit & Systems',
      'EEE 207 – Electronics 2',
      'EEE 208 – Electronics Lab',
      'EEE 377 – Power Electronics',
      'EEE 378 – Power Electronics Lab'
    ],
    academic_activities = array['Teaching and Research', 'Development of OBE System'],
    industrial_experience = 'Industrial Training at Bangladesh Power Development Board (BPDB) and Olympic Industries Ltd.',
    publications = '[
      {
        "title": "Optimal Control and Performance Enhancement of DC-DC Bidirectional SEPIC Converter",
        "venue": "2022 IEEE 13th Annual Ubiquitous Computing, Electronics Mobile Communication Conference (UEMCON), New York, USA",
        "year": "2022",
        "doi": "10.1109/UEMCON54665.2022.9965670",
        "authors": "A. J. Mahmud, M. H. Mithun, M. A. Khan, F. Faisal, M. M. Nishat, M. A. Hoque"
      },
      {
        "title": "Firefly Algorithm Based Optimized PID Controller for Stability Analysis of DC-DC SEPIC Converter",
        "venue": "IEEE International Conference on Power and Energy Systems",
        "year": "2022",
        "authors": "M. R. K. Shagor, A. J. Mahmud, M. M. Nishat, F. Faisal, M. H. Mithun, M. A. Khan"
      }
    ]'::jsonb
where name ilike '%Ashik Khan%';

-- ── EEE: Prof. Dr. Ahmed Al Mansur (DALM) ────────────────────────────────────
update public.faculty
set short_code = 'DALM',
    departmental_profile_url = 'https://eee.bubt.edu.bd/faculty-members/prof-dr-ahmed-al-mansur',
    profile_url = 'https://www.bubt.edu.bd/department/department-of-electrical-electronic-engineering/faculty/profile/DALM',
    building = 'Building 2',
    room_number = '405',
    floor = '4th Floor',
    blood_group = 'AB+',
    counseling_hours = 'Sun & Tue: 11:30 AM - 1:00 PM | Thu: 2:00 PM - 3:30 PM',
    teaching_areas = array['Renewable Energy Systems', 'Power Electronics', 'Electrical Circuits'],
    courses_taught = array[
      'EEE 101 – Electrical Circuits 1',
      'EEE 471 – Renewable Energy Technology',
      'EEE 400 – Capstone Project / Thesis'
    ],
    publications = '[
      {
        "title": "A comprehensive review on maximum power point tracking algorithms for photovoltaic systems",
        "venue": "Energy Reports (Elsevier)",
        "year": "2021",
        "authors": "Ahmed Al Mansur et al."
      }
    ]'::jsonb
where name ilike '%Ahmed Al Mansur%';

-- ── CSE: Md. Saifur Rahman (SR) ──────────────────────────────────────────────
update public.faculty
set short_code = 'SR',
    profile_url = 'https://www.bubt.edu.bd/department/department-of-computer-science-engineering/faculty/profile/SR',
    building = 'Building 2',
    room_number = '301',
    floor = '3rd Floor',
    counseling_hours = 'Sun, Mon, Wed: 10:00 AM - 11:30 AM',
    teaching_areas = array['Software Engineering', 'System Analysis & Design', 'Database Systems', 'Object Oriented Programming'],
    courses_taught = array[
      'CSE 315 – Software Engineering',
      'CSE 316 – Software Engineering Lab',
      'CSE 205 – Object Oriented Programming',
      'CSE 400 – Final Year Thesis & Capstone Project'
    ]
where name ilike '%Saifur Rahman%' and designation ilike '%Assistant Professor%';

-- ── CSE: Shamim Ahmed (SAM) ──────────────────────────────────────────────────
update public.faculty
set short_code = 'SAM',
    profile_url = 'https://www.bubt.edu.bd/department/department-of-computer-science-engineering/faculty/profile/SAM',
    building = 'Building 2',
    room_number = '308',
    floor = '3rd Floor',
    counseling_hours = 'Mon & Wed: 12:00 PM - 1:30 PM',
    teaching_areas = array['Artificial Intelligence', 'Computer Vision', 'Machine Learning', 'Deep Learning'],
    courses_taught = array[
      'CSE 417 – Artificial Intelligence',
      'CSE 418 – Artificial Intelligence Lab',
      'CSE 421 – Computer Vision & Image Processing',
      'CSE 400 – Research Thesis Guidance'
    ]
where name ilike '%Shamim Ahmed%';

-- ── Civil: Prof. Dr. Syed Abdul Mofiz (DSAM) ─────────────────────────────────
update public.faculty
set short_code = 'DSAM',
    profile_url = 'https://www.bubt.edu.bd/department/department-of-civil-engineering/faculty/profile/DSAM',
    building = 'Building 3',
    room_number = '501',
    floor = '5th Floor',
    teaching_areas = array['Geotechnical Engineering', 'Soil Mechanics', 'Foundation Engineering'],
    courses_taught = array[
      'CE 341 – Geotechnical Engineering 1',
      'CE 342 – Geotechnical Engineering Lab',
      'CE 441 – Foundation Engineering'
    ]
where name ilike '%Abdul Mofiz%';

-- ── Textile: Mohammad Mahmudur Rahman Khan (MDR) ─────────────────────────────
update public.faculty
set short_code = 'MDR',
    profile_url = 'https://www.bubt.edu.bd/department/department-of-textile-engineering/faculty/profile/MDR',
    building = 'Building 3',
    room_number = '402',
    floor = '4th Floor',
    teaching_areas = array['Yarn Manufacturing', 'Textile Raw Materials', 'Quality Control in Textile'],
    courses_taught = array[
      'TEX 201 – Yarn Manufacturing 1',
      'TEX 202 – Yarn Manufacturing Lab 1',
      'TEX 305 – Textile Testing & Quality Control'
    ]
where name ilike '%Mahmudur Rahman Khan%';

-- ── Law: Dr. Md. Muhibullah (DMMH) ───────────────────────────────────────────
update public.faculty
set short_code = 'DMMH',
    profile_url = 'https://www.bubt.edu.bd/department/department-of-law-justice/faculty/profile/DMMH',
    building = 'Building 1',
    room_number = '304',
    floor = '3rd Floor',
    teaching_areas = array['Jurisprudence', 'Constitutional Law', 'Human Rights Law'],
    courses_taught = array[
      'LAW 101 – Jurisprudence and Legal Theory',
      'LAW 203 – Constitutional Law of Bangladesh',
      'LAW 301 – Human Rights & International Law'
    ]
where name ilike '%Muhibullah%';

-- ── English: Md. Reza Hassan Khan (RH) ────────────────────────────────────────
update public.faculty
set short_code = 'RH',
    profile_url = 'https://www.bubt.edu.bd/department/department-of-english/faculty/profile/RH',
    building = 'Building 1',
    room_number = '401',
    floor = '4th Floor',
    teaching_areas = array['English Literature', 'Applied Linguistics', 'Academic Writing'],
    courses_taught = array[
      'ENG 101 – Foundation English',
      'ENG 201 – History of English Literature',
      'ENG 305 – Modern English Poetry'
    ]
where name ilike '%Reza Hassan Khan%';

-- ── Management: Thawhidul Kabir (MTK) ────────────────────────────────────────
update public.faculty
set short_code = 'MTK',
    profile_url = 'https://www.bubt.edu.bd/department/department-of-management/faculty/profile/MTK',
    building = 'Building 4',
    room_number = '201',
    floor = '2nd Floor',
    teaching_areas = array['Principles of Management', 'Human Resource Management', 'Strategic Management'],
    courses_taught = array[
      'MGT 101 – Principles of Management',
      'MGT 201 – Human Resource Management',
      'MGT 401 – Strategic Management'
    ]
where name ilike '%Thawhidul Kabir%';

-- ── Mathematics & Statistics: Dr. Md. Abdul Hye (ABH) ────────────────────────
update public.faculty
set short_code = 'ABH',
    profile_url = 'https://www.bubt.edu.bd/department/department-of-mathematics-statistics/faculty/profile/ABH',
    building = 'Building 2',
    room_number = '502',
    floor = '5th Floor',
    teaching_areas = array['Differential Calculus', 'Linear Algebra', 'Numerical Analysis'],
    courses_taught = array[
      'MAT 101 – Differential & Integral Calculus',
      'MAT 103 – Coordinate Geometry & Linear Algebra',
      'MAT 205 – Ordinary Differential Equations'
    ]
where name ilike '%Abdul Hye%';
