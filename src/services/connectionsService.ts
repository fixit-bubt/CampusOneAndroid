// Connections Service - manage connection requests, responses, and mutual peer states.

import { supabase } from '../lib/supabase';
import type { ServiceResult } from './authService';
import { getCache, setCache, CacheKeys } from './cacheService';

export type ConnStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'accepted';

export interface StudentDetail {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  department?: string | null;
  program?: string | null;
  intake?: string | null;
  section?: string | null;
  blood_group?: string | null;
  student_id?: string | null;
  is_cr?: boolean;
  status: ConnStatus;
  email?: string | null;
  whatsapp?: string | null;
}

// Synchronize directory cache in AsyncStorage when mutual states change
export async function syncDirectoryCache(
  studentId: string,
  newState: 'none' | 'requested' | 'incoming' | 'connected',
  extra?: { email?: string | null; whatsapp?: string | null }
): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const cacheKey = CacheKeys.DIRECTORY(uid);
    const cached = await getCache<any[]>(cacheKey);
    if (!cached || !Array.isArray(cached)) return;

    const updated = cached.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          connState: newState,
          status:
            newState === 'connected' ? 'accepted' :
            newState === 'requested' ? 'pending_outgoing' :
            newState === 'incoming' ? 'pending_incoming' :
            'none',
          ...(extra ?? {}),
        };
      }
      return s;
    });
    await setCache(cacheKey, updated);
  } catch {
    // Non-fatal cache sync fallback
  }
}

// Current state of incoming requests from these requesters.
export async function getConnectionStates(
  requesterIds: string[],
): Promise<ServiceResult<Record<string, 'pending' | 'accepted' | 'gone'>>> {
  const map: Record<string, 'pending' | 'accepted' | 'gone'> = {};
  if (requesterIds.length === 0) return { ok: true, data: map };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: 'You must be signed in.' };

  const { data, error } = await supabase
    .from('connections')
    .select('requester_id, status')
    .eq('addressee_id', uid)
    .in('requester_id', requesterIds);
  if (error) return { ok: false, error: error.message };

  for (const id of requesterIds) map[id] = 'gone';
  for (const row of (data ?? []) as { requester_id: string; status: string }[]) {
    map[row.requester_id] =
      row.status === 'pending' ? 'pending' : row.status === 'accepted' ? 'accepted' : 'gone';
  }
  return { ok: true, data: map };
}

// Map database duplicate error to dictionary key
export function connectErrorKey(dbMessage: string): 'alreadyLinked' | 'connectFailed' {
  return /already exists/i.test(dbMessage) ? 'alreadyLinked' : 'connectFailed';
}

// Send a connection request to target student
export async function sendConnectionRequest(targetId: string): Promise<ServiceResult<null>> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: 'You must be signed in.' };

  const { error } = await supabase.from('connections').insert({
    requester_id: uid,
    addressee_id: targetId,
    status: 'pending',
  });
  if (error) return { ok: false, error: error.message };
  await syncDirectoryCache(targetId, 'requested');
  return { ok: true, data: null };
}

// Cancel an outgoing connection request you previously sent
export async function cancelConnectionRequest(targetId: string): Promise<ServiceResult<null>> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: 'You must be signed in.' };

  const { data, error } = await supabase
    .from('connections')
    .delete()
    .eq('requester_id', uid)
    .eq('addressee_id', targetId)
    .eq('status', 'pending')
    .select('id');

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: 'Request is no longer pending.' };
  await syncDirectoryCache(targetId, 'none');
  return { ok: true, data: null };
}

// Accept or decline a pending request from requesterId
export async function respondConnection(
  requesterId: string,
  accept: boolean,
): Promise<ServiceResult<null>> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: 'You must be signed in.' };

  const { data, error } = accept
    ? await supabase
        .from('connections')
        .update({ status: 'accepted', decided_at: new Date().toISOString() })
        .eq('requester_id', requesterId)
        .eq('addressee_id', uid)
        .eq('status', 'pending')
        .select('id')
    : await supabase
        .from('connections')
        .delete()
        .eq('requester_id', requesterId)
        .eq('addressee_id', uid)
        .eq('status', 'pending')
        .select('id');

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: 'This request is no longer pending.' };
  await syncDirectoryCache(requesterId, accept ? 'connected' : 'none');
  return { ok: true, data: null };
}

// Disconnect from an accepted student connection
export async function disconnectStudent(targetId: string): Promise<ServiceResult<null>> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: 'You must be signed in.' };

  const { data, error } = await supabase.rpc('disconnect_student', { p_target_id: targetId });
  if (error) {
    const { error: delErr } = await supabase
      .from('connections')
      .delete()
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${uid},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${uid})`);
    if (delErr) return { ok: false, error: delErr.message };
    await syncDirectoryCache(targetId, 'none', { email: null, whatsapp: null });
    return { ok: true, data: null };
  }
  if (!data) return { ok: false, error: 'Connection not found or already removed.' };
  await syncDirectoryCache(targetId, 'none', { email: null, whatsapp: null });
  return { ok: true, data: null };
}

// Fetch single-student profile detail (optimized RPC lookup)
export async function fetchStudentProfileDetail(studentId: string): Promise<ServiceResult<StudentDetail | null>> {
  const { data, error } = await supabase.rpc('student_profile_detail', { p_target_id: studentId });
  if (error) return { ok: false, error: error.message };
  const list = data as unknown as StudentDetail[];
  const row = (list && list.length > 0) ? list[0] : null;
  return { ok: true, data: row };
}
