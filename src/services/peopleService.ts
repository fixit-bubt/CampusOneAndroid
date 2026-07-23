// People Service — display names and avatars for other users.
//
// The profiles table carries contact details (email, phone, WhatsApp, address),
// so its RLS only exposes the caller's own row. That means every
// `profiles!some_id(full_name)` embed silently resolves to null for anyone but
// yourself — names render blank and avatars fall back to initials of nothing.
// directory_profiles() is a SECURITY DEFINER view of just the display fields;
// route every cross-user name through here instead of touching profiles.

import { supabase } from '../lib/supabase';

export interface Person {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  department: string | null;
}

const TTL_MS = 5 * 60 * 1000;

let cache: Record<string, Person> | null = null;
let cachedAt = 0;
let inflight: Promise<Record<string, Person>> | null = null;

// Drop the roster on sign-out / account switch so the next user doesn't read
// the previous one's cache.
export function clearPeople(): void {
  cache = null;
  cachedAt = 0;
  inflight = null;
}

// The whole roster, keyed by id. Concurrent callers share one request.
export async function loadPeople(force = false): Promise<Record<string, Person>> {
  if (!force && cache && Date.now() - cachedAt < TTL_MS) return cache;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    const { data, error } = await supabase.rpc('directory_profiles');
    if (error || !data) return cache ?? {};
    const map: Record<string, Person> = {};
    for (const p of data as any[]) {
      map[p.id] = {
        id: p.id,
        full_name: p.full_name ?? '',
        avatar_url: p.avatar_url ?? null,
        role: p.role ?? '',
        department: p.department ?? null,
      };
    }
    cache = map;
    cachedAt = Date.now();
    return map;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

// Just the people asked for.
export async function fetchPeople(ids: string[]): Promise<Record<string, Person>> {
  const wanted = Array.from(new Set(ids.filter(Boolean)));
  if (wanted.length === 0) return {};
  const all = await loadPeople();
  const out: Record<string, Person> = {};
  for (const id of wanted) if (all[id]) out[id] = all[id];
  return out;
}

// One name, for the odd single lookup.
export async function personName(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const all = await loadPeople();
  return all[id]?.full_name ?? null;
}
