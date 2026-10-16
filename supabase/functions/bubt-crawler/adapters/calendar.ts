import type { AdapterResult } from '../types.ts';

const BUBT_STORAGE_BASE = 'https://www.bubt.edu.bd/storage/';
const BUBT_UPLOADS_BASE = 'https://www.bubt.edu.bd/uploads/';

export async function runCalendarAdapter(
  supabase: any,
  rawNotices: any[]
): Promise<AdapterResult> {
  if (!rawNotices || rawNotices.length === 0) {
    return { feature: 'calendar', scanned: 0, added: 0, updated: 0, unchanged: 0 };
  }

  const calendarCandidates = rawNotices.filter((n: any) =>
    n && n.title && /academic.*calendar/i.test(n.title)
  );

  if (calendarCandidates.length === 0) {
    return { feature: 'calendar', scanned: 0, added: 0, updated: 0, unchanged: 0 };
  }

  // The newest calendar is index 0 among matches
  const newestCalendar = calendarCandidates[0];
  let calendarPdfUrl: string | null = null;

  if (newestCalendar.file) {
    const clean = String(newestCalendar.file).replace(/^\/+/, '');
    calendarPdfUrl = clean.startsWith('http') ? clean : `${BUBT_STORAGE_BASE}${clean}`;
  } else if (newestCalendar.notice_document) {
    const clean = String(newestCalendar.notice_document).replace(/^\/+/, '');
    calendarPdfUrl = clean.startsWith('http') ? clean : `${BUBT_UPLOADS_BASE}${clean}`;
  }

  let updated = 0;
  let unchanged = 0;

  if (calendarPdfUrl) {
    // Check current stored calendar URL
    const { data: configRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'current_academic_calendar_url')
      .maybeSingle();

    if (configRow?.value !== calendarPdfUrl) {
      await supabase
        .from('app_config')
        .upsert({
          key: 'current_academic_calendar_url',
          value: calendarPdfUrl,
        }, { onConflict: 'key' });
      updated = 1;
    } else {
      unchanged = 1;
    }
  }

  return {
    feature: 'calendar',
    scanned: calendarCandidates.length,
    added: 0,
    updated,
    unchanged,
    details: {
      latest_calendar_title: newestCalendar.title,
      latest_calendar_pdf: calendarPdfUrl,
    },
  };
}

