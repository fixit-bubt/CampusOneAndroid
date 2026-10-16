export async function computeFingerprint(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export interface DiffFilterResult<T> {
  toInsert: T[];
  toUpdate: T[];
  unchangedCount: number;
}

export async function filterUnchangedRecords<T extends { code: string; content_hash: string }>(
  supabase: any,
  table: string,
  records: T[]
): Promise<DiffFilterResult<T>> {
  if (records.length === 0) {
    return { toInsert: [], toUpdate: [], unchangedCount: 0 };
  }

  const codes = records.map(r => r.code);
  const CHUNK_SIZE = 50;
  const existingMap = new Map<string, string>();

  // Fetch existing content hashes in chunks
  for (let i = 0; i < codes.length; i += CHUNK_SIZE) {
    const chunk = codes.slice(i, i + CHUNK_SIZE);
    const { data } = await supabase
      .from(table)
      .select('code, content_hash')
      .in('code', chunk);

    if (data) {
      for (const row of data) {
        if (row.code) existingMap.set(row.code, row.content_hash || '');
      }
    }
  }

  const toInsert: T[] = [];
  const toUpdate: T[] = [];
  let unchangedCount = 0;
  const seenBatchCodes = new Set<string>();

  for (const record of records) {
    if (seenBatchCodes.has(record.code)) {
      continue;
    }
    seenBatchCodes.add(record.code);

    const hasExisting = existingMap.has(record.code);
    const existingHash = existingMap.get(record.code);

    if (hasExisting && existingHash === record.content_hash) {
      unchangedCount++;
    } else if (hasExisting) {
      toUpdate.push(record);
    } else {
      toInsert.push(record);
    }
  }

  return { toInsert, toUpdate, unchangedCount };
}

export async function batchUpsert(
  supabase: any,
  table: string,
  records: any[],
  onConflictKey = 'code',
  options?: { isUpdate?: boolean }
): Promise<{ added: number; updated: number; error?: string }> {
  if (records.length === 0) return { added: 0, updated: 0 };

  const CHUNK_SIZE = 50;
  let added = 0;
  let updated = 0;
  const isUpdate = options?.isUpdate ?? false;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: onConflictKey });

    if (error) {
      console.error(`Batch upsert error on ${table}:`, error.message);
      // Fallback row-by-row
      for (const row of chunk) {
        const { error: rowErr } = await supabase.from(table).upsert(row, { onConflict: onConflictKey });
        if (!rowErr) {
          if (isUpdate) updated++; else added++;
        }
      }
    } else {
      if (isUpdate) {
        updated += chunk.length;
      } else {
        added += chunk.length;
      }
    }
  }

  return { added, updated };
}
