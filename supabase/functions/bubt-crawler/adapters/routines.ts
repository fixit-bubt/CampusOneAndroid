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

  // Query existing content hashes for deduplication
  const hashes = routineItems.map(r => r.content_hash);
  const { data: existingRows } = await supabase
    .from('routines')
    .select('content_hash')
    .in('content_hash', hashes);

  const existingHashSet = new Set<string>((existingRows || []).map((r: any) => r.content_hash));
  const seenBatchHashes = new Set<string>();

  const toInsert: RoutineItem[] = [];
  let unchangedCount = 0;

  for (const item of routineItems) {
    if (existingHashSet.has(item.content_hash) || seenBatchHashes.has(item.content_hash)) {
      unchangedCount++;
    } else {
      seenBatchHashes.add(item.content_hash);
      toInsert.push(item);
    }
  }

  let added = 0;
  if (toInsert.length > 0) {
    const { error } = await supabase.from('routines').upsert(toInsert, { onConflict: 'content_hash' });
    if (!error) {
      added = toInsert.length;
    } else {
      console.error('Routines upsert error:', error.message);
    }
  }

  return {
    feature: 'routines',
    scanned: routineCandidates.length,
    added,
    updated: 0,
    unchanged: unchangedCount,
  };
}
