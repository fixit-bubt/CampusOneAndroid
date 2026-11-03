// Admin-only: create staff/admin accounts from inside the app.
// A separate client signs the new user up (so the admin's own session is
// untouched), the signup trigger creates the profile as 'student', then the
// admin session sets the real role.
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

export async function createUserAsAdmin({
  name,
  email,
  password,
  role,
  expertise,
}: CreateUserInput): Promise<ServiceResult<null>> {
  const tmp = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await tmp.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim() } },
  });

  if (error) {
    return {
      ok: false,
      error: /already/i.test(error.message)
        ? 'An account with this email already exists.'
        : error.message,
    };
  }

  // When confirmation is on and the email already exists, Supabase returns an
  // obfuscated user with empty identities and no error. Bail out before we
  // overwrite that real account's role.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    await tmp.auth.signOut();
    return { ok: false, error: 'An account with this email already exists.' };
  }

  // If email confirmation is on, signUp returns no user - we can't set the role.
  if (!data.user) {
    await tmp.auth.signOut();
    return {
      ok: false,
      error: 'Account created, but it must confirm its email before the role can be set.',
    };
  }

  // Signup trigger creates the profile - set the requested role and expertise with retry
  let updatedRows: any[] | null = null;
  let updateError: any = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await supabase
      .from('profiles')
      .update({ role, expertise: expertise ?? null })
      .eq('id', data.user.id)
      .select('id');

    if (!res.error && res.data && res.data.length === 1) {
      updatedRows = res.data;
      updateError = null;
      break;
    }
    if (res.error) {
      updateError = res.error;
    }

    // Brief wait if trigger is still committing
    await new Promise((r) => setTimeout(r, 250));
  }

  await tmp.auth.signOut();
  if (updateError) return { ok: false, error: updateError.message };
  if (!updatedRows || updatedRows.length !== 1) {
    return {
      ok: false,
      error: 'Account created, but setting the assigned role timed out. You can verify it in the Users directory.',
    };
  }
  return { ok: true, data: null };
}
