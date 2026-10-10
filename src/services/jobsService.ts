// CampusOne — Jobs & Internships Service
// Centralized data access, Dhaka timezone-aware status calculation,
// caching, and moderation RPCs.

import { supabase } from '../lib/supabase';
import { getCache, setCache, CacheKeys } from './cacheService';
import { localToday, formatDate } from '../utils/format';
import { BUCKETS } from '../constants/app';
import { uploadFile } from '../utils/storage';
import type { Job, JobApplication } from '../types/database';

export type JobStatus = 'open' | 'closing' | 'expired' | 'removed';

/**
 * Computes job status in Asia/Dhaka time without UTC offset drift.
 * - 'removed': listing is soft-deleted.
 * - 'expired': deadline has passed.
 * - 'closing': 3 days or fewer remaining until deadline.
 * - 'open': active with more than 3 days remaining.
 */
export function computeJobStatus(job: { deadline?: string | null; deleted_at?: string | null }): JobStatus {
  if (job.deleted_at) return 'removed';
  if (!job.deadline) return 'open';

  const today = localToday();
  if (job.deadline < today) return 'expired';

  // Deterministic UTC-anchored date difference for YYYY-MM-DD strings
  const todayMs = new Date(`${today}T00:00:00Z`).getTime();
  const deadlineMs = new Date(`${job.deadline}T00:00:00Z`).getTime();
  const days = Math.round((deadlineMs - todayMs) / 86400000);

  if (days < 0) return 'expired';
  if (days <= 3) return 'closing';
  return 'open';
}

/**
 * Human-friendly days remaining label in Asia/Dhaka time.
 */
export function daysRemainingLabel(
  deadline?: string | null,
  labels?: {
    today?: string;
    tomorrow?: string;
    inDays?: (d: number) => string;
    closed?: (formatted: string) => string;
  }
): string {
  if (!deadline) return '';
  const today = localToday();
  const formatted = formatDate(deadline);
  if (deadline < today) {
    return labels?.closed ? labels.closed(formatted) : `Closed ${formatted}`;
  }

  const todayMs = new Date(`${today}T00:00:00Z`).getTime();
  const deadlineMs = new Date(`${deadline}T00:00:00Z`).getTime();
  const days = Math.round((deadlineMs - todayMs) / 86400000);

  if (days <= 0) return labels?.today ?? 'Closes today';
  if (days === 1) return labels?.tomorrow ?? 'Closes tomorrow';
  if (days <= 14) return labels?.inDays ? labels.inDays(days) : `Closes in ${days} days`;
  return labels?.closed ? labels.closed(formatted) : `Closes ${formatted}`;
}

/**
 * Fetch all active jobs with offline-first cache fallback.
 */
export async function getJobsWithCache(userId?: string): Promise<{
  jobs: Job[];
  savedIds: Set<string>;
  isOffline: boolean;
  error?: string;
}> {
  const cachedJobs = await getCache<Job[]>(CacheKeys.JOBS);
  let cachedSaved: string[] | null = null;
  if (userId) {
    cachedSaved = await getCache<string[]>(CacheKeys.JOB_BOOKMARKS(userId));
  }

  try {
    const [jobsRes, savedRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100),
      userId
        ? supabase.from('job_bookmarks').select('job_id').eq('user_id', userId).limit(200)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    if (jobsRes.error) {
      if (cachedJobs && cachedJobs.length > 0) {
        return {
          jobs: cachedJobs,
          savedIds: new Set(cachedSaved ?? []),
          isOffline: true,
        };
      }
      return {
        jobs: [],
        savedIds: new Set(),
        isOffline: false,
        error: jobsRes.error.message,
      };
    }

    const liveJobs = (jobsRes.data ?? []) as Job[];
    const liveSavedIds = new Set<string>((savedRes.data ?? []).map((s: any) => s.job_id));

    // Update memory & disk cache
    setCache(CacheKeys.JOBS, liveJobs);
    if (userId) {
      setCache(CacheKeys.JOB_BOOKMARKS(userId), Array.from(liveSavedIds));
    }

    return {
      jobs: liveJobs,
      savedIds: liveSavedIds,
      isOffline: false,
    };
  } catch (e: any) {
    if (cachedJobs && cachedJobs.length > 0) {
      return {
        jobs: cachedJobs,
        savedIds: new Set(cachedSaved ?? []),
        isOffline: true,
      };
    }
    return {
      jobs: [],
      savedIds: new Set(),
      isOffline: true,
      error: e?.message ?? 'Network error',
    };
  }
}

/**
 * Toggle bookmarking a job listing with cache persistence.
 */
export async function toggleJobBookmark(
  jobId: string,
  userId: string,
  isCurrentlySaved: boolean
): Promise<{ success: boolean; isSaved: boolean; error?: string }> {
  try {
    const nextSaved = !isCurrentlySaved;

    const { error } = nextSaved
      ? await supabase.from('job_bookmarks').insert({ job_id: jobId, user_id: userId })
      : await supabase.from('job_bookmarks').delete().eq('job_id', jobId).eq('user_id', userId);

    if (error && error.code !== '23505') {
      return { success: false, isSaved: isCurrentlySaved, error: error.message };
    }

    // Synchronize local cache
    const cached = await getCache<string[]>(CacheKeys.JOB_BOOKMARKS(userId));
    if (cached) {
      const set = new Set(cached);
      nextSaved ? set.add(jobId) : set.delete(jobId);
      setCache(CacheKeys.JOB_BOOKMARKS(userId), Array.from(set));
    }

    return { success: true, isSaved: nextSaved };
  } catch (e: any) {
    return { success: false, isSaved: isCurrentlySaved, error: e?.message };
  }
}

/**
 * Poster withdraws their own active listing.
 */
export async function withdrawJobListing(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('job_withdraw', { p_code: code });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to withdraw listing' };
  }
}

/**
 * Admin removes a listing with a reason.
 */
export async function adminRemoveJobListing(code: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('job_admin_remove', { p_code: code, p_reason: reason });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to remove listing' };
  }
}

/**
 * Admin restores a removed listing.
 */
export async function adminRestoreJobListing(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('job_admin_restore', { p_code: code });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to restore listing' };
  }
}

/**
 * User files a moderation report for a listing.
 */
export async function reportJobListing(
  code: string,
  reason: string,
  note?: string
): Promise<{ success: boolean; error?: string; alreadyReported?: boolean }> {
  try {
    const { error } = await supabase.rpc('job_report', {
      p_code: code,
      p_reason: reason.toLowerCase(),
      p_note: note?.trim() || undefined,
    });

    if (error) {
      if (error.code === '23505') {
        return { success: false, alreadyReported: true, error: 'You have already reported this listing.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to report listing' };
  }
}

/**
 * Upload a circular PDF to the public `job-circulars` bucket under `{userId}/{timestamp}.pdf`.
 */
export async function uploadJobCircular(
  userId: string,
  localUri: string,
  fileName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const remotePath = `${userId}/${Date.now()}_${safeName}`;

    const res = await uploadFile(
      BUCKETS.jobCirculars,
      localUri,
      remotePath,
      'application/pdf',
      true,
      { skipCompression: true }
    );

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, url: res.url };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to upload circular' };
  }
}

export async function uploadJobResume(
  userId: string,
  localUri: string,
  fileName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const remotePath = `resumes/${userId}/${Date.now()}_${safeName}`;

    const res = await uploadFile(
      BUCKETS.jobCirculars,
      localUri,
      remotePath,
      'application/pdf',
      true,
      { skipCompression: true }
    );

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, url: res.url };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to upload resume' };
  }
}

/**
 * Submit an in-app application for a job.
 */
export async function submitJobApplication(params: {
  jobId: string;
  studentId: string;
  studentName: string;
  studentDept?: string | null;
  contactPhone?: string | null;
  resumeUrl?: string | null;
  coverNote?: string | null;
}): Promise<{ success: boolean; error?: string; application?: JobApplication }> {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        job_id: params.jobId,
        student_id: params.studentId,
        student_name: params.studentName,
        student_dept: params.studentDept || null,
        contact_phone: params.contactPhone || null,
        resume_url: params.resumeUrl || null,
        cover_note: params.coverNote?.trim() || null,
        status: 'submitted',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'You have already applied for this position.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, application: data as JobApplication };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to submit application' };
  }
}

/**
 * Check if the student has already applied for a job.
 */
export async function getStudentApplicationForJob(
  jobId: string,
  studentId: string
): Promise<{ applied: boolean; application?: JobApplication }> {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', jobId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error || !data) {
      return { applied: false };
    }

    return { applied: true, application: data as JobApplication };
  } catch {
    return { applied: false };
  }
}

/**
 * Fetch all applications submitted by the current student.
 */
export async function getStudentApplications(studentId: string): Promise<{
  applications: (JobApplication & { job?: Job })[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*, jobs!job_id(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      return { applications: [], error: error.message };
    }

    const apps = (data ?? []).map((row: any) => ({
      ...row,
      job: row.jobs as Job,
    }));

    return { applications: apps };
  } catch (e: any) {
    return { applications: [], error: e?.message ?? 'Failed to load applications' };
  }
}

/**
 * Fetch all applications for a job listing (recruiter / poster view).
 */
export async function getApplicationsForJob(jobId: string): Promise<{
  applications: JobApplication[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      return { applications: [], error: error.message };
    }

    return { applications: (data ?? []) as JobApplication[] };
  } catch (e: any) {
    return { applications: [], error: e?.message ?? 'Failed to load applications' };
  }
}

/**
 * Update application status (viewed, shortlisted, rejected).
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: 'viewed' | 'shortlisted' | 'rejected'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('job_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to update status' };
  }
}

/**
 * Withdraw an application.
 */
export async function withdrawJobApplication(applicationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('job_applications').delete().eq('id', applicationId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to withdraw application' };
  }
}
