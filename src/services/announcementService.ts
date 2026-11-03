import { DeviceEventEmitter } from 'react-native';
import { supabase } from '../lib/supabase';
import { getCache, setCache, removeCache, getCacheSync, CacheKeys } from './cacheService';
import type { Announcement } from '../types/database';
import { BANNERS_MAP } from '../utils/bannerUrl';

export interface BannerSlide {
  id: string;
  sourceId: string;
  type: 'Event' | 'Notice';
  title: string;
  subtitle: string;
  imageUri?: string;
  localImage?: any;
  route: string;
  params?: any;
  bannerOrder?: number;
  inBanner?: boolean;
}

export const FALLBACK_SLIDES: BannerSlide[] = [
  {
    id: 'fallback-blood',
    sourceId: 'fallback-blood',
    type: 'Event',
    title: 'Voluntary Blood Donation Drive & Free Health Camp',
    subtitle: 'Building 2 Main Lobby · 10:00',
    localImage: BANNERS_MAP['blood-drive.jpg'],
    route: 'Blood',
    bannerOrder: 1,
    inBanner: true,
  },
  {
    id: 'fallback-routine',
    sourceId: 'fallback-routine',
    type: 'Notice',
    title: 'Tri-Semester Final Examination Routine Published',
    subtitle: 'Examination Controller Department',
    localImage: BANNERS_MAP['exam-routine.jpg'],
    route: 'RoutinesBrowse',
    bannerOrder: 2,
    inBanner: true,
  },
  {
    id: 'fallback-convocation',
    sourceId: 'fallback-convocation',
    type: 'Notice',
    title: '10th Convocation Ceremony - Registration Open',
    subtitle: 'Office of the Registrar · Graduating Students',
    localImage: BANNERS_MAP['convocation-2026.jpg'],
    route: 'Announcements',
    bannerOrder: 3,
    inBanner: true,
  },
  {
    id: 'fallback-hackathon',
    sourceId: 'fallback-hackathon',
    type: 'Event',
    title: 'Innovate & Code: BUBT Inter-University Hackathon 2026',
    subtitle: 'Campus Auditorium & CSE Lab 402 · 09:30 AM',
    localImage: BANNERS_MAP['hackathon-2026.jpg'],
    route: 'EventsBrowse',
    bannerOrder: 4,
    inBanner: true,
  },
];

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
    const dbReadIds = (rRes.data ?? []).map((r: any) => r.announcement_id);
    const cachedReads = (await getCache<string[]>(CacheKeys.ANNOUNCEMENT_READS(userId || 'guest'))) || [];
    const mergedReadIds = Array.from(new Set([...dbReadIds, ...cachedReads]));
    const readIds = new Set<string>(mergedReadIds);
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
    setCache(CacheKeys.ANNOUNCEMENT_READS(userId || 'guest'), mergedReadIds);
    if (userId) {
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

export async function markAnnouncementAsRead(announcementId: string, userId: string): Promise<void> {
  if (!announcementId) return;
  try {
    const uid = userId || 'guest';
    // 1. Emit instant local broadcast event for 0ms cross-screen sync
    DeviceEventEmitter.emit('announcement_read', { id: announcementId });

    // 2. Optimistically update local cache
    const cachedReads = (await getCache<string[]>(CacheKeys.ANNOUNCEMENT_READS(uid))) || [];
    if (!cachedReads.includes(announcementId)) {
      await setCache(CacheKeys.ANNOUNCEMENT_READS(uid), [...cachedReads, announcementId]);
    }

    // 3. Upsert to Supabase if authenticated user
    if (userId && userId !== 'guest') {
      await supabase
        .from('announcement_reads')
        .upsert({ announcement_id: announcementId, user_id: userId }, { onConflict: 'announcement_id,user_id' });
    }
  } catch {}
}

export async function triggerNoticeSync(isDeep = false, force = false): Promise<{
  success: boolean;
  totalScanned?: number;
  newAdded?: number;
  updatedCount?: number;
  error?: string;
}> {
  try {
    const headers: Record<string, string> = {};
    if (force) {
      headers['x-force-sync'] = 'true';
    }
    const { data, error } = await supabase.functions.invoke('bubt-crawler', {
      headers,
      body: { tier: isDeep ? 'all' : 'fast', feature: isDeep ? 'all' : 'notices', triggered_by: 'app' },
    });
    if (error) throw error;
    await removeCache(CacheKeys.HOME_UPDATES);
    await removeCache(CacheKeys.ANNOUNCEMENTS);
    const noticesFeature = data?.features?.notices;
    return {
      success: true,
      totalScanned: noticesFeature?.scanned ?? data?.items_scanned ?? data?.total_scanned,
      newAdded: noticesFeature?.added ?? data?.items_added ?? data?.new_added,
      updatedCount: noticesFeature?.updated ?? data?.items_updated ?? data?.updated_count,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to sync notices' };
  }
}

let lastBannerFetchTime = 0;
const BANNER_CACHE_TTL_MS = 15 * 60 * 1000;

export async function fetchCuratedBannerSlides(forceRefresh = false): Promise<BannerSlide[]> {
  const now = Date.now();
  if (!forceRefresh && now - lastBannerFetchTime < BANNER_CACHE_TTL_MS) {
    const cached = getCacheSync<BannerSlide[]>(CacheKeys.HOME_BANNER);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  try {
    const fourMonthsAgo = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const [annRes, evRes] = await Promise.all([
      supabase
        .from('announcements')
        .select('id, title, department, priority, image_url, banner_image_url, attachment_url, in_banner, banner_order, created_at')
        .eq('in_banner', true)
        .is('deleted_at', null)
        .gte('created_at', fourMonthsAgo)
        .order('banner_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('events')
        .select('id, title, venue, time, date, category, banner_url, in_banner, banner_order')
        .eq('in_banner', true)
        .is('deleted_at', null)
        .gte('date', today)
        .order('banner_order', { ascending: true })
        .order('date', { ascending: true })
        .limit(6),
    ]);

    const slides: BannerSlide[] = [];

    if (annRes.data && annRes.data.length > 0) {
      annRes.data.forEach((a: any) => {
        const img = a.banner_image_url || a.image_url ||
          (a.attachment_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(a.attachment_url) ? a.attachment_url : null);
        slides.push({
          id: `ann-${a.id}`,
          sourceId: a.id,
          type: 'Notice',
          title: a.title,
          subtitle: a.department ? `${a.department} Department` : 'BUBT Notice',
          imageUri: img,
          route: 'AnnouncementDetail',
          params: { announcementId: a.id },
          bannerOrder: a.banner_order ?? 0,
          inBanner: true,
        });
      });
    }

    if (evRes.data && evRes.data.length > 0) {
      evRes.data.forEach((e: any) => {
        slides.push({
          id: `ev-${e.id}`,
          sourceId: e.id,
          type: 'Event',
          title: e.title,
          subtitle: `${e.venue || 'Campus'}${e.time ? ` · ${e.time}` : ''}`,
          imageUri: e.banner_url,
          route: 'EventDetail',
          params: { eventId: e.id },
          bannerOrder: e.banner_order ?? 0,
          inBanner: true,
        });
      });
    }

    slides.sort((a, b) => (a.bannerOrder ?? 0) - (b.bannerOrder ?? 0));
    const capped = slides.slice(0, 6);

    if (capped.length > 0) {
      lastBannerFetchTime = now;
      await setCache(CacheKeys.HOME_BANNER, capped);
      return capped;
    }

    lastBannerFetchTime = now;
    await setCache(CacheKeys.HOME_BANNER, FALLBACK_SLIDES);
    return FALLBACK_SLIDES;
  } catch {
    const cached = getCacheSync<BannerSlide[]>(CacheKeys.HOME_BANNER);
    return cached && cached.length > 0 ? cached : FALLBACK_SLIDES;
  }
}

export async function updateAnnouncementBannerStatus(
  id: string,
  inBanner: boolean,
  bannerOrder = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('set_announcement_banner', {
      p_id: id,
      p_in_banner: inBanner,
      p_order: bannerOrder,
    });

    if (error) {
      const { error: directErr } = await supabase
        .from('announcements')
        .update({ in_banner: inBanner, banner_order: inBanner ? bannerOrder : 0 })
        .eq('id', id);
      if (directErr) throw directErr;
    }

    lastBannerFetchTime = 0;
    await removeCache(CacheKeys.HOME_BANNER);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update banner status' };
  }
}

export async function saveBannerOrder(
  items: Array<{ id: string; type: 'announcement' | 'event'; order: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanItems = items.slice(0, 6);
    const { error } = await supabase.rpc('reorder_banner_items', {
      p_items: cleanItems,
    });

    if (error) {
      for (const item of cleanItems) {
        if (item.type === 'event') {
          await supabase.from('events').update({ in_banner: true, banner_order: item.order }).eq('id', item.id);
        } else {
          await supabase.from('announcements').update({ in_banner: true, banner_order: item.order }).eq('id', item.id);
        }
      }
    }

    lastBannerFetchTime = 0;
    await removeCache(CacheKeys.HOME_BANNER);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reorder banner items' };
  }
}

export async function fetchAdminBannerPool(): Promise<{
  activeSlides: BannerSlide[];
  availableAnnouncements: Announcement[];
  availableEvents: any[];
  error?: string;
}> {
  try {
    const fourMonthsAgo = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const [annRes, evRes] = await Promise.all([
      supabase
        .from('announcements')
        .select('*')
        .is('deleted_at', null)
        .gte('created_at', fourMonthsAgo)
        .order('banner_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .gte('date', today)
        .order('banner_order', { ascending: true })
        .order('date', { ascending: true })
        .limit(40),
    ]);

    if (annRes.error) throw annRes.error;
    if (evRes.error) throw evRes.error;

    const allAnn = (annRes.data ?? []) as Announcement[];
    const allEvents = evRes.data ?? [];

    const activeSlides: BannerSlide[] = [];

    allAnn.filter(a => a.in_banner).forEach(a => {
      const img = (a as any).banner_image_url || a.image_url ||
        (a.attachment_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(a.attachment_url) ? a.attachment_url : null);
      activeSlides.push({
        id: `ann-${a.id}`,
        sourceId: a.id,
        type: 'Notice',
        title: a.title,
        subtitle: a.department ? `${a.department} Department` : 'BUBT Notice',
        imageUri: img,
        route: 'AnnouncementDetail',
        params: { announcementId: a.id },
        bannerOrder: (a as any).banner_order ?? 0,
        inBanner: true,
      });
    });

    allEvents.filter((e: any) => e.in_banner).forEach((e: any) => {
      activeSlides.push({
        id: `ev-${e.id}`,
        sourceId: e.id,
        type: 'Event',
        title: e.title,
        subtitle: `${e.venue || 'Campus'}${e.time ? ` · ${e.time}` : ''}`,
        imageUri: e.banner_url,
        route: 'EventDetail',
        params: { eventId: e.id },
        bannerOrder: e.banner_order ?? 0,
        inBanner: true,
      });
    });

    activeSlides.sort((a, b) => (a.bannerOrder ?? 0) - (b.bannerOrder ?? 0));

    return {
      activeSlides,
      availableAnnouncements: allAnn,
      availableEvents: allEvents,
    };
  } catch (err: any) {
    return {
      activeSlides: [],
      availableAnnouncements: [],
      availableEvents: [],
      error: err.message,
    };
  }
}


