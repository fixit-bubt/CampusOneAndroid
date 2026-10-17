import { computeFingerprint } from '../core/diff.ts';
import { resolveDepartment } from '../core/parser.ts';
import type { AdapterResult, RoutineItem } from '../types.ts';

const BUBT_STORAGE_BASE = 'https://www.bubt.edu.bd/storage/';
const BUBT_UPLOADS_BASE = 'https://www.bubt.edu.bd/uploads/';

export async function runRoutinesAdapter(
  supabase: any,
  rawNotices: any[],
  systemUserId?: string | null
): Promise<AdapterResult> {
  if (!rawNotices || rawNotices.length === 0) {
    return { feature: 'routines', scanned: 0, added: 0, updated: 0, unchanged: 0 };
  }

  // Filter notices for routines and schedules
  const routineCandidates = rawNotices.filter((n: any) =>
    n && n.title && /exam.*routine|class.*routine|class.*schedule|viva.*schedule|examination.*routine/i.test(n.title)
  );

  if (routineCandidates.length === 0) {
    return { feature: 'routines', scanned: 0, added: 0, updated: 0, unchanged: 0 };
  }

  const routineItems: RoutineItem[] = [];

  for (const n of routineCandidates) {
    const title = n.title.trim();
    const isExam = /exam|viva/i.test(title);
    const type: 'class' | 'exam' = isExam ? 'exam' : 'class';
    const { department } = resolveDepartment(
      title + ' ' + (n.description || ''),
      n.department_id,
      n.office_id
    );

    // Resolve semester
    let semester: string | null = null;
    const semMatch = title.match(/(Fall|Summer|Spring)\s*(?:Semester)?\s*(\d{4})?/i);
    if (semMatch) {
      semester = `${semMatch[1]} ${semMatch[2] || new Date().getFullYear()}`;
    }

    // Resolve PDF attachment
    let fileUrl: string | null = null;
    if (n.file) {
      const clean = String(n.file).replace(/^\/+/, '');
      fileUrl = clean.startsWith('http') ? clean : `${BUBT_STORAGE_BASE}${clean}`;
    } else if (n.notice_document) {
      const clean = String(n.notice_document).replace(/^\/+/, '');
      fileUrl = clean.startsWith('http') ? clean : `${BUBT_UPLOADS_BASE}${clean}`;
    }

    // Only accept viewable PDF or image files (skip docx or null attachments)
    if (!fileUrl || !/\.(pdf|png|jpe?g|webp)$/i.test(fileUrl)) {
      continue;
    }

    const fingerprint = await computeFingerprint(`${title}|${type}|${department || ''}|${fileUrl || ''}`);

    routineItems.push({
      type,
      title,
      department: department === 'University-Wide' ? null : department,
      semester,
      intake: null,
      section: null,
      file_url: fileUrl,
      image_url: null,
      // published_by is a UUID foreign key to auth.users - must be a valid UUID or null
      published_by: systemUserId || null,
      content_hash: fingerprint,
      created_at: n.created_at || new Date().toISOString(),
    });
  }

  // Query existing routines to match by file_url or title
  const { data: existingRows } = await supabase
    .from('routines')
    .select('id, title, file_url, content_hash');

  const byFileUrl = new Map<string, any>();
  const byTitle = new Map<string, any>();

  for (const r of existingRows || []) {
    if (r.file_url) byFileUrl.set(r.file_url, r);
    if (r.title) byTitle.set(r.title.toLowerCase().trim(), r);
  }

  const toInsert: RoutineItem[] = [];
  const toUpdate: any[] = [];
  const seenBatchKeys = new Set<string>();
  let unchangedCount = 0;

  for (const item of routineItems) {
    const batchKey = (item.file_url || item.title).toLowerCase().trim();
    if (seenBatchKeys.has(batchKey)) {
      continue;
    }
    seenBatchKeys.add(batchKey);

    const existing = (item.file_url ? byFileUrl.get(item.file_url) : null)
      || byTitle.get(item.title.toLowerCase().trim());

    if (existing) {
      if (existing.content_hash === item.content_hash) {
        unchangedCount++;
      } else {
        toUpdate.push({
          id: existing.id,
          ...item,
        });
      }
    } else {
      toInsert.push(item);
    }
  }

  let added = 0;
  let updated = 0;

  if (toInsert.length > 0) {
    const { error } = await supabase.from('routines').insert(toInsert);
    if (!error) {
      added = toInsert.length;
    } else {
      console.error('Routines insert error:', error.message);
    }
  }

  if (toUpdate.length > 0) {
    const { error } = await supabase.from('routines').upsert(toUpdate, { onConflict: 'id' });
    if (!error) {
      updated = toUpdate.length;
    } else {
      console.error('Routines update error:', error.message);
    }
  }

  return {
    feature: 'routines',
    scanned: routineCandidates.length,
    added,
    updated,
    unchanged: unchangedCount,
  };
}
