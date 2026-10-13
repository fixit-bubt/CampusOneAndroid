import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUBT_BASE = 'https://www.bubt.edu.bd';

function normalizeFacultyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr\.|prof\.|professor|lecturer|mr\.|ms\.|mrs\.|engr\.|engineer)\s+/gi, '')
    .replace(/^(md\.|mohammed|mohammad|muhammad|mst\.)\s+/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Auth Verification
  const authHeader = req.headers.get('Authorization') ?? '';
  const syncSecretHeader = req.headers.get('x-sync-secret') ?? '';
  let triggeredBy = 'admin';

  let isSecretValid = false;
  if (syncSecretHeader) {
    const { data: secretRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'sync_secret')
      .maybeSingle();
    if (secretRow?.value && secretRow.value === syncSecretHeader) {
      isSecretValid = true;
      triggeredBy = 'cron';
    }
  }

  if (!isSecretValid && !authHeader.includes(serviceRoleKey)) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  } else if (!isSecretValid) {
    triggeredBy = 'cron';
  }

  // 2. Insert initial running log
  const { data: logEntry } = await supabase
    .from('faculty_sync_logs')
    .insert({
      triggered_by: triggeredBy,
      status: 'running',
    })
    .select('id')
    .single();

  const logId = logEntry?.id;

  try {
    // 3. Fetch departments and existing faculty in parallel
    const [deptsRes, facultyRes] = await Promise.all([
      supabase.from('departments').select('id, name, dept_number'),
      supabase.from('faculty').select('id, department_id, name, designation, photo_url, profile_url, short_code, on_leave, is_chairman'),
    ]);

    const dbDepts = deptsRes.data ?? [];
    const existingFaculty = facultyRes.data ?? [];

    const deptMap = new Map<string, string>();
    dbDepts.forEach(d => {
      deptMap.set(d.name.toLowerCase().trim(), d.id);
      deptMap.set(d.dept_number.trim(), d.id);
    });

    // In-memory lookup maps for instant matching
    const byDeptAndExact = new Map<string, any>();
    const byDeptAndNorm = new Map<string, any>();
    const byShortCode = new Map<string, any>();
    const byNormOnly = new Map<string, any>();

    for (const f of existingFaculty) {
      const exactKey = `${f.department_id}::${f.name.toLowerCase().trim()}`;
      const normKey = `${f.department_id}::${normalizeFacultyName(f.name)}`;
      byDeptAndExact.set(exactKey, f);
      byDeptAndNorm.set(normKey, f);
      if (f.short_code) {
        byShortCode.set(f.short_code.toUpperCase(), f);
      }
      byNormOnly.set(normalizeFacultyName(f.name), f);
    }

    // 4. Department Slugs List
    const departmentSlugs = [
      { name: 'Department of Computer Science & Engineering', slug: 'department-of-computer-science-engineering' },
      { name: 'Department of Data Science & Engineering', slug: 'department-of-data-science-engineering' },
      { name: 'Department of Mathematics & Statistics', slug: 'department-of-mathematics-statistics' },
      { name: 'Department of Electrical & Electronic Engineering', slug: 'department-of-electrical-electronic-engineering' },
      { name: 'Department of Textile Engineering', slug: 'department-of-textile-engineering' },
      { name: 'Department of Civil Engineering', slug: 'department-of-civil-engineering' },
      { name: 'Department of Law & Justice', slug: 'department-of-law-justice' },
      { name: 'Department of English', slug: 'department-of-english' },
      { name: 'Department of Management', slug: 'department-of-management' },
      { name: 'Department of Economics', slug: 'department-of-economics' },
      { name: 'Department of Accounting', slug: 'department-of-accounting' },
      { name: 'Department of Marketing', slug: 'department-of-marketing' },
      { name: 'Department of Finance', slug: 'department-of-finance' },
    ];

    let totalScanned = 0;
    let newAdded = 0;
    let promotionsUpdated = 0;
    let photosUpdated = 0;
    let shortCodesUpdated = 0;

    const rowsToInsert: any[] = [];
    const rowsToUpdate: any[] = [];
    const seenUpdatedIds = new Set<string>();

    // 5. Scrape Department Rosters
    for (const d of departmentSlugs) {
      try {
        const deptUrl = `${BUBT_BASE}/department/${d.slug}/faculty`;
        const deptRes = await fetch(deptUrl, {
          headers: { 'User-Agent': 'CampusOne-Sync/1.0 (Academic Bot; BUBT Mobile)' },
        });
        if (!deptRes.ok) continue;
        const deptHtml = await deptRes.text();

        let deptId: string | undefined;
        for (const [key, id] of deptMap.entries()) {
          if (d.name.toLowerCase().includes(key) || key.includes(d.name.toLowerCase())) {
            deptId = id;
            break;
          }
        }
        if (!deptId) continue;

        const cardChunks = deptHtml.split(/class="faculty-card\b/);
        for (let i = 1; i < cardChunks.length; i++) {
          const chunk = cardChunks[i];
          const linkMatch = chunk.match(/href="([^"]*\/faculty\/profile\/([^"]+))"/i);
          if (!linkMatch) continue;

          totalScanned++;
          const rawCode = linkMatch[2]?.trim().replace(/\/+$/, '') || '';
          const shortCode = rawCode ? rawCode.toUpperCase() : null;
          const canonicalProfileUrl = shortCode
            ? `${BUBT_BASE}/department/${d.slug}/faculty/profile/${shortCode}`
            : linkMatch[1]?.trim() || null;

          const imgMatch = chunk.match(/<img[^>]+src="([^">]+)"/i);
          const altMatch = chunk.match(/<img[^>]+alt="([^">]+)"/i);
          const nameMatch = chunk.match(/<h3[^>]*class="[^"]*faculty-name[^"]*"[^>]*>([\s\S]*?)<\/h3>/i);
          const name = (nameMatch ? nameMatch[1] : altMatch ? altMatch[1] : '').replace(/<[^>]+>/g, '').trim();
          if (!name) continue;

          const photoUrl = imgMatch ? imgMatch[1].trim() : null;

          const desigMatch = chunk.match(/<p[^>]*class="[^"]*(?:bg-indigo|faculty-designation)[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
          let rawDesig = desigMatch ? desigMatch[1].replace(/<[^>]+>/g, '').trim() : 'Lecturer';
          if (rawDesig.includes(' - ')) rawDesig = rawDesig.split(' - ')[0].trim();
          if (rawDesig.includes(' — ')) rawDesig = rawDesig.split(' — ')[0].trim();

          const onLeave = /on leave|study leave|lien/i.test(chunk);
          const isChairman = /chairman|head of/i.test(chunk) || /chairman/i.test(rawDesig);

          // In-memory match
          const exactKey = `${deptId}::${name.toLowerCase().trim()}`;
          const normKey = `${deptId}::${normalizeFacultyName(name)}`;
          const existing = byDeptAndExact.get(exactKey)
            || byDeptAndNorm.get(normKey)
            || (shortCode ? byShortCode.get(shortCode) : null)
            || byNormOnly.get(normalizeFacultyName(name));

          if (existing) {
            if (seenUpdatedIds.has(existing.id)) continue;
            seenUpdatedIds.add(existing.id);

            const needsShortCode = Boolean(shortCode && existing.short_code !== shortCode);
            const needsProfileUrl = Boolean(
              canonicalProfileUrl &&
              (!existing.profile_url ||
                existing.profile_url.includes('cse.bubt.edu.bd') ||
                existing.profile_url !== canonicalProfileUrl)
            );
            const photoChanged = Boolean(photoUrl && existing.photo_url !== photoUrl);
            const desigChanged = Boolean(rawDesig && existing.designation !== rawDesig);
            const leaveChanged = onLeave !== existing.on_leave;
            const chairmanChanged = isChairman !== existing.is_chairman;

            if (needsShortCode || needsProfileUrl || photoChanged || desigChanged || leaveChanged || chairmanChanged) {
              if (needsShortCode) shortCodesUpdated++;
              if (photoChanged) photosUpdated++;
              if (desigChanged) promotionsUpdated++;

              rowsToUpdate.push({
                id: existing.id,
                department_id: deptId,
                name: existing.name,
                designation: rawDesig || existing.designation,
                short_code: shortCode || existing.short_code || null,
                photo_url: photoUrl || existing.photo_url || null,
                profile_url: canonicalProfileUrl || existing.profile_url || null,
                on_leave: onLeave,
                is_chairman: isChairman,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          } else {
            // New teacher found on BUBT
            rowsToInsert.push({
              department_id: deptId,
              name,
              designation: rawDesig || 'Lecturer',
              short_code: shortCode || null,
              photo_url: photoUrl || null,
              profile_url: canonicalProfileUrl,
              on_leave: onLeave,
              is_chairman: isChairman,
              research_interests: [],
              qualifications: [],
              data_source: 'main_site',
              last_synced_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            newAdded++;
          }
        }
      } catch (_deptErr) {
        // Continue with next department
      }
    }

    // 6. High performance batch writes in chunks of 50
    const CHUNK_SIZE = 50;

    // Batch inserts for new faculty
    for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
      const { error: insertErr } = await supabase.from('faculty').insert(chunk);
      if (insertErr) {
        console.error('Batch insert error, falling back row-by-row:', insertErr.message);
        for (const row of chunk) {
          await supabase.from('faculty').insert(row);
        }
      }
    }

    // Batch upserts for updated faculty
    for (let i = 0; i < rowsToUpdate.length; i += CHUNK_SIZE) {
      const chunk = rowsToUpdate.slice(i, i + CHUNK_SIZE);
      const { error: upsertErr } = await supabase.from('faculty').upsert(chunk, { onConflict: 'id' });
      if (upsertErr) {
        console.error('Batch upsert error, falling back row-by-row:', upsertErr.message);
        for (const row of chunk) {
          await supabase.from('faculty').upsert(row, { onConflict: 'id' });
        }
      }
    }

    const durationMs = Date.now() - startedAt;

    // 7. Update audit log
    if (logId) {
      await supabase.from('faculty_sync_logs').update({
        status: 'success',
        total_scanned: totalScanned,
        new_added: newAdded,
        promotions_updated: promotionsUpdated,
        photos_updated: photosUpdated,
        duration_ms: durationMs,
        details: {
          short_codes_updated: shortCodesUpdated,
          total_updated: rowsToUpdate.length,
          departments_scanned: departmentSlugs.length,
        },
        completed_at: new Date().toISOString(),
      }).eq('id', logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_scanned: totalScanned,
        new_added: newAdded,
        short_codes_updated: shortCodesUpdated,
        promotions_updated: promotionsUpdated,
        photos_updated: photosUpdated,
        total_updated: rowsToUpdate.length,
        duration_ms: durationMs,
      }),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    if (logId) {
      await supabase.from('faculty_sync_logs').update({
        status: 'failed',
        error_message: error?.message || 'Unknown crawl error',
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      }).eq('id', logId);
    }

    return new Response(JSON.stringify({ error: error?.message || 'Sync failed' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
