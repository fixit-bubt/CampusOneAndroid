// Chatbot Service — talks to the `chat` edge function (Gemini proxy), plus
// DB persistence for chat history (chatbot_messages, self-scoped RLS).

import { supabase } from '../lib/supabase';
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

export async function askChatbot(message: string, history: ChatTurn[]): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.functions.invoke('chat', {
    body: { message, history },
  });
  if (error) {
    // On non-2xx, supabase-js gives a generic error.message and puts the real
    // response on error.context (a Response) — pull the actual message out.
    let msg = error.message;
    const ctx = (error as any)?.context;
    if (ctx instanceof Response) {
      try {
        const body = await ctx.clone().json();
        if (body?.error) msg = body.error;
      } catch {
        // response wasn't JSON — keep the generic message
      }
    }
    return { ok: false, error: msg };
  }
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true, data: data?.reply ?? '' };
}
