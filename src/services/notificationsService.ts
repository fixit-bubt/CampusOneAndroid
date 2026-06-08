import { supabase } from '../lib/supabase';
import type { ServiceResult } from './authService';

export interface Notification {
  id: string;
  user_id: string;
  sector: string;
  title: string;
  body: string;
  read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export async function getMyNotifications(
  limit = 20,
): Promise<ServiceResult<Notification[]>> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Notification[] };
}

export async function markAllRead(): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function markRead(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
