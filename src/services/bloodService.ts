// Blood donation data layer. All blood screens go through here so the
// queries, RPC result shapes and eligibility rules live in one place.
import { supabase } from '../lib/supabase';
import { fetchPeople } from './peopleService';
import { localToday } from '../utils/format';
import type { ServiceResult } from './authService';
import type { BloodRequest, Donor } from '../types/database';

export type DonorWithName = Donor & { profiles: { full_name: string } | null };

export interface BloodFeed {
  requests: BloodRequest[];
  donors: DonorWithName[];
  respondedIds: Set<string>;
}

// Feed hides fulfilled requests and ages out anything older than 21 days
// (nothing auto-expires them server-side).
export async function getBloodFeed(userId: string | undefined): Promise<ServiceResult<BloodFeed>> {
  const staleCutoff = new Date(Date.now() - 21 * 86400000).toISOString();
  const [rRes, dRes, pRes] = await Promise.all([
    supabase.from('blood_requests').select('*')
      .is('fulfilled_at', null)
      .gte('created_at', staleCutoff)
      .order('created_at', { ascending: false }).limit(30),
    supabase.from('donors').select('*').limit(50),
    supabase.from('blood_pledges').select('request_id').eq('donor_id', userId ?? ''),
  ]);
  if (rRes.error || dRes.error) return { ok: false, error: (rRes.error ?? dRes.error)!.message };
  // Donor names come from the roster RPC: profiles RLS exposes only the
  // caller's own row, so embedding it leaves every other donor nameless.
  const people = await fetchPeople((dRes.data ?? []).map((d: any) => d.user_id));
  const donors = ((dRes.data ?? []) as any[]).map(d => ({
    ...d,
    profiles: people[d.user_id] ? { full_name: people[d.user_id].full_name } : null,
  }));
  return {
    ok: true,
    data: {
      requests: (rRes.data ?? []) as BloodRequest[],
      donors: donors as DonorWithName[],
      respondedIds: new Set((pRes.data ?? []).map(p => p.request_id)),
    },
  };
}

export async function pledgeToRequest(requestId: string, userId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('blood_pledges').insert({ request_id: requestId, donor_id: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// Donor stamps their own last-donation date (RLS allows own-row updates);
// resets the 90-day eligibility clock.
export async function markDonatedToday(userId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('donors')
    .update({ last_donated: localToday() })
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

// donor_contact returns json { whatsapp } and only when the donor opted in.
export async function getDonorContact(donorUserId: string): Promise<ServiceResult<string | null>> {
  const { data, error } = await supabase.rpc('donor_contact', { p_user_id: donorUserId });
  if (error) return { ok: false, error: error.message };
  const row = (Array.isArray(data) ? data[0] : data) as { whatsapp?: string | null } | null;
  return { ok: true, data: row?.whatsapp ?? null };
}

// Requester contact is only revealed to donors who pledged (consent-by-pledge).
export async function getRequesterContact(
  code: string,
): Promise<ServiceResult<{ name: string | null; whatsapp: string | null } | null>> {
  const { data, error } = await supabase.rpc('blood_requester_contact', { p_code: code });
  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, data: row ?? null };
}

export async function getRequest(requestId: string): Promise<ServiceResult<BloodRequest | null>> {
  const { data, error } = await supabase.from('blood_requests').select('*').eq('id', requestId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data as BloodRequest) ?? null };
}

export interface Pledge {
  donor_id: string;
  full_name: string | null;
  blood_group: string | null;
  last_donated: string | null;
  fulfilled_at: string | null;
  pledged_at: string;
}

// Requester-only responder list (names come via the SECURITY DEFINER RPC).
export async function getResponders(requestId: string): Promise<ServiceResult<Pledge[]>> {
  const { data, error } = await supabase.rpc('donor_pledges_for_request', { p_request_id: requestId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as Pledge[] };
}

export async function confirmDonation(requestId: string, donorId: string): Promise<ServiceResult<null>> {
  const { data, error } = await supabase.rpc('confirm_blood_donation', {
    p_request_id: requestId,
    p_donor_id: donorId,
  });
  const res = (Array.isArray(data) ? data[0] : data) as { ok?: boolean; error?: string } | null;
  if (error || !res?.ok) return { ok: false, error: res?.error ?? error?.message ?? 'Could not confirm.' };
  return { ok: true, data: null };
}

export async function markRequestFulfilled(requestId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('blood_requests')
    .update({ fulfilled_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
