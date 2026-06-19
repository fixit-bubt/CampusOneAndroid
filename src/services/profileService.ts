// Profile Service

import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import type { ServiceResult } from './authService';

export async function getProfile(userId: string): Promise<ServiceResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Profile };
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'department' | 'whatsapp' | 'intake' | 'section' | 'avatar_url' | 'directory_visible' | 'show_whatsapp' | 'expertise'>>,
): Promise<ServiceResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as Profile };
}
