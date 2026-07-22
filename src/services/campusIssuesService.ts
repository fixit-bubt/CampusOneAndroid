// Campus Issues Service — the anonymous student issues board + me-too votes.
//
// Reports opted onto the board (reports.show_on_board = true) are exposed through
// SECURITY DEFINER RPCs that never project reporter identity, so the board is
// anonymous at the presentation layer. Votes go through toggle_report_vote only
// (report_votes has no direct insert/delete grant).

import { supabase } from '../lib/supabase';
import type { ServiceResult } from './authService';

// Row shape from campus_issues_feed() — safe columns only, no reporter identity.
export interface CampusIssue {
  id: string;
  code: string | null;
  category: string;
  description: string;
  building: string | null;
  room: string | null;
  status: string;
  created_at: string;
  vote_count: number;
  voted: boolean;
}

// The public board feed: opted-in, non-Safety, non-Rejected reports, ordered by
// vote count then newest. Each row carries the caller's own `voted` state.
export async function getCampusIssues(): Promise<ServiceResult<CampusIssue[]>> {
  const { data, error } = await supabase.rpc('campus_issues_feed');
  if (error) return { ok: false, error: error.message };
  const rows = ((data ?? []) as any[]).map((r) => ({ ...r, vote_count: Number(r.vote_count) }));
  return { ok: true, data: rows as CampusIssue[] };
}

// Idempotent "me too" toggle (adds a vote if absent, removes it if present).
// Returns the fresh count + the caller's new state so the UI can patch in place.
export async function toggleReportVote(
  reportId: string,
): Promise<ServiceResult<{ vote_count: number; voted: boolean }>> {
  const { data, error } = await supabase.rpc('toggle_report_vote', { p_report_id: reportId });
  if (error) return { ok: false, error: error.message };
  // Table-returning RPC → an array with a single row.
  const row = (Array.isArray(data) ? data[0] : data) as { vote_count: number; voted: boolean } | undefined;
  if (!row) return { ok: false, error: 'Could not record your vote.' };
  return { ok: true, data: { vote_count: Number(row.vote_count), voted: !!row.voted } };
}

// Reporter opts one of their own reports on/off the board. Runs as owner so it
// works even after staff moved the report past Open (Safety/Security is forced
// off server-side regardless of `visible`).
export async function setReportBoardVisibility(
  reportId: string,
  visible: boolean,
): Promise<ServiceResult<null>> {
  const { error } = await supabase.rpc('set_report_board_visibility', {
    p_report_id: reportId,
    p_visible: visible,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// Admin/staff only: report_id → me-too count. Returns an empty map for anyone
// else (the RPC's predicate is false for non-staff).
export async function getReportVoteCounts(): Promise<ServiceResult<Record<string, number>>> {
  const { data, error } = await supabase.rpc('report_vote_counts');
  if (error) return { ok: false, error: error.message };
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { report_id: string; vote_count: number }[]) {
    map[row.report_id] = Number(row.vote_count);
  }
  return { ok: true, data: map };
}
