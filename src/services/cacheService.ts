import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const CACHE_PREFIX = '@c1_cache_';

export const CacheKeys = {
  // Static / Academic
  BUS_ROUTES: 'bus_routes',
  SAVED_BUS_ROUTES: (uid: string) => `saved_bus_routes_${uid}`,
  PRAYER_TIMES: 'prayer_times',
  MUSALLAH_LOCATIONS: 'musallah_locations',
  ROUTINES: 'routines_all',
  ACADEMIC_CALENDAR: 'academic_calendar',
  FACULTY_DEPTS: 'faculty_depts',
  FACULTY_LIST: 'faculty_list',
  FACULTY_BOOKMARKS: (uid: string) => `faculty_bookmarks_${uid}`,
  DOCTORS: 'doctors_list',

  // Feeds & Community
  HOME_STATUS: (uid: string) => `home_status_${uid}`,
  HOME_UPDATES: 'home_updates',
  ANNOUNCEMENTS: 'announcements_feed',
  ANNOUNCEMENT_READS: (uid: string) => `announcement_reads_${uid}`,
  EVENTS: 'events_feed',
  CLUBS: 'clubs_list',
  CLUB_DETAIL: (id: string) => `club_detail_${id}`,
  JOBS: 'jobs_feed',
  JOB_BOOKMARKS: (uid: string) => `job_bookmarks_${uid}`,

  // P2P Services
  MARKET_LISTINGS: 'market_listings',
  RIDES: 'rides_feed',
  RIDES_TAKEN: 'rides_taken',
  RIDES_REQUESTED: (uid: string) => `rides_req_${uid}`,
  LOST_FOUND: 'lost_found_items',
  BLOOD_FEED: (uid: string) => `blood_feed_${uid}`,
  STUDY_DEPTS: 'study_depts',
  STUDY_COURSES: 'study_courses',
  DIRECTORY: (uid: string) => `student_dir_${uid}`,
  NOTIFICATIONS: (uid: string) => `notifications_${uid}`,
} as const;

export async function getCache<T>(key: string): Promise<T | null> {
  const fullKey = `${CACHE_PREFIX}${key}`;
  
  if (memoryCache.has(fullKey)) {
    return memoryCache.get(fullKey)!.data as T;
  }

  try {
    const raw = await AsyncStorage.getItem(fullKey);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    memoryCache.set(fullKey, entry);
    return entry.data;
  } catch {
    return null;
  }
}

export async function getCacheWithMeta<T>(key: string): Promise<CacheEntry<T> | null> {
  const fullKey = `${CACHE_PREFIX}${key}`;
  if (memoryCache.has(fullKey)) {
    return memoryCache.get(fullKey)!;
  }
  try {
    const raw = await AsyncStorage.getItem(fullKey);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    memoryCache.set(fullKey, entry);
    return entry;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  const fullKey = `${CACHE_PREFIX}${key}`;
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache.set(fullKey, entry);
  try {
    await AsyncStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    // Non-fatal if storage write fails
  }
}

export async function removeCache(key: string): Promise<void> {
  const fullKey = `${CACHE_PREFIX}${key}`;
  memoryCache.delete(fullKey);
  try {
    await AsyncStorage.removeItem(fullKey);
  } catch {}
}

export async function clearAllCache(): Promise<void> {
  memoryCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const c1Keys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (c1Keys.length > 0) {
      await AsyncStorage.multiRemove(c1Keys);
    }
  } catch {}
}
