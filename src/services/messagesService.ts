// Messages Service — DB access for direct messages + club/section group chats.
//
// Conversation identity lives on the messages row itself (there is no
// conversations table): a DM is the canonical peer pair (peer_low < peer_high),
// a club chat is club_id, a section chat is section_id. All reads are gated by
// RLS; this layer just shapes queries and maps rows to camelCase.

import { supabase } from '../lib/supabase';
import type { ServiceResult } from './authService';

export type MsgKind = 'dm' | 'club' | 'section';

export interface Message {
  id: string;
  kind: MsgKind;
  clubId: string | null;
  sectionId: string | null;
  peerLow: string | null;
  peerHigh: string | null;
  senderId: string | null;
  body: string;
  editedAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  pending?: boolean; // local-only optimistic flag, never from the DB
}

// ---- mappers / keys -------------------------------------------------------

export function toMessage(r: any): Message {
  return {
    id: r.id,
    kind: r.kind,
    clubId: r.club_id ?? null,
    sectionId: r.section_id ?? null,
    peerLow: r.peer_low ?? null,
    peerHigh: r.peer_high ?? null,
    senderId: r.sender_id ?? null,
    body: r.body ?? '',
    editedAt: r.edited_at ?? null,
    deletedAt: r.deleted_at ?? null,
    deletedBy: r.deleted_by ?? null,
    createdAt: r.created_at,
  };
}

// Canonical DM pair — the smaller uuid is always peer_low.
export function dmPair(a: string, b: string): { low: string; high: string } {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

// Stable conversation key. For a DM the id part is the OTHER user's id.
export function convKey(kind: MsgKind, id: string): string {
  return `${kind}:${id}`;
}

// Derive the conv key for a message from my perspective.
export function convKeyOf(m: Message, myId: string): string {
  if (m.kind === 'dm') return `dm:${m.peerLow === myId ? m.peerHigh : m.peerLow}`;
  if (m.kind === 'club') return `club:${m.clubId}`;
  return `section:${m.sectionId}`;
}

// Realtime broadcast topic a message belongs to.
export function topicOf(m: Message): string {
  if (m.kind === 'dm') return `chat:dm:${m.peerLow}:${m.peerHigh}`;
  if (m.kind === 'club') return `chat:club:${m.clubId}`;
  return `chat:section:${m.sectionId}`;
}

// Realtime topic for a (kind, id) conversation from my perspective.
export function topicFor(kind: MsgKind, id: string, myId: string): string {
  if (kind === 'dm') {
    const { low, high } = dmPair(myId, id);
    return `chat:dm:${low}:${high}`;
  }
  return `chat:${kind}:${id}`;
}

// Merge incoming rows into a list, deduped by id (newer copy wins), optionally
// dropping a temp/optimistic row once its real row arrives.
export function mergeMessages(prev: Message[], incoming: Message[], dropId?: string): Message[] {
  const map = new Map<string, Message>();
  for (const m of prev) if (m.id !== dropId) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return Array.from(map.values());
}

// Apply the (kind, id) scope filters to a messages query builder.
function scope(q: any, kind: MsgKind, id: string, myId: string) {
  if (kind === 'dm') {
    const { low, high } = dmPair(myId, id);
    return q.eq('kind', 'dm').eq('peer_low', low).eq('peer_high', high);
  }
  if (kind === 'club') return q.eq('kind', 'club').eq('club_id', id);
  return q.eq('kind', 'section').eq('section_id', id);
}

// ---- initial load ---------------------------------------------------------

// Newest N messages across every conversation the caller can see (RLS filtered).
export async function fetchMessages(limit = 300): Promise<ServiceResult<Message[]>> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: ((data ?? []) as any[]).map(toMessage) };
}

export async function fetchReads(): Promise<ServiceResult<Record<string, string>>> {
  const { data, error } = await supabase.from('message_reads').select('conv_key, last_read_at');
  if (error) return { ok: false, error: error.message };
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as any[]) map[r.conv_key] = r.last_read_at;
  return { ok: true, data: map };
}

export async function fetchBlocks(myId: string): Promise<ServiceResult<string[]>> {
  const { data, error } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', myId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: ((data ?? []) as any[]).map(r => r.blocked_id) };
}

// Accepted connections → the set of people I can DM.
export async function fetchDmPartners(myId: string): Promise<ServiceResult<string[]>> {
  const { data, error } = await supabase
    .from('connections')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error) return { ok: false, error: error.message };
  const ids = ((data ?? []) as any[]).map(c => (c.requester_id === myId ? c.addressee_id : c.requester_id));
  return { ok: true, data: Array.from(new Set(ids)) };
}

export interface ChatProfile { full_name: string; avatar_url: string | null }

// Names/avatars for the people in my conversations. `profiles` is RLS-locked to
// the caller's own row, so selecting it directly blanks every peer — go through
// the same SECURITY DEFINER roster RPC the directory uses.
export async function fetchChatProfiles(ids: string[]): Promise<Record<string, ChatProfile>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase.rpc('directory_profiles');
  if (error || !data) return {};
  const want = new Set(ids);
  const out: Record<string, ChatProfile> = {};
  for (const p of data as any[]) {
    if (want.has(p.id)) out[p.id] = { full_name: p.full_name ?? '', avatar_url: p.avatar_url ?? null };
  }
  return out;
}

// ---- per-conversation reads ----------------------------------------------

export async function fetchConversation(
  kind: MsgKind, id: string, myId: string, limit = 50,
): Promise<ServiceResult<{ messages: Message[]; count: number }>> {
  const { data, error } = await scope(
    supabase.from('messages').select('*'), kind, id, myId,
  ).order('created_at', { ascending: false }).limit(limit);
  if (error) return { ok: false, error: error.message };
  const rows = ((data ?? []) as any[]).map(toMessage);
  return { ok: true, data: { messages: rows, count: rows.length } };
}

export async function fetchOlder(
  kind: MsgKind, id: string, myId: string, beforeIso: string, limit = 50,
): Promise<ServiceResult<Message[]>> {
  const { data, error } = await scope(
    supabase.from('messages').select('*'), kind, id, myId,
  ).lt('created_at', beforeIso).order('created_at', { ascending: false }).limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: ((data ?? []) as any[]).map(toMessage) };
}

export async function searchConversation(
  kind: MsgKind, id: string, myId: string, term: string, limit = 30,
): Promise<ServiceResult<Message[]>> {
  // Escape LIKE metacharacters so a literal % or _ doesn't turn into a wildcard.
  const esc = term.replace(/[\\%_]/g, s => `\\${s}`);
  const { data, error } = await scope(
    supabase.from('messages').select('*'), kind, id, myId,
  ).is('deleted_at', null).ilike('body', `%${esc}%`)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: ((data ?? []) as any[]).map(toMessage) };
}

// ---- mutations ------------------------------------------------------------

export async function insertMessage(
  kind: MsgKind, id: string, body: string, myId: string,
): Promise<ServiceResult<Message>> {
  let payload: any;
  if (kind === 'dm') {
    const { low, high } = dmPair(myId, id);
    payload = { kind, peer_low: low, peer_high: high, sender_id: myId, body };
  } else if (kind === 'club') {
    payload = { kind, club_id: id, sender_id: myId, body };
  } else {
    payload = { kind, section_id: id, sender_id: myId, body };
  }
  const { data, error } = await supabase.from('messages').insert(payload).select().single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: toMessage(data) };
}

export async function updateMessageBody(msgId: string, body: string): Promise<ServiceResult<Message>> {
  const { data, error } = await supabase
    .from('messages').update({ body }).eq('id', msgId).select().single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: toMessage(data) };
}

export async function softDeleteMessage(msgId: string): Promise<ServiceResult<Message>> {
  // The update guard stamps deleted_by/now() and scrubs the body server-side.
  const { data, error } = await supabase
    .from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', msgId).select().single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: toMessage(data) };
}

export async function upsertRead(myId: string, convKeyStr: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('message_reads').upsert(
    { user_id: myId, conv_key: convKeyStr, last_read_at: new Date().toISOString() },
    { onConflict: 'user_id,conv_key' },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function insertBlock(myId: string, blockedId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('user_blocks').insert({ blocker_id: myId, blocked_id: blockedId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function deleteBlock(myId: string, blockedId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('user_blocks').delete().eq('blocker_id', myId).eq('blocked_id', blockedId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
