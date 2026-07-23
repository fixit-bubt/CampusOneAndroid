// Connections Service — respond to incoming connection requests from the alerts
// list (the Directory/Profile screens still own the request/send flow).

import { supabase } from '../lib/supabase';
import type { ServiceResult } from './authService';

// Accept or decline a pending request from `requesterId` addressed to me.
// Accept flips it to accepted (which fires the connection-accepted notification
// to the requester and unlocks DMs); decline hard-deletes the pending row so
// either side can start over later. Returns a friendly error if the request is
// no longer pending (already handled / withdrawn).
// Current state of incoming requests from these requesters. The alerts list uses
// this so it never re-offers Accept/Decline for a request that was already
// handled (those buttons would fail with "no longer pending"). No row = the
// request was declined or withdrawn.
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

// The dedupe trigger raises a raw Postgres message; map it to a dictionary key
// so the screens can show a translated reason instead of the SQL text.
export function connectErrorKey(dbMessage: string): 'alreadyLinked' | 'connectFailed' {
  return /already exists/i.test(dbMessage) ? 'alreadyLinked' : 'connectFailed';
}

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
  return { ok: true, data: null };
}
