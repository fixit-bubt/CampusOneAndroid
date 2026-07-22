// Messages Store — cached messages + realtime for DMs and club/section chats.
//
// Messaging is student-only, so the whole store no-ops for staff/admin. It holds
// the message cache, read markers, blocks and the conversation roster, subscribes
// to one private Broadcast channel per conversation topic, and derives the unread
// counts that drive the Messages tab badge.

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './authStore';
import {
  fetchMessages, fetchReads, fetchBlocks, fetchDmPartners,
  fetchConversation, fetchOlder, searchConversation,
  insertMessage, updateMessageBody, softDeleteMessage, upsertRead, insertBlock, deleteBlock,
  toMessage, mergeMessages, convKey, convKeyOf, topicFor, dmPair,
  type Message, type MsgKind,
} from '../services/messagesService';

interface ClubChat { id: string; name: string }
interface SectionChat { id: string; label: string }
type Result = { ok: boolean; error?: string };

interface MessagesValue {
  messages: Message[];
  blocked: string[];
  dmPartners: string[];
  myClubs: ClubChat[];
  mySections: SectionChat[];
  loading: boolean;
  unreadByConv: Record<string, number>;
  totalUnread: number;
  isBlocked: (id: string) => boolean;
  threadMessages: (kind: MsgKind, id: string) => Message[];
  send: (kind: MsgKind, id: string, body: string) => Promise<Result>;
  edit: (msgId: string, body: string) => Promise<Result>;
  remove: (msgId: string) => Promise<Result>;
  block: (id: string) => Promise<Result>;
  unblock: (id: string) => Promise<Result>;
  markRead: (convKeyStr: string, iso: string) => Promise<void>;
  loadConversation: (kind: MsgKind, id: string) => Promise<{ ok: boolean; count: number }>;
  fetchOlderMessages: (kind: MsgKind, id: string, beforeIso: string) => Promise<{ ok: boolean; count: number }>;
  search: (kind: MsgKind, id: string, term: string) => Promise<Message[]>;
  reload: () => Promise<void>;
}

const MessagesContext = createContext<MessagesValue | null>(null);

async function authRealtime() {
  const { data } = await supabase.auth.getSession();
  try { await supabase.realtime.setAuth(data.session?.access_token ?? null); } catch { /* attaches on connect */ }
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const myId = user?.id ?? null;
  const isStudent = profile?.role === 'student';

  const [messages, setMessages] = useState<Message[]>([]);
  const [reads, setReads] = useState<Record<string, string>>({});
  const [blocked, setBlocked] = useState<string[]>([]);
  const [dmPartners, setDmPartners] = useState<string[]>([]);
  const [myClubs, setMyClubs] = useState<ClubChat[]>([]);
  const [mySections, setMySections] = useState<SectionChat[]>([]);
  const [loading, setLoading] = useState(false);

  // ---- initial / full load ------------------------------------------------
  const reload = useCallback(async () => {
    if (!myId || !isStudent) {
      setMessages([]); setReads({}); setBlocked([]); setDmPartners([]); setMyClubs([]); setMySections([]);
      return;
    }
    setLoading(true);
    const [mRes, rRes, bRes, pRes, clubRes, secRes] = await Promise.all([
      fetchMessages(),
      fetchReads(),
      fetchBlocks(myId),
      fetchDmPartners(myId),
      supabase.from('club_members').select('clubs(id, name, is_active)').eq('user_id', myId),
      supabase.from('study_section_members')
        .select('study_sections(id, number, study_intakes(number))')
        .eq('user_id', myId).eq('status', 'approved'),
    ]);
    if (mRes.ok) setMessages(prev => mergeMessages(prev, mRes.data));
    if (rRes.ok) setReads(rRes.data);
    if (bRes.ok) setBlocked(bRes.data);
    if (pRes.ok) setDmPartners(pRes.data);
    if (clubRes.data) {
      const clubs = (clubRes.data as any[])
        .map(r => r.clubs).filter(c => c && c.is_active !== false)
        .map(c => ({ id: c.id as string, name: (c.name as string) ?? 'Club' }));
      setMyClubs(clubs);
    }
    if (secRes.data) {
      const secs = (secRes.data as any[]).map(r => r.study_sections).filter(Boolean).map(s => ({
        id: s.id as string,
        label: `Intake ${s.study_intakes?.number ?? '?'} · Section ${s.number ?? '?'}`,
      }));
      setMySections(secs);
    }
    setLoading(false);
  }, [myId, isStudent]);

  useEffect(() => { reload(); }, [reload]);

  // Refetch just the message cache (catch-up after a (re)connect / foreground),
  // debounced so many channels reconnecting at once fire it once.
  const catchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catchUp = useCallback(() => {
    if (catchTimer.current) clearTimeout(catchTimer.current);
    catchTimer.current = setTimeout(async () => {
      const res = await fetchMessages();
      if (res.ok) setMessages(prev => mergeMessages(prev, res.data));
    }, 800);
  }, []);

  // ---- realtime: one private channel per conversation topic ---------------
  const myTopics = useMemo(() => {
    if (!myId || !isStudent) return [];
    const topics = [
      ...dmPartners.map(pid => topicFor('dm', pid, myId)),
      ...myClubs.map(c => `chat:club:${c.id}`),
      ...mySections.map(s => `chat:section:${s.id}`),
    ];
    return Array.from(new Set(topics)).sort();
  }, [myId, isStudent, dmPartners, myClubs, mySections]);
  const topicKey = myTopics.join('|');

  const channelsRef = useRef<RealtimeChannel[]>([]);
  useEffect(() => {
    let cancelled = false;
    const teardown = () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
    (async () => {
      teardown();
      if (!myId || !isStudent || myTopics.length === 0) return;
      await authRealtime();
      if (cancelled) return;
      channelsRef.current = myTopics.map(topic => {
        const onRow = ({ payload }: any) => {
          const rec = payload?.record;
          if (rec) setMessages(prev => mergeMessages(prev, [toMessage(rec)]));
        };
        const ch = supabase.channel(topic, { config: { private: true } });
        ch.on('broadcast', { event: 'INSERT' }, onRow)
          .on('broadcast', { event: 'UPDATE' }, onRow)
          .subscribe(status => {
            // On (re)connect catch up on anything missed; on a transient error /
            // timeout still fall back to a refetch so a channel that never
            // reaches SUBSCRIBED doesn't leave the conversation silently stale.
            if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') catchUp();
          });
        return ch;
      });
    })();
    return () => { cancelled = true; teardown(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicKey, myId, isStudent]);

  // Re-auth the realtime socket on token refresh (private channels otherwise
  // drop after the JWT rotates), and re-auth + catch up when the app foregrounds.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'TOKEN_REFRESHED') authRealtime();
    });
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && myId && isStudent) { authRealtime().then(catchUp); }
    });
    return () => { data.subscription.unsubscribe(); sub.remove(); };
  }, [myId, isStudent, catchUp]);

  // ---- selectors ----------------------------------------------------------
  const reachable = useMemo(() => new Set<string>([
    ...dmPartners.map(id => `dm:${id}`),
    ...myClubs.map(c => `club:${c.id}`),
    ...mySections.map(s => `section:${s.id}`),
  ]), [dmPartners, myClubs, mySections]);

  const unreadByConv = useMemo(() => {
    const m: Record<string, number> = {};
    if (!myId) return m;
    for (const msg of messages) {
      if (msg.senderId === myId || msg.deletedAt) continue;
      const key = convKeyOf(msg, myId);
      if (!reachable.has(key)) continue;
      const readAt = reads[key];
      if (readAt && new Date(msg.createdAt) <= new Date(readAt)) continue;
      m[key] = (m[key] || 0) + 1;
    }
    return m;
  }, [messages, reads, reachable, myId]);
  const totalUnread = useMemo(() => Object.values(unreadByConv).reduce((a, b) => a + b, 0), [unreadByConv]);

  const isBlocked = useCallback((id: string) => blocked.includes(id), [blocked]);

  const threadMessages = useCallback((kind: MsgKind, id: string) => {
    if (!myId) return [];
    const key = convKey(kind, id);
    return messages
      .filter(msg => convKeyOf(msg, myId) === key)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  }, [messages, myId]);

  // ---- actions ------------------------------------------------------------
  const send = useCallback(async (kind: MsgKind, id: string, body: string): Promise<Result> => {
    if (!myId) return { ok: false, error: 'Not signed in.' };
    const trimmed = body.trim();
    if (!trimmed) return { ok: false };
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const pair = kind === 'dm' ? dmPair(myId, id) : null;
    const temp: Message = {
      id: tempId, kind,
      clubId: kind === 'club' ? id : null,
      sectionId: kind === 'section' ? id : null,
      peerLow: pair?.low ?? null, peerHigh: pair?.high ?? null,
      senderId: myId, body: trimmed,
      editedAt: null, deletedAt: null, deletedBy: null,
      createdAt: new Date().toISOString(), pending: true,
    };
    setMessages(prev => [...prev, temp]);
    const res = await insertMessage(kind, id, trimmed, myId);
    if (!res.ok) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return { ok: false, error: res.error };
    }
    setMessages(prev => mergeMessages(prev, [res.data], tempId));
    return { ok: true };
  }, [myId]);

  const edit = useCallback(async (msgId: string, body: string): Promise<Result> => {
    const trimmed = body.trim();
    if (!trimmed) return { ok: false };
    setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, body: trimmed, editedAt: new Date().toISOString() } : m)));
    const res = await updateMessageBody(msgId, trimmed);
    if (!res.ok) { reload(); return { ok: false, error: res.error }; }
    setMessages(prev => mergeMessages(prev, [res.data]));
    return { ok: true };
  }, [reload]);

  const remove = useCallback(async (msgId: string): Promise<Result> => {
    setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, deletedAt: new Date().toISOString(), body: '' } : m)));
    const res = await softDeleteMessage(msgId);
    if (!res.ok) { reload(); return { ok: false, error: res.error }; }
    setMessages(prev => mergeMessages(prev, [res.data]));
    return { ok: true };
  }, [reload]);

  const block = useCallback(async (id: string): Promise<Result> => {
    if (!myId) return { ok: false };
    setBlocked(prev => (prev.includes(id) ? prev : [...prev, id]));
    const res = await insertBlock(myId, id);
    if (!res.ok) { setBlocked(prev => prev.filter(x => x !== id)); return { ok: false, error: res.error }; }
    return { ok: true };
  }, [myId]);

  const unblock = useCallback(async (id: string): Promise<Result> => {
    if (!myId) return { ok: false };
    setBlocked(prev => prev.filter(x => x !== id));
    const res = await deleteBlock(myId, id);
    if (!res.ok) { setBlocked(prev => (prev.includes(id) ? prev : [...prev, id])); return { ok: false, error: res.error }; }
    return { ok: true };
  }, [myId]);

  const markRead = useCallback(async (convKeyStr: string, iso: string) => {
    if (!myId) return;
    let changed = false;
    setReads(prev => {
      const cur = prev[convKeyStr];
      if (cur && new Date(cur) >= new Date(iso)) return prev;
      changed = true;
      return { ...prev, [convKeyStr]: iso };
    });
    if (changed) await upsertRead(myId, convKeyStr);
  }, [myId]);

  const loadConversation = useCallback(async (kind: MsgKind, id: string) => {
    if (!myId) return { ok: false, count: 0 };
    const res = await fetchConversation(kind, id, myId, 50);
    if (!res.ok) return { ok: false, count: 0 };
    setMessages(prev => mergeMessages(prev, res.data.messages));
    return { ok: true, count: res.data.count };
  }, [myId]);

  const fetchOlderMessages = useCallback(async (kind: MsgKind, id: string, beforeIso: string) => {
    if (!myId) return { ok: false, count: 0 };
    const res = await fetchOlder(kind, id, myId, beforeIso, 50);
    if (!res.ok) return { ok: false, count: 0 };
    setMessages(prev => mergeMessages(prev, res.data));
    return { ok: true, count: res.data.length };
  }, [myId]);

  const search = useCallback(async (kind: MsgKind, id: string, term: string) => {
    if (!myId || !term.trim()) return [];
    const res = await searchConversation(kind, id, myId, term.trim(), 30);
    return res.ok ? res.data : [];
  }, [myId]);

  const value: MessagesValue = {
    messages, blocked, dmPartners, myClubs, mySections, loading,
    unreadByConv, totalUnread, isBlocked, threadMessages,
    send, edit, remove, block, unblock, markRead,
    loadConversation, fetchOlderMessages, search, reload,
  };

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages(): MessagesValue {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used inside <MessagesProvider>');
  return ctx;
}
