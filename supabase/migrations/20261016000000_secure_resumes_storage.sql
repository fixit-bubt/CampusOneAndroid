-- Migration: 20261016000000_secure_resumes_storage.sql
-- Restrict read permissions on applicant resumes in job-circulars bucket

drop policy if exists "job-circulars: authenticated read" on storage.objects;

-- Circular flyers (not under 'resumes/') are readable by all authenticated users
create policy "job-circulars: circulars read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-circulars'
    and coalesce((storage.foldername(name))[1], '') <> 'resumes'
  );

-- Resumes (under 'resumes/{user_id}/') are only readable by:
-- 1. The applicant who uploaded it
-- 2. Admins
-- 3. The poster of the job the applicant applied to
create policy "job-circulars: applicant or poster resume read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-circulars'
    and (storage.foldername(name))[1] = 'resumes'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1 from public.job_applications a
        join public.jobs j on j.id = a.job_id
        where a.student_id = ((storage.foldername(name))[2])::uuid
          and j.posted_by = auth.uid()
      )
    )
  );

