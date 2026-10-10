// CampusOne — Marketplace Service
// Manages local wishlist / bookmarks, in-app messaging context grants,
// and synchronized cache mutations for listings.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getCache, setCache, CacheKeys } from './cacheService';
import type { Listing } from '../types/database';

const SAVED_STORAGE_KEY = '@c1_saved_listings';

// ── Saved / Wishlist Items (On-Device Persistence) ─────────────────────────

export async function getSavedListingIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleSavedListing(id: string): Promise<{ saved: boolean; ids: string[] }> {
  try {
    const current = await getSavedListingIds();
    const set = new Set(current);
    const wasSaved = set.has(id);
    if (wasSaved) {
      set.delete(id);
    } else {
      set.add(id);
    }
    const next = Array.from(set);
    await AsyncStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
    return { saved: !wasSaved, ids: next };
  } catch {
    return { saved: false, ids: [] };
  }
}

// ── In-App Direct Chat Context Grant ────────────────────────────────────────

/**
 * Unlocks a 90-day symmetric DM context grant between buyer and seller
 * via the database's `open_dm_thread` RPC.
 */
export async function openListingDmThread(code: string, sellerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('open_dm_thread', {
      p_context_type: 'listing',
      p_code: code,
      p_target: sellerId,
    });
    if (error) return { success: false, error: error.message };
    return { success: !!data };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to open message thread' };
  }
}

// ── Synchronized Status & Cache Mutations ───────────────────────────────────

export async function updateListingStatus(
  id: string,
  newStatus: 'Available' | 'Sold'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('listings')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    // Synchronously update memory and AsyncStorage cache
    const cached = await getCache<Listing[]>(CacheKeys.MARKET_LISTINGS);
    if (cached) {
      const updated = cached.map(l => (l.id === id ? { ...l, status: newStatus } : l));
      setCache(CacheKeys.MARKET_LISTINGS, updated);
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to update status' };
  }
}

export async function deleteListingRow(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    // Remove from local cache
    const cached = await getCache<Listing[]>(CacheKeys.MARKET_LISTINGS);
    if (cached) {
      const filtered = cached.filter(l => l.id !== id);
      setCache(CacheKeys.MARKET_LISTINGS, filtered);
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Failed to delete listing' };
  }
}
