// Reports Service - report DB logic.

import { supabase } from '../lib/supabase';
import type { Report } from '../types/database';
import type { ServiceResult } from './authService';
import { getCache, setCache, CacheKeys, withTimeout } from './cacheService';

export async function getMyReports(userId: string): Promise<ServiceResult<Report[]>> {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200),
      5000
    );
    if (error) {
      const cached = await getCache<Report[]>(CacheKeys.MY_REPORTS(userId));
      if (cached && cached.length > 0) return { ok: true, data: cached };
      return { ok: false, error: error.message };
    }
    setCache(CacheKeys.MY_REPORTS(userId), data as Report[]);
    return { ok: true, data: data as Report[] };
  } catch (err: any) {
    const cached = await getCache<Report[]>(CacheKeys.MY_REPORTS(userId));
    if (cached && cached.length > 0) return { ok: true, data: cached };
    return { ok: false, error: err?.message ?? 'Network error' };
  }
}

export async function createReport(payload: {
  category: Report['category'];
  description: string;
  building: string;
  room?: string;
  photo_url?: string;
  show_on_board?: boolean;
}): Promise<ServiceResult<Report>> {
  // RLS reports_insert requires reporter_id = auth.uid() AND status = 'Open'.
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: 'You must be signed in to report an issue.' };

  const { data, error } = await supabase
    .from('reports')
    .insert({ ...payload, reporter_id: auth.user.id, status: 'Open' })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Report };
}

// Assigned staff declines a report → it returns to the admin pool
// (unassigned + Open). RPC returns soft {ok:false,error} on failure.
export async function declineReport(reportId: string): Promise<ServiceResult<null>> {
  const { data, error } = await supabase.rpc('decline_report', { p_report_id: reportId });
  const res = data as { ok?: boolean; error?: string } | null;
  if (error) return { ok: false, error: error.message };
  if (!res?.ok) return { ok: false, error: res?.error ?? 'Could not decline this report.' };
  return { ok: true, data: null };
}
