// Auth Store - React context + useReducer.
// Wrap the app in <AuthProvider>, then call useAuth() anywhere.

import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { unregisterPushToken } from '../lib/push';
import { setMonitoringUser } from '../lib/monitoring';
import { clearPeople } from '../services/peopleService';
import { clearAllCache } from '../services/cacheService';
import type { Profile } from '../types/database';

const CACHED_PROFILE_KEY = (uid: string) => `@c1_profile_${uid}`;

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
    case 'SET_SESSION': {
      const isSameUser = !!state.user?.id && !!action.session?.user?.id && action.session.user.id === state.user.id;
      return {
        ...state,
        session: action.session,
        user: action.session?.user ?? null,
        loading: false,
        profile: isSameUser ? state.profile : null,
        profileLoaded: isSameUser ? state.profileLoaded : false,
        profileError: isSameUser ? state.profileError : false,
      };
    }
    case 'SET_PROFILE':
      return {
        ...state,
        profile: action.profile,
        profileLoaded: action.profile !== null,
        profileError: false,
      };
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
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsVerification: boolean }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
    supabase.auth.getSession().then(async ({ data }) => {
      dispatch({ type: 'SET_SESSION', session: data.session });
      const uid = data.session?.user?.id;
      if (uid) {
        // Pre-load cached profile for instant cold start and offline access
        try {
          const cachedRaw = await AsyncStorage.getItem(CACHED_PROFILE_KEY(uid));
          if (cachedRaw) {
            dispatch({ type: 'SET_PROFILE', profile: JSON.parse(cachedRaw) });
          }
        } catch {}
        fetchProfile(uid);
      }
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      dispatch({ type: 'SET_SESSION', session });
      setMonitoringUser(session?.user.id ?? null);
      if (session?.user?.id) {
        const uid = session.user.id;
        try {
          const cachedRaw = await AsyncStorage.getItem(CACHED_PROFILE_KEY(uid));
          if (cachedRaw) {
            dispatch({ type: 'SET_PROFILE', profile: JSON.parse(cachedRaw) });
          }
        } catch {}
        fetchProfile(uid);
      } else {
        dispatch({ type: 'SIGN_OUT' });
      }
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
    if (error || !data) {
      // Check if we have a cached profile before surfacing PROFILE_ERROR
      let hasCached = false;
      try {
        const cachedRaw = await AsyncStorage.getItem(CACHED_PROFILE_KEY(userId));
        if (cachedRaw) {
          dispatch({ type: 'SET_PROFILE', profile: JSON.parse(cachedRaw) });
          hasCached = true;
        }
      } catch {}

      if (!hasCached && !state.profile) {
        console.error('fetchProfile failed without cache:', error?.message ?? 'Profile not found');
        // Do NOT mark the profile as loaded-with-null; that silently drops
        // admin/staff into the student UI. Surface an error for retry instead.
        dispatch({ type: 'PROFILE_ERROR' });
      }
      return;
    }
    // Persist latest profile for offline launches
    try {
      await AsyncStorage.setItem(CACHED_PROFILE_KEY(userId), JSON.stringify(data));
    } catch {}
    dispatch({ type: 'SET_PROFILE', profile: data as Profile });
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.user?.id) {
      await fetchProfile(data.session.user.id);
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    // The profiles row is created by the handle_new_user DB trigger
    // (SECURITY DEFINER) from options.data.full_name + email, role='student'.
    // Don't upsert from the client: profiles has no INSERT policy, so the
    // upsert fails with 42501 and used to break registration entirely.
    //
    // With "Confirm email" ON in the dashboard, signUp returns no session and
    // the user must enter the emailed code first (VerifyEmail screen). With
    // auto-confirm the session opens immediately and this stays false.
    return { needsVerification: !data.session };
  }

  async function signOut() {
    reqIdRef.current++; // invalidate any in-flight profile fetch
    clearPeople();      // drop the cached roster so the next account starts fresh
    clearAllCache();    // drop feature cache on sign-out
    if (state.user?.id) {
      AsyncStorage.removeItem(CACHED_PROFILE_KEY(state.user.id)).catch(() => {});
    }
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

  async function deleteAccount() {
    reqIdRef.current++;
    clearPeople();
    clearAllCache();
    if (state.user?.id) {
      AsyncStorage.removeItem(CACHED_PROFILE_KEY(state.user.id)).catch(() => {});
    }
    await unregisterPushToken().catch(() => {});
    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      console.error('delete_own_account failed:', error.message);
      throw error;
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('signOut after deletion failed:', e);
    }
    dispatch({ type: 'SIGN_OUT' });
  }

  async function refreshProfile() {
    if (state.user) await fetchProfile(state.user.id);
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { ...state, signIn, signUp, signOut, deleteAccount, refreshProfile } },
    children,
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
