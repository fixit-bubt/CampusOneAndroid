// Native Google sign-in -> Supabase signInWithIdToken.
//
// SETUP (one-time, outside the app):
//  1. Google Cloud Console: create a Web client ID (for Supabase) and an
//     Android client ID (package com.bubt.campusone + the release keystore SHA-1).
//  2. Supabase dashboard -> Authentication -> Providers -> enable Google,
//     paste the Web client ID + secret.
//  3. Paste the Web client ID below.
export const GOOGLE_WEB_CLIENT_ID = '319379123495-9nhac1h2oh4n9tgnln9bv4kudv1jljb5.apps.googleusercontent.com';

import { supabase } from './supabase';

export function isGoogleConfigured(): boolean {
  return GOOGLE_WEB_CLIENT_ID.trim().length > 0;
}

export async function signInWithGoogle(): Promise<void> {
  if (!isGoogleConfigured()) {
    throw new Error('Google sign-in is not configured yet.');
  }
  // Lazy require: the native module is only present in a custom dev/release build,
  // never in Expo Go. Requiring lazily keeps the rest of the app importable.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const userInfo: any = await GoogleSignin.signIn();
  const idToken: string | undefined = userInfo?.data?.idToken ?? userInfo?.idToken;
  if (!idToken) throw new Error('No ID token returned from Google.');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw error;
  // onAuthStateChange in authStore picks up the new session and fetches the profile.
}
