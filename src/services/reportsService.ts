// Reports Service — report DB logic.

import { supabase } from '../lib/supabase';
import type { Report, ReportEvent } from '../types/database';
import { PAGE_SIZE } from '../constants/app';
import type { ServiceResult } from './authService';

export interface ReportWithProfile extends Report {
  profiles: { full_name: string; avatar_url: string | null } | null;
}

export async function getReports(
  page = 0,
  status?: Report['status'],
): Promise<ServiceResult<ReportWithProfile[]>> {
  let query = supabase
    .from('reports')
    .select('*, profiles:profiles!reporter_id(full_name, avatar_url)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as ReportWithProfile[] };
}

export interface CampusReport extends Report {
  reporter_name: string | null;
}

// Campus-wide feed (own + other students') via SECURITY DEFINER RPC, since the
// reports_select policy is owner/assigned/admin only.
export async function getCampusReports(limit = 200): Promise<ServiceResult<CampusReport[]>> {
  const { data, error } = await supabase.rpc('campus_reports', { p_limit: limit });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as CampusReport[] };
}

export async function getMyReports(userId: string): Promise<ServiceResult<Report[]>> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('reporter_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Report[] };
}

export async function getReportByCode(code: string): Promise<ServiceResult<ReportWithProfile>> {
  const { data, error } = await supabase
    .from('reports')
    .select('*, profiles:profiles!reporter_id(full_name, avatar_url)')
    .eq('code', code)
    .is('deleted_at', null)
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as ReportWithProfile };
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

export async function getReportEvents(reportId: string): Promise<ServiceResult<ReportEvent[]>> {
  const { data, error } = await supabase
    .from('report_events')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as ReportEvent[] };
}
