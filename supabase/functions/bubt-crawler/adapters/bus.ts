import type { AdapterResult } from '../types.ts';

const BUBT_STORAGE_BASE = 'https://www.bubt.edu.bd/storage/';
const BUBT_UPLOADS_BASE = 'https://www.bubt.edu.bd/uploads/';

export async function runBusAdapter(
  supabase: any,
  rawNotices: any[]
): Promise<AdapterResult> {
  if (!rawNotices || rawNotices.length === 0) {
    return { feature: 'bus', scanned: 0, added: 0, updated: 0, unchanged: 0 };
  }

  const busCandidates = rawNotices.filter((n: any) =>
    n && n.title && /bus\s*schedule|transport\s*schedule|bus\s*routine|shuttle\s*schedule/i.test(n.title)
  );

  if (busCandidates.length === 0) {
    return { feature: 'bus', scanned: 0, added: 0, updated: 0, unchanged: 0 };
  }

  const newestBusNotice = busCandidates[0];
  let busSchedulePdfUrl: string | null = null;

  if (newestBusNotice.file) {
    const clean = String(newestBusNotice.file).replace(/^\/+/, '');
    busSchedulePdfUrl = clean.startsWith('http') ? clean : `${BUBT_STORAGE_BASE}${clean}`;
  } else if (newestBusNotice.notice_document) {
    const clean = String(newestBusNotice.notice_document).replace(/^\/+/, '');
    busSchedulePdfUrl = clean.startsWith('http') ? clean : `${BUBT_UPLOADS_BASE}${clean}`;
  }

  let updated = 0;
  let unchanged = 0;

  if (busSchedulePdfUrl) {
    const { data: configRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'latest_bus_schedule_url')
      .maybeSingle();

    if (configRow?.value !== busSchedulePdfUrl) {
      await supabase
        .from('app_config')
        .upsert({
          key: 'latest_bus_schedule_url',
          value: busSchedulePdfUrl,
        }, { onConflict: 'key' });
      updated = 1;
    } else {
      unchanged = 1;
    }
  }

  return {
    feature: 'bus',
    scanned: busCandidates.length,
    added: 0,
    updated,
    unchanged,
    details: {
      latest_bus_notice_title: newestBusNotice.title,
      latest_bus_schedule_pdf: busSchedulePdfUrl,
    },
  };
}

