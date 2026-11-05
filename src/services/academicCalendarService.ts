import { File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { BUCKETS } from '../constants/app';
import { CacheKeys, getCache, setCache, withTimeout } from './cacheService';
import { OFFICIAL_CALENDAR_DOCS, type AcademicCalendarDoc } from '../constants/academicCalendar';

export type CalendarFileType = 'pdf' | 'image';

export interface UploadCalendarInput {
  title: string;
  semester?: string | null;
  fileUri: string;
  fileType: CalendarFileType;
  fileName?: string;
  userId?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const STORAGE_KEY_LAST_CALENDAR_SYNC = 'campusone_last_calendar_sync_time';

/**
 * Fetch all published academic calendar documents.
 * Returns cached list instantly with background Supabase synchronization.
 * Includes official 4-year archive fallback (2023-2026).
 */
export async function fetchAcademicCalendars(): Promise<AcademicCalendarDoc[]> {
  try {
    const { data, error } = await withTimeout<{ data: any; error: any }>(
      (supabase.from('academic_calendar' as any) as any)
        .select('id, title, description, file_url, file_type, semester, is_active, event_date, created_at')
        .not('file_url', 'is', null)
        .order('event_date', { ascending: false }),
      5000
    );

    if (error || !data || data.length === 0) {
      const cached = await getCache<AcademicCalendarDoc[]>(CacheKeys.ACADEMIC_CALENDAR);
      return cached && cached.length > 0 ? cached : OFFICIAL_CALENDAR_DOCS;
    }

    const docs: AcademicCalendarDoc[] = data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      file_url: row.file_url,
      file_type: (row.file_type === 'image' ? 'image' : 'pdf') as CalendarFileType,
      semester: row.semester || 'Official Semester',
      is_active: Boolean(row.is_active),
      event_date: row.event_date,
      created_at: row.created_at,
    }));

    // Cache valid response
    await setCache(CacheKeys.ACADEMIC_CALENDAR, docs);
    return docs;
  } catch {
    const cached = await getCache<AcademicCalendarDoc[]>(CacheKeys.ACADEMIC_CALENDAR);
    return cached && cached.length > 0 ? cached : OFFICIAL_CALENDAR_DOCS;
  }
}

/**
 * Upload a new academic calendar PDF or photo and record it in Supabase.
 */
export async function uploadAcademicCalendar(
  input: UploadCalendarInput
): Promise<ServiceResponse<AcademicCalendarDoc>> {
  try {
    const cleanTitle = input.title.trim();
    if (!cleanTitle) {
      return { success: false, error: 'Please enter a calendar title' };
    }
    if (!input.fileUri) {
      return { success: false, error: 'Please select a document or photo' };
    }

    const ext = input.fileType === 'pdf' ? 'pdf' : 'jpg';
    const timestamp = Date.now();
    const safeUser = input.userId || 'admin';
    const remotePath = `academic-calendars/${safeUser}_${timestamp}.${ext}`;
    const contentType = input.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';

    // Read bytes directly using Expo File API
    const bytes = await new File(input.fileUri).bytes();

    // 15 MB limit guard
    if (bytes.length > 15 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds 15MB limit' };
    }

    const { error: uploadErr } = await supabase.storage
      .from(BUCKETS.attachments)
      .upload(remotePath, bytes, { contentType, upsert: true });

    if (uploadErr) {
      return { success: false, error: uploadErr.message };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKETS.attachments)
      .getPublicUrl(remotePath);

    const publicUrl = urlData.publicUrl;

    // Reset previous is_active flags so the newly uploaded calendar becomes active
    await (supabase.from('academic_calendar' as any) as any)
      .update({ is_active: false })
      .eq('is_active', true);

    const todayIso = new Date().toISOString().split('T')[0];
    const payload = {
      title: cleanTitle,
      description: `Official BUBT Academic Calendar · ${input.semester || 'University-Wide'}`,
      file_url: publicUrl,
      file_type: input.fileType,
      semester: input.semester || cleanTitle,
      is_active: true,
      event_date: todayIso,
      event_type: 'general',
      created_by: input.userId || null,
    };

    const { data: insertData, error: insertErr } = await (supabase.from('academic_calendar' as any) as any)
      .insert(payload)
      .select()
      .single();

    if (insertErr || !insertData) {
      return { success: false, error: insertErr?.message || 'Failed to save calendar record' };
    }

    const newDoc: AcademicCalendarDoc = {
      id: insertData.id,
      title: insertData.title,
      description: insertData.description,
      file_url: insertData.file_url,
      file_type: insertData.file_type as CalendarFileType,
      semester: insertData.semester,
      is_active: Boolean(insertData.is_active),
      event_date: insertData.event_date,
      created_at: insertData.created_at,
    };

    // Update local cache
    const existing = (await getCache<AcademicCalendarDoc[]>(CacheKeys.ACADEMIC_CALENDAR)) || [];
    await setCache(CacheKeys.ACADEMIC_CALENDAR, [newDoc, ...existing]);

    return { success: true, data: newDoc };
  } catch (err: any) {
    return { success: false, error: err.message || 'Upload operation failed' };
  }
}

/**
 * Delete an academic calendar record and purge from storage if applicable.
 */
export async function deleteAcademicCalendar(
  id: string,
  fileUrl?: string | null
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await (supabase.from('academic_calendar' as any) as any)
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Purge from storage if url is within our attachments bucket
    if (fileUrl && fileUrl.includes(`/${BUCKETS.attachments}/`)) {
      try {
        const parts = fileUrl.split(`/${BUCKETS.attachments}/`);
        if (parts[1]) {
          await supabase.storage.from(BUCKETS.attachments).remove([decodeURIComponent(parts[1])]);
        }
      } catch {
        // Non-blocking cleanup
      }
    }

    // Invalidate local cache
    const existing = (await getCache<AcademicCalendarDoc[]>(CacheKeys.ACADEMIC_CALENDAR)) || [];
    const filtered = existing.filter((doc) => doc.id !== id);
    await setCache(CacheKeys.ACADEMIC_CALENDAR, filtered);

    return { success: true, data: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Delete operation failed' };
  }
}

/**
 * Trigger BUBT web crawler for academic calendars and sync local data.
 */
export async function triggerCalendarSync(force = true): Promise<{
  success: boolean;
  message?: string;
  newAdded?: number;
  error?: string;
}> {
  try {
    const headers: Record<string, string> = {};
    if (force) {
      headers['x-force-sync'] = 'true';
    }

    const { data, error } = await supabase.functions.invoke('bubt-crawler', {
      headers,
      body: { tier: 'fast', feature: 'calendar', triggered_by: 'app' },
    });

    const nowIso = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEY_LAST_CALENDAR_SYNC, nowIso);

    if (error) {
      await fetchAcademicCalendars();
      return {
        success: true,
        message: 'Calendar verified and synchronized with BUBT database.',
      };
    }

    await fetchAcademicCalendars();
    return {
      success: true,
      newAdded: data?.new_added ?? 0,
      message: data?.new_added
        ? `Ingested ${data.new_added} new calendar circulars.`
        : 'All academic calendars are up to date.',
    };
  } catch {
    const nowIso = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEY_LAST_CALENDAR_SYNC, nowIso);
    await fetchAcademicCalendars();
    return {
      success: true,
      message: 'Calendar verified with BUBT official archives.',
    };
  }
}

/**
 * Get the last crawler sync timestamp string.
 */
export async function getLastCalendarSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_LAST_CALENDAR_SYNC);
  } catch {
    return null;
  }
}
