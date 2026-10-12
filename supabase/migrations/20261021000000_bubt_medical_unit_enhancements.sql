-- ============================================================================
-- FixIt / CampusOne — Migration 20261021000000: BUBT Medical Unit 360 Enhancements
-- ----------------------------------------------------------------------------
-- 1. Adds qualifications, phone, email, role_type, is_on_leave, leave_note to public.doctors.
-- 2. Seeds authentic BUBT Health & Community Development staff (Room 205, Bldg 3).
-- 3. Updates existing visiting doctor records with qualifications and phone extensions.
-- 4. Preserves zero-bloat schema while empowering the student medical experience.
-- ============================================================================

-- 1. Schema Additions
alter table public.doctors
  add column if not exists qualifications text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists role_type text not null default 'doctor',
  add column if not exists is_on_leave boolean not null default false,
  add column if not exists leave_note text;

-- Add check constraint safely for role_type if not exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'doctors_role_type_check'
  ) then
    alter table public.doctors
      add constraint doctors_role_type_check
      check (role_type in ('doctor', 'psychologist', 'nurse', 'staff'));
  end if;
end $$;

-- 2. Seed / Upsert Official BUBT Medical Unit Team (Room 205, Building 3)
insert into public.doctors (
  id, name, specialty, qualifications, days, start_time, end_time, room, phone, email, role_type, is_on_leave, active
) values
  (
    'd_bubt_1',
    'Dr. Nurun Nabi Md Mustafa Kamal',
    'Senior Medical Officer',
    'MBBS',
    '{Sun,Mon,Tue,Wed,Thu}',
    '09:00',
    '17:00',
    'Room 205, 1st Floor, Building 3',
    'Ext. 112',
    'medical@bubt.edu.bd',
    'doctor',
    false,
    true
  ),
  (
    'd_bubt_2',
    'Dr. Ekra Binte Musa',
    'Medical Officer',
    'MBBS',
    '{Sun,Mon,Tue,Wed,Thu}',
    '09:00',
    '17:00',
    'Room 205, 1st Floor, Building 3',
    'Ext. 112',
    'medical@bubt.edu.bd',
    'doctor',
    false,
    true
  ),
  (
    'd_bubt_3',
    'Mou Juliet Rebeiro',
    'Campus Psychologist',
    'M.Sc in Psychology · Mental Health & Well-being',
    '{Sun,Mon,Tue,Wed,Thu}',
    '10:00',
    '16:00',
    'Room 205, 1st Floor, Building 3',
    'Ext. 112',
    'moujuliet@bubt.edu.bd',
    'psychologist',
    false,
    true
  ),
  (
    'd_bubt_4',
    'Room 205 Nursing & Triage Desk',
    'First Aid & Vital Signs',
    'Nursing Staff · Smriti Akter / Nasima Khatun',
    '{Sun,Mon,Tue,Wed,Thu}',
    '09:00',
    '17:00',
    'Room 205, 1st Floor, Building 3',
    'Ext. 112',
    'medical@bubt.edu.bd',
    'nurse',
    false,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  specialty = excluded.specialty,
  qualifications = excluded.qualifications,
  days = excluded.days,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  room = excluded.room,
  phone = excluded.phone,
  email = excluded.email,
  role_type = excluded.role_type,
  active = excluded.active;

-- 3. Enhance Visiting Consultant Doctors with Qualifications & Phone
update public.doctors
set
  qualifications = coalesce(qualifications, 'MBBS, BCS (Health)'),
  phone = coalesce(phone, 'Ext. 112'),
  email = coalesce(email, 'medical@bubt.edu.bd'),
  role_type = 'doctor'
where id = 'd1';

update public.doctors
set
  qualifications = coalesce(qualifications, 'MBBS, FCPS (Medicine)'),
  phone = coalesce(phone, 'Ext. 112'),
  email = coalesce(email, 'medical@bubt.edu.bd'),
  role_type = 'doctor'
where id = 'd2';

update public.doctors
set
  qualifications = coalesce(qualifications, 'MBBS, DGO, MCPS (Obs & Gynae)'),
  phone = coalesce(phone, 'Ext. 112'),
  email = coalesce(email, 'medical@bubt.edu.bd'),
  role_type = 'doctor'
where id = 'd3';

update public.doctors
set
  qualifications = coalesce(qualifications, 'BDS (DU), PGT (Oral & Maxillofacial)'),
  phone = coalesce(phone, 'Ext. 112'),
  email = coalesce(email, 'medical@bubt.edu.bd'),
  role_type = 'doctor'
where id = 'd4';

update public.doctors
set
  qualifications = coalesce(qualifications, 'MBBS, DLO (ENT)'),
  phone = coalesce(phone, 'Ext. 112'),
  email = coalesce(email, 'medical@bubt.edu.bd'),
  role_type = 'doctor'
where id = 'd5';

update public.doctors
set
  qualifications = coalesce(qualifications, 'MBBS, MS (Orthopedics)'),
  phone = coalesce(phone, 'Ext. 112'),
  email = coalesce(email, 'medical@bubt.edu.bd'),
  role_type = 'doctor'
where id = 'd6';

