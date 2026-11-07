// Auth Store - React context + useReducer.
// Wrap the app in <AuthProvider>, then call useAuth() anywhere.

import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { unregisterPushToken } from '../lib/push';
import { setMonitoringUser } from '../lib/monitoring';
import { clearPeople } from '../services/peopleService';
import { clearAllCache } from '../services/cacheService';
import type { Profile } from '../types/database';

const SECURE_PROFILE_KEY = (uid: string) => `c1_profile_${uid}`;
const CACHED_PROFILE_KEY = (uid: string) => `@c1_profile_${uid}`;

async function getCachedProfile(uid: string): Promise<Profile | null> {
  try {
    const raw = await SecureStore.getItemAsync(SECURE_PROFILE_KEY(uid));
    if (raw) return JSON.parse(raw);
  } catch {}
  try {
    const fallback = await AsyncStorage.getItem(CACHED_PROFILE_KEY(uid));
    if (fallback) return JSON.parse(fallback);
  } catch {}
  return null;
}

async function setCachedProfile(uid: string, profile: Profile): Promise<void> {
  const json = JSON.stringify(profile);
  try {
    await SecureStore.setItemAsync(SECURE_PROFILE_KEY(uid), json);
  } catch {}
}

async function clearCachedProfile(uid: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_PROFILE_KEY(uid));
  } catch {}
  try {
    await AsyncStorage.removeItem(CACHED_PROFILE_KEY(uid));
  } catch {}
}

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
      // Hourly token refreshes hand us a new session object for the same user.
      // Nothing in the tree reads the token from context, so keep the old
      // object and skip re-rendering every useAuth() consumer.
      if (isSameUser && state.session) {
        return state.loading ? { ...state, loading: false } : state;
      }
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
      // Cached profile renders first; the network copy is usually identical.
      if (
        action.profile && state.profile && state.profileLoaded && !state.profileError &&
        JSON.stringify(action.profile) === JSON.stringify(state.profile)
      ) {
        return state;
      }
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

export interface StudentRegistrationData {
  studentId?: string;
  department?: string;
  intake?: string;
  section?: string;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, extra?: StudentRegistrationData) => Promise<{ needsVerification: boolean }>;
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

  // Token to discard stale profile fetches.
  const reqIdRef = useRef(0);
  // Latest state for the action functions, so they can stay referentially
  // stable instead of being rebuilt on every auth render.
  const stateRef = useRef(state);
  stateRef.current = state;
  // User whose profile has already been requested; token refreshes and
  // repeated SIGNED_IN events for the same user must not refetch it.
  const loadedUidRef = useRef<string | null>(null);
  const inFlightRef = useRef<{ uid: string; promise: Promise<void> } | null>(null);

  useEffect(() => {
    // INITIAL_SESSION fires on subscribe, so this one listener covers the
    // cold start too (a separate getSession() call fetched the profile twice).
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      dispatch({ type: 'SET_SESSION', session });
      const uid = session?.user?.id ?? null;
      if (!uid) {
        loadedUidRef.current = null;
        setMonitoringUser(null);
        dispatch({ type: 'SIGN_OUT' });
        return;
      }
      if (uid === loadedUidRef.current && event !== 'USER_UPDATED') return;
      loadedUidRef.current = uid;
      setMonitoringUser(uid);
      // Supabase calls made inside this callback can deadlock on the auth
      // lock; run them on the next tick.
      setTimeout(() => {
        getCachedProfile(uid).then((cached) => {
          if (cached && !stateRef.current.profile) dispatch({ type: 'SET_PROFILE', profile: cached });
        });
        fetchProfile(uid);
      }, 0);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Joins a fetch already running for the same user instead of starting another.
  function fetchProfile(userId: string): Promise<void> {
    const cur = inFlightRef.current;
    if (cur && cur.uid === userId) return cur.promise;
    const promise = doFetchProfile(userId).finally(() => {
      if (inFlightRef.current?.promise === promise) inFlightRef.current = null;
    });
    inFlightRef.current = { uid: userId, promise };
    return promise;
  }

  async function doFetchProfile(userId: string) {
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
      const cached = await getCachedProfile(userId);
      if (cached) {
        dispatch({ type: 'SET_PROFILE', profile: cached });
        hasCached = true;
      }

      if (!hasCached && !stateRef.current.profile) {
        console.error('fetchProfile failed without cache:', error?.message ?? 'Profile not found');
        // Do NOT mark the profile as loaded-with-null; that silently drops
        // admin/staff into the student UI. Surface an error for retry instead.
        dispatch({ type: 'PROFILE_ERROR' });
      }
      return;
    }

    // Auto-sync any student signup credentials stored in user_metadata
    const profileData = data as Profile;
    const sessionRes = await supabase.auth.getSession();
    const sessionUser = sessionRes.data.session?.user ?? stateRef.current.session?.user;
    if (sessionUser && !profileData.student_id && sessionUser.user_metadata?.student_id) {
      const meta = sessionUser.user_metadata;
      try {
        await supabase
          .from('profiles')
          .update({
            student_id: meta.student_id,
            department: meta.department ?? profileData.department,
            intake: meta.intake ?? profileData.intake,
            section: meta.section ?? profileData.section,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        profileData.student_id = meta.student_id;
        if (meta.department) profileData.department = meta.department;
        if (meta.intake) profileData.intake = meta.intake;
        if (meta.section) profileData.section = meta.section;
      } catch {}
    }

    if (myReq !== reqIdRef.current) return;
    // Persist latest profile for offline launches (SecureStore writes are
    // slow, so skip when nothing changed).
    const prev = stateRef.current.profile;
    if (!prev || JSON.stringify(prev) !== JSON.stringify(profileData)) {
      await setCachedProfile(userId, profileData);
    }
    dispatch({ type: 'SET_PROFILE', profile: profileData });
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.user?.id) {
      await fetchProfile(data.session.user.id);
    }
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    extra?: StudentRegistrationData,
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          student_id: extra?.studentId?.trim() || null,
          department: extra?.department?.trim() || null,
          intake: extra?.intake?.trim() || null,
          section: extra?.section?.trim() || null,
        },
      },
    });
    if (error) throw error;

    // If auto-confirm is enabled, session opens immediately -> persist profile details directly
    if (data.session?.user?.id && extra) {
      try {
        await supabase
          .from('profiles')
          .update({
            student_id: extra.studentId?.trim() || null,
            department: extra.department?.trim() || null,
            intake: extra.intake?.trim() || null,
            section: extra.section?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.session.user.id);
      } catch {}
    }
    return { needsVerification: !data.session };
  }

  async function signOut() {
    reqIdRef.current++; // invalidate any in-flight profile fetch
    clearPeople();      // drop the cached roster so the next account starts fresh
    clearAllCache();    // drop feature cache on sign-out
    const uid = stateRef.current.user?.id;
    if (uid) clearCachedProfile(uid);
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
    const uid = stateRef.current.user?.id;
    if (uid) clearCachedProfile(uid);
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
    // Always a fresh read: callers use this right after editing the profile.
    const uid = stateRef.current.user?.id;
    if (uid) await doFetchProfile(uid);
  }

  // The actions only touch refs and dispatch, so the first render's closures
  // stay valid; keeping them stable lets the value below memoize on state.
  const actions = useMemo(
    () => ({ signIn, signUp, signOut, deleteAccount, refreshProfile }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
