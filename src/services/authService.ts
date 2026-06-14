// Auth Service — auth calls go through here rather than supabase.auth directly.

import { supabase } from '../lib/supabase';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function signIn(email: string, password: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<ServiceResult<null>> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function resetPassword(email: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
