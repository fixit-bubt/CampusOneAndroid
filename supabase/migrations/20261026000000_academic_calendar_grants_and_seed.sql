-- ============================================================================
-- FixIt / CampusOne — Migration 20261026000000: Academic Calendar Grants & Seed
-- ----------------------------------------------------------------------------
-- 1. Grant SELECT on public.academic_calendar to anon, authenticated.
-- 2. Seed official BUBT Summer 2026 events into public.academic_calendar.
-- ============================================================================

grant select on public.academic_calendar to anon, authenticated;

-- Ensure public RLS select policy
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'academic_calendar' and policyname = 'anyone_read_calendar'
  ) then
    create policy "anyone_read_calendar" on public.academic_calendar for select using (true);
  end if;
end $$;

-- Upsert Summer 2026 key milestone dates
insert into public.academic_calendar (title, description, event_date, end_date, event_type)
values
  ('Orientation and commencement of classes of Summer 2026', 'First day of classes for Summer 2026 semester.', '2026-05-06', null, 'semester'),
  ('1st Installment Fees Payment', 'Confirmation of registration by depositing at least Tk. 6,000 (without late fee).', '2026-05-06', '2026-05-22', 'general'),
  ('Submission of application for tuition fees waiver', 'Tuition waiver application submission period.', '2026-05-12', '2026-05-21', 'general'),
  ('Deadline of course(s) add/drop and semester withdrawal', 'Last day to add, drop courses or withdraw from semester.', '2026-05-21', null, 'semester'),
  ('Eid-ul-Adha Holidays', 'University closed for Eid-ul-Adha vacation (subject to moon appearance).', '2026-05-24', '2026-05-31', 'holiday'),
  ('Payment for confirmation of registration (with late fee of Tk. 1,000)', 'Registration confirmation with late fee.', '2026-06-01', '2026-06-04', 'general'),
  ('Last day of Grade Submission of Incomplete Grades of Spring 2026', 'Incomplete grades submission deadline.', '2026-06-03', null, 'semester'),
  ('Publication of final list of registered students Summer Semester 2026', 'Official list of registered students published.', '2026-06-06', null, 'semester'),
  ('Club Member Collection Week', 'Annual club recruitment and member registration week.', '2026-06-07', '2026-06-10', 'general'),
  ('Census Day', 'University census audit day.', '2026-06-07', null, 'general'),
  ('R U OK! Mental Wellbeing Week', 'Campus mental health and wellness awareness week.', '2026-06-07', '2026-06-11', 'general'),
  ('Parents Day', 'University interactive parents day.', '2026-06-13', null, 'general'),
  ('Declaration of tuition fee waiver list', 'Announcement of approved tuition fee waivers.', '2026-06-18', null, 'general'),
  ('Payment of tuition fees: 2nd Installment (at least 50% of total dues)', '2nd installment tuition deadline.', '2026-06-10', '2026-06-24', 'general'),
  ('Deans Award for Students', 'Annual academic excellence awards ceremony.', '2026-06-16', null, 'general'),
  ('Deadline of submission of student attendance report before Midterm Examination', 'Faculty attendance report submission deadline.', '2026-06-22', null, 'general'),
  ('Last day of classes before Midterm Examination', 'Final regular classes before midterms.', '2026-06-23', null, 'semester'),
  ('Preparatory Leave for Midterm Examination', 'Official study leave for students.', '2026-06-24', null, 'exam'),
  ('Midterm Examination', 'Central university midterm examinations for all undergraduate and graduate programs.', '2026-06-25', '2026-07-03', 'exam'),
  ('Ashura Holiday', 'University closed in observance of Holy Ashura.', '2026-06-26', null, 'holiday'),
  ('Classes resume after Midterm Examination', 'Resumption of regular classes after midterms.', '2026-07-04', null, 'semester'),
  ('Deadline of submission of application for Supplementary Midterm Examination', 'Supplementary exam application deadline.', '2026-07-08', null, 'exam'),
  ('Supplementary Midterm Examination', 'Special examinations for approved supplementary candidates.', '2026-07-15', '2026-07-19', 'exam'),
  ('Deadline of submission of Midterm Examination Results', 'Faculty grade submission deadline.', '2026-07-26', null, 'exam'),
  ('Pre-Registration for Fall 2026', 'Online course pre-registration window for Fall 2026.', '2026-07-26', '2026-08-02', 'semester'),
  ('July Mass Uprising Day Holiday', 'University closed in observance of July Mass Uprising Day.', '2026-08-05', null, 'holiday'),
  ('Payment of tuition fees: Final Installment (without late fee)', 'Final tuition fee installment deadline.', '2026-08-06', '2026-08-19', 'general'),
  ('Research Showcase Week', 'Exhibition of capstones, papers, and prototypes.', '2026-08-16', '2026-08-20', 'general'),
  ('Teachers Evaluation', 'Student feedback and faculty evaluation period.', '2026-08-17', '2026-08-22', 'general'),
  ('Deadline of submission of student attendance report before Final Examination', 'Final attendance report submission deadline.', '2026-08-19', null, 'general'),
  ('Payment of tuition fees: Final Installment (with late fee Tk. 1,000)', 'Final installment with late fee.', '2026-08-20', '2026-08-24', 'general'),
  ('Last day of classes before Final Examination', 'Last regular lecture session before finals.', '2026-08-20', null, 'semester'),
  ('Preparatory leave for Final Examination', 'Official study leave for finals.', '2026-08-21', null, 'exam'),
  ('Final Examination', 'Central university final examinations for all programs.', '2026-08-22', '2026-08-30', 'exam'),
  ('Eid-e-Miladunnabi Holiday', 'University closed for Eid-e-Miladunnabi.', '2026-08-26', null, 'holiday'),
  ('Deadline of submission of Final Grade', 'Final course grade submission deadline.', '2026-09-02', null, 'exam'),
  ('Deadline of submission of application for Supplementary Final Examination', 'Supplementary final exam application window.', '2026-09-03', null, 'exam'),
  ('Final Results publication', 'Official university publication of final grades.', '2026-09-03', null, 'semester'),
  ('Janmashtami Holiday & Semester break', 'Janmashtami holiday followed by semester break.', '2026-09-04', null, 'holiday'),
  ('Orientation and commencement of classes of Fall 2026', 'First day of Fall 2026 semester.', '2026-09-05', null, 'semester'),
  ('Supplementary Final Examination', 'Supplementary examinations for Fall 2026 semester.', '2026-09-13', '2026-09-17', 'exam')
on conflict do nothing;
