import { supabase } from '../lib/supabase';
import { getCache, setCache, removeCache, CacheKeys } from './cacheService';
import type { Announcement } from '../types/database';

export interface AnnouncementCategoryItem {
  id: string;
  label: string;
  slug?: string;
  icon: string;
}

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategoryItem[] = [
  { id: 'all',      label: 'All Categories',      slug: undefined,       icon: 'grid' },
  { id: 'exam',     label: 'Exams & Routines',    slug: 'exam-related',  icon: 'file-text' },
  { id: 'holiday',  label: 'Holidays & Closures', slug: 'offday',        icon: 'calendar' },
  { id: 'semester', label: 'Registration & Fees', slug: 'semester',      icon: 'dollar-sign' },
  { id: 'class',    label: 'Classes & Labs',      slug: 'class-related', icon: 'book' },
  { id: 'general',  label: 'General University',  slug: 'general',       icon: 'info' },
  { id: 'tender',   label: 'Tenders & Office',    slug: 'tender',        icon: 'briefcase' },
];

export const KNOWN_DEPARTMENTS = [
  { id: 'ALL',      label: 'All Departments', shortCode: 'ALL' },
  { id: 'CSE',      label: 'Computer Science & Engineering', shortCode: 'CSE' },
  { id: 'EEE',      label: 'Electrical & Electronic Engineering', shortCode: 'EEE' },
  { id: 'Civil',    label: 'Civil Engineering', shortCode: 'Civil' },
  { id: 'Textile',  label: 'Textile Engineering', shortCode: 'Textile' },
  { id: 'Business', label: 'Faculty of Business (BBA / MBA)', shortCode: 'BBA' },
  { id: 'Law',      label: 'Law & Justice', shortCode: 'Law' },
  { id: 'English',  label: 'Department of English', shortCode: 'ENG' },
  { id: 'Economics',label: 'Economics', shortCode: 'ECON' },
  { id: 'EXAM',     label: 'Controller of Examinations', shortCode: 'EXAM' },
  { id: 'REG',      label: 'Office of the Registrar', shortCode: 'REG' },
];

export async function fetchAnnouncementsFeed(userId?: string): Promise<{
  items: Announcement[];
  readIds: Set<string>;
  savedIds: Set<string>;
  error?: string;
}> {
  try {
    const fourMonthsAgo = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();

    const [aRes, rRes, bRes] = await Promise.all([
      supabase
        .from('announcements')
        .select('*')
        .is('deleted_at', null)
        .gte('created_at', fourMonthsAgo)
        .order('created_at', { ascending: false })
        .limit(500),
      userId
        ? supabase.from('announcement_reads').select('announcement_id').eq('user_id', userId).limit(500)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase.from('announcement_bookmarks').select('announcement_id').eq('user_id', userId).limit(500)
        : Promise.resolve({ data: [] }),
    ]);

    if (aRes.error) throw aRes.error;

    let items = (aRes.data ?? []) as Announcement[];
    const readIds = new Set<string>((rRes.data ?? []).map((r: any) => r.announcement_id));
    const savedIds = new Set<string>((bRes.data ?? []).map((b: any) => b.announcement_id));

    // Preserve saved/bookmarked notices permanently even if older than 4 months
    const existingIds = new Set(items.map((i) => i.id));
    const missingSavedIds = Array.from(savedIds).filter((id) => !existingIds.has(id));
    if (missingSavedIds.length > 0) {
      const { data: olderSaved } = await supabase
        .from('announcements')
        .select('*')
        .in('id', missingSavedIds)
        .is('deleted_at', null);
      if (olderSaved && olderSaved.length > 0) {
        items = [...items, ...(olderSaved as Announcement[])];
        items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      }
    }

    // Cache
    setCache(CacheKeys.ANNOUNCEMENTS, items);
    if (userId) {
      setCache(CacheKeys.ANNOUNCEMENT_READS(userId), Array.from(readIds));
      setCache(CacheKeys.ANNOUNCEMENT_BOOKMARKS(userId), Array.from(savedIds));
    }
    // Invalidate home updates so community feed stays fresh
    removeCache(CacheKeys.HOME_UPDATES).catch(() => {});

    return { items, readIds, savedIds };
  } catch (err: any) {
    return {
      items: [],
      readIds: new Set(),
      savedIds: new Set(),
      error: err.message,
    };
  }
}

export async function toggleAnnouncementBookmark(
  announcementId: string,
  userId: string,
  currentlySaved: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentlySaved) {
      const { error } = await supabase
        .from('announcement_bookmarks')
        .delete()
        .eq('announcement_id', announcementId)
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('announcement_bookmarks')
        .upsert({ announcement_id: announcementId, user_id: userId }, { onConflict: 'user_id,announcement_id' });
      if (error) throw error;
    }

    // Refresh bookmarks cache
    const { data } = await supabase
      .from('announcement_bookmarks')
      .select('announcement_id')
      .eq('user_id', userId);
    if (data) {
      setCache(CacheKeys.ANNOUNCEMENT_BOOKMARKS(userId), data.map((b: any) => b.announcement_id));
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function triggerNoticeSync(isDeep = false): Promise<{
  success: boolean;
  totalScanned?: number;
  newAdded?: number;
  updatedCount?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-notices', {
      headers: isDeep ? { 'x-deep-crawl': 'true' } : {},
      body: { triggered_by: 'app', deep: isDeep },
    });
    if (error) throw error;
    await removeCache(CacheKeys.HOME_UPDATES);
    await removeCache(CacheKeys.ANNOUNCEMENTS);
    return {
      success: true,
      totalScanned: data?.total_scanned,
      newAdded: data?.new_added,
      updatedCount: data?.updated_count,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to sync notices' };
  }
}
