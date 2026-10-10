-- ============================================================================
-- Migration: 20261013040000_jobs_360_hardening.sql
-- 1. Fix notification triggers to match public.notifications schema:
--    (user_id, sector, title, body, reference_id, reference_type).
-- 2. Add storage RLS policies for applicant resume uploads under resumes/{user_id}/.
-- 3. Ensure can_post_jobs() permissions and indexing.
-- ============================================================================

-- 1. Fix trigger: Notify poster on new application with correct notifications columns
create or replace function public.trg_notify_job_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_job public.jobs;
begin
  select * into v_job from public.jobs where id = new.job_id;
  if v_job.id is not null and v_job.posted_by <> new.student_id then
    insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
    values (
      v_job.posted_by,
      'jobs',
      'New Job Application',
      new.student_name || ' applied for ' || v_job.title,
      v_job.id::text,
      'job'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_job_application_created on public.job_applications;
create trigger on_job_application_created
  after insert on public.job_applications
  for each row execute function public.trg_notify_job_application();

-- 2. Fix trigger: Notify applicant when shortlisted
create or replace function public.trg_notify_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_job public.jobs;
begin
  if new.status = 'shortlisted' and (old.status is distinct from new.status) then
    select * into v_job from public.jobs where id = new.job_id;
    if v_job.id is not null then
      insert into public.notifications (user_id, sector, title, body, reference_id, reference_type)
      values (
        new.student_id,
        'jobs',
        'Application Shortlisted!',
        'You have been shortlisted for ' || v_job.title || ' at ' || v_job.company,
        v_job.id::text,
        'job'
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

-- 3. Storage RLS policies for applicant resumes in job-circulars bucket
drop policy if exists "job-circulars: applicant resume upload" on storage.objects;
create policy "job-circulars: applicant resume upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-circulars'
    and (storage.foldername(name))[1] = 'resumes'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "job-circulars: applicant resume delete" on storage.objects;
create policy "job-circulars: applicant resume delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'job-circulars'
    and (storage.foldername(name))[1] = 'resumes'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "job-circulars: authenticated read" on storage.objects;
create policy "job-circulars: authenticated read"
  on storage.objects for select to authenticated
  using (bucket_id = 'job-circulars');

-- 4. Re-grant can_post_jobs()
revoke execute on function public.can_post_jobs() from public, anon;
grant  execute on function public.can_post_jobs() to authenticated;

