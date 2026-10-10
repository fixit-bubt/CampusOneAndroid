-- ============================================================================
-- Migration: 20261013030000_jobs_community_enhancements.sql
-- 1. Loosen jobs.job_type to include on_campus, tuition, and freelance.
-- 2. Add department_code, compensation_type, area_name, skills, and alumni tags.
-- 3. Expand can_post_jobs() to permit faculty/staff posting.
-- 4. Create public.job_applications for in-app tracking and status pipeline.
-- 5. Add notifications trigger for new applications and status updates.
-- ============================================================================

-- 1. Loosen job_type check constraint
alter table public.jobs drop constraint if exists jobs_job_type_check;
alter table public.jobs add constraint jobs_job_type_check
  check (job_type in ('internship', 'part_time', 'full_time', 'on_campus', 'tuition', 'freelance'));

-- 2. Add department, compensation, skills, and area columns
alter table public.jobs
  add column if not exists department_code text default 'ALL',
  add column if not exists compensation_type text default 'paid'
    check (compensation_type in ('paid', 'conveyance', 'unpaid', 'negotiable')),
  add column if not exists area_name text,
  add column if not exists skills text[],
  add column if not exists is_alumni_referral boolean default false,
  add column if not exists min_semester integer default 1;

create index if not exists jobs_dept_idx on public.jobs (department_code) where deleted_at is null;
create index if not exists jobs_type_idx on public.jobs (job_type) where deleted_at is null;

-- 3. Expand can_post_jobs() to allow faculty and staff to post opportunities
create or replace function public.can_post_jobs()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin'))
      or exists (select 1 from public.event_organizers where user_id = auth.uid())
      or exists (select 1 from public.club_members where user_id = auth.uid() and role in ('president', 'vp'));
$$;
revoke execute on function public.can_post_jobs() from public, anon;
grant  execute on function public.can_post_jobs() to authenticated;

-- 4. Job Applications table
create table if not exists public.job_applications (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null references public.jobs (id) on delete cascade,
  student_id     uuid not null references public.profiles (id) on delete cascade,
  student_name   text not null,
  student_dept   text,
  contact_phone  text,
  resume_url     text,
  cover_note     text,
  status         text not null default 'submitted' check (status in ('submitted', 'viewed', 'shortlisted', 'rejected')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (job_id, student_id)
);

create index if not exists job_applications_job_idx     on public.job_applications (job_id);
create index if not exists job_applications_student_idx on public.job_applications (student_id);

revoke all on public.job_applications from anon;
alter table public.job_applications enable row level security;
grant select, insert, update, delete on public.job_applications to authenticated;

-- RLS: Students see their own; Posters see applications to their jobs; Admins see all
create policy job_applications_select on public.job_applications
  for select to authenticated
  using (
    student_id = auth.uid()
    or exists (select 1 from public.jobs where id = job_applications.job_id and posted_by = auth.uid())
    or public.is_admin()
  );

-- RLS: Students submit application if job is active
create policy job_applications_insert on public.job_applications
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (select 1 from public.jobs where id = job_applications.job_id and deleted_at is null)
  );

-- RLS: Posters update status (e.g. mark viewed, shortlisted, rejected)
create policy job_applications_update on public.job_applications
  for update to authenticated
  using (
    exists (select 1 from public.jobs where id = job_applications.job_id and posted_by = auth.uid())
    or public.is_admin()
  );

-- RLS: Students delete / withdraw their application
create policy job_applications_delete on public.job_applications
  for delete to authenticated
  using (student_id = auth.uid() or public.is_admin());

-- 5. Trigger: Notify poster on new application
create or replace function public.trg_notify_job_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_job public.jobs;
begin
  select * into v_job from public.jobs where id = new.job_id;
  if v_job.id is not null and v_job.posted_by <> new.student_id then
    insert into public.notifications (user_id, title, body, ref_type, ref_id)
    values (
      v_job.posted_by,
      'New Job Application',
      new.student_name || ' applied for ' || v_job.title,
      'job',
      v_job.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_job_application_created on public.job_applications;
create trigger on_job_application_created
  after insert on public.job_applications
  for each row execute function public.trg_notify_job_application();

-- 6. Trigger: Notify applicant when shortlisted
create or replace function public.trg_notify_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_job public.jobs;
begin
  if new.status = 'shortlisted' and (old.status is distinct from new.status) then
    select * into v_job from public.jobs where id = new.job_id;
    if v_job.id is not null then
      insert into public.notifications (user_id, title, body, ref_type, ref_id)
      values (
        new.student_id,
        'Application Shortlisted!',
        'You have been shortlisted for ' || v_job.title || ' at ' || v_job.company,
        'job',
        v_job.id::text
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_job_application_status on public.job_applications;
create trigger on_job_application_status
  after update on public.job_applications
  for each row execute function public.trg_notify_application_status();
