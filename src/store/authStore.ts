// Auth Store — React context + useReducer.
// Wrap the app in <AuthProvider>, then call useAuth() anywhere.

import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { unregisterPushToken } from '../lib/push';
import type { Profile } from '../types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoaded: boolean;
  profileError: boolean;
}

type AuthAction =
  | { type: 'SET_SESSION'; session: Session | null }
  | { type: 'SET_PROFILE'; profile: Profile | null }
  | { type: 'PROFILE_ERROR' }
  | { type: 'SIGN_OUT' }
  | { type: 'LOADED' };

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        session: action.session,
        user: action.session?.user ?? null,
        loading: false,
      };
    case 'SET_PROFILE':
      return { ...state, profile: action.profile, profileLoaded: true, profileError: false };
    case 'PROFILE_ERROR':
      // Keep profileLoaded:false so the navigator does NOT fall through to the
      // student UI; surface profileError so a retry screen can be shown.
      return { ...state, profileError: true };
    case 'SIGN_OUT':
      return { session: null, user: null, profile: null, loading: false, profileLoaded: false, profileError: false };
    case 'LOADED':
      return { ...state, loading: false };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    session: null,
    user: null,
    profile: null,
    loading: true,
    profileLoaded: false,
    profileError: false,
  });

  // Token to discard stale profile fetches: getSession() and onAuthStateChange
  // can both fire for the same user on cold start, racing each other.
  const reqIdRef = useRef(0);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      dispatch({ type: 'SET_SESSION', session: data.session });
      if (data.session) fetchProfile(data.session.user.id);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_SESSION', session });
      if (session) fetchProfile(session.user.id);
      else dispatch({ type: 'SET_PROFILE', profile: null });
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const myReq = ++reqIdRef.current;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (myReq !== reqIdRef.current) return; // a newer fetch superseded this one
    if (error) {
      console.error('fetchProfile failed:', error.message);
      // Do NOT mark the profile as loaded-with-null; that silently drops
      // admin/staff into the student UI. Surface an error for retry instead.
      dispatch({ type: 'PROFILE_ERROR' });
      return;
    }
    dispatch({ type: 'SET_PROFILE', profile: data as Profile | null });
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    // The profiles row is created by the handle_new_user DB trigger
    // (SECURITY DEFINER) from options.data.full_name + email, role='student'.
    // Don't upsert from the client: profiles has no INSERT policy, so the
    // upsert fails with 42501 and used to break registration entirely.
  }

  async function signOut() {
    reqIdRef.current++; // invalidate any in-flight profile fetch
    await unregisterPushToken(); // stop pushes to this device (shared phones)
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('signOut failed:', e);
    }
    // onAuthStateChange(SIGNED_OUT) also clears state; dispatch here too so the
    // UI updates immediately even if the network call was slow.
    dispatch({ type: 'SIGN_OUT' });
  }

  async function refreshProfile() {
    if (state.user) await fetchProfile(state.user.id);
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { ...state, signIn, signUp, signOut, refreshProfile } },
    children,
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
