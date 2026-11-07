import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '../types/supabase';

export const supabaseUrl = 'https://xhgpxvyqrufbbuivttmi.supabase.co';
export const supabaseAnonKey = 'sb_publishable_Hkd8CzosqszKyX1dua28DA_c984IDok';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Signed-in user id from the local session. auth.getUser() makes a network
// round-trip to the Auth server on every call; for filtering our own rows
// the local id is enough, since RLS still checks the JWT server-side.
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}
