// Chatbot Service — talks to the `chat` edge function (Gemini proxy). No DB
// persistence yet; history is kept client-side for the life of the screen.

import { supabase } from '../lib/supabase';
import type { ServiceResult } from './authService';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
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
