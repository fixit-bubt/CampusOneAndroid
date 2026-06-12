// Admin-only: create staff/admin/student accounts from inside the app.
// Mirrors the web app's createUser (store.jsx): a throwaway client signs the
// new user up (so the admin's own session is untouched), the signup trigger
// creates the profile as 'student', then the admin session sets the real role.
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import type { ServiceResult } from './authService';
import type { Profile } from '../types/database';

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Profile['role'];
  expertise?: string | null;
}

export async function createUserAsAdmin({ name, email, password, role, expertise }: CreateUserInput): Promise<ServiceResult<null>> {
  const tmp = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await tmp.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim() } },
  });
  if (error) {
    return { ok: false, error: /already/i.test(error.message) ? 'An account with this email already exists.' : error.message };
  }
  // When confirmation is ON and the email already exists, Supabase returns an
  // obfuscated user with empty identities (anti-enumeration) and no error.
  // Bail out before we accidentally overwrite that real account's role.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    await tmp.auth.signOut();
    return { ok: false, error: 'An account with this email already exists.' };
  }
  // If email confirmation is on, signUp returns no user — we can't set the role.
  if (!data.user) {
    await tmp.auth.signOut();
    return { ok: false, error: 'Account created, but it must confirm its email before the role can be set. Set the role from the Users list once confirmed.' };
  }

  // Signup trigger created the profile as 'student' — set the requested role.
  const { data: updated, error: e2 } = await supabase
    .from('profiles')
    .update({ role, expertise: expertise ?? null })
    .eq('id', data.user.id)
    .select('id');
  await tmp.auth.signOut();
  if (e2) return { ok: false, error: e2.message };
  if (!updated || updated.length !== 1) {
    return { ok: false, error: 'Account created, but assigning the role failed — set it from the Users list.' };
  }
  return { ok: true, data: null };
}
