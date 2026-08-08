// Chatbot Service — talks to the `chat` edge function (Gemini proxy), plus
// DB persistence for chat history (chatbot_messages, self-scoped RLS).

import { fetch as expoFetch } from 'expo/fetch';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import type { ServiceResult } from './authService';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface StoredChatMessage extends ChatTurn {
  id: string;
}

export async function loadChatHistory(userId: string): Promise<ServiceResult<StoredChatMessage[]>> {
  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('id, role, body')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []).map((r: any) => ({ id: r.id, role: r.role, text: r.body })) };
}

export async function saveChatMessage(userId: string, role: 'user' | 'model', text: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('chatbot_messages').insert({ user_id: userId, role, body: text });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function clearChatHistory(userId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('chatbot_messages').delete().eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export interface ChatStreamHandlers {
  onChunk: (text: string) => void;
  // Discards whatever text has been shown so far this turn — the model
  // spoke a little, then decided to call a tool, so what streamed live
  // wasn't actually its answer. Caller should clear the in-progress bubble.
  onRetract: () => void;
  onDone: (fullText: string) => void;
  onError: (message: string) => void;
}

// Streams the assistant's reply via SSE. Uses expo/fetch (not supabase-js's
// functions.invoke, which buffers the whole response) because it's the
// WinterCG fetch implementation with real ReadableStream support on
// Android/iOS — the stock RN fetch polyfill can't stream response bodies.
export async function askChatbotStream(message: string, history: ChatTurn[], handlers: ChatStreamHandlers): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    handlers.onError('Not signed in');
    return;
  }

  let res: Response;
  try {
    res = await expoFetch(`${supabaseUrl}/functions/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
      body: JSON.stringify({ message, history }),
    });
  } catch (e) {
    handlers.onError(e instanceof Error ? e.message : String(e));
    return;
  }

  if (!res.ok || !res.body) {
    let msg = `request failed: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      // not JSON — keep the generic message
    }
    handlers.onError(msg);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!dataLine) continue;
        const jsonStr = dataLine.slice(5).trim();
        if (!jsonStr) continue;
        let evt: any;
        try {
          evt = JSON.parse(jsonStr);
        } catch {
          continue;
        }
        if (evt.type === 'chunk') handlers.onChunk(evt.text);
        else if (evt.type === 'retract') handlers.onRetract();
        else if (evt.type === 'done') return handlers.onDone(evt.text);
        else if (evt.type === 'error') return handlers.onError(evt.message);
      }
    }
  } catch (e) {
    handlers.onError(e instanceof Error ? e.message : String(e));
  }
}
