// sync-notices — automated BUBT official notices crawler & sync engine.
// Crawls official BUBT notice board (https://www.bubt.edu.bd/notice),
// extracts published notices, categories, official PDF circulars, flyers,
// maps departments and priorities, and upserts into public.announcements.
//
// Requires admin role when invoked by user JWT, or service-role for cron.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-deep-crawl, x-sync-secret',
};

const BUBT_NOTICE_URL = 'https://www.bubt.edu.bd/notice';
const BUBT_STORAGE_BASE = 'https://www.bubt.edu.bd/storage/';
const BUBT_UPLOADS_BASE = 'https://www.bubt.edu.bd/uploads/';

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveDepartment(notice: any): { department: string; deptCode: string } {
  const title = (notice.title || '').toLowerCase();
  const desc = (notice.description || '').toLowerCase();
  const fullText = title + ' ' + desc;

  if (fullText.includes('civil engineering') || notice.department_id === 37) {
    return { department: 'Civil Engineering', deptCode: 'Civil' };
  }
  if (fullText.includes('computer science') || fullText.includes('cse') || notice.department_id === 27) {
    return { department: 'Computer Science & Engineering', deptCode: 'CSE' };
  }
  if (fullText.includes('electrical & electronic') || fullText.includes('eee') || notice.department_id === 29) {
    return { department: 'Electrical & Electronic Engineering', deptCode: 'EEE' };
  }
  if (fullText.includes('textile engineering') || notice.department_id === 38) {
    return { department: 'Textile Engineering', deptCode: 'Textile' };
  }
  if (fullText.includes('law & justice') || fullText.includes('ll.b') || fullText.includes('ll.m') || notice.department_id === 36) {
    return { department: 'Law & Justice', deptCode: 'Law' };
  }
  if (fullText.includes('department of english') || fullText.includes('b.a. in english') || fullText.includes('b.a (hons) in english')) {
    return { department: 'English', deptCode: 'ENG' };
  }
  if (
    fullText.includes('faculty of business') ||
    fullText.includes('bba') ||
    fullText.includes('mba') ||
    fullText.includes('emba') ||
    fullText.includes('accounting') ||
    fullText.includes('finance') ||
    fullText.includes('marketing') ||
    fullText.includes('management')
  ) {
    return { department: 'Faculty of Business', deptCode: 'BBA' };
  }
  if (fullText.includes('economic') || notice.department_id === 30) {
    return { department: 'Economics', deptCode: 'ECON' };
  }
  if (
    notice.category?.name === 'Exam related' ||
    notice.office_id === 13 ||
    fullText.includes('controller of examinations')
  ) {
    return { department: 'Controller of Examinations', deptCode: 'EXAM' };
  }
  if (notice.category?.name === 'Semester' || notice.office_id === 14 || fullText.includes('registrar')) {
    return { department: 'Office of the Registrar', deptCode: 'REG' };
  }
  if (notice.category?.name === 'Admission' || notice.office_id === 16 || fullText.includes('tuition fee') || fullText.includes('accounts')) {
    return { department: 'Accounts & Admission', deptCode: 'ALL' };
  }

  return { department: 'University-Wide', deptCode: 'ALL' };
}

function resolveCategory(notice: any): { categoryName: string; categorySlug: string } {
  const catName = notice.category?.name || '';
  const catSlug = notice.category?.slug || '';
  const title = (notice.title || '').toLowerCase();

  // 1. Exam routines, viva voce, examination schedules
  if (
    catSlug === 'exam-related' ||
    /exam|routine|viva voce|viva schedule|mid-term|final examination|admit card|result sheet/i.test(title)
  ) {
    return { categoryName: 'Exam related', categorySlug: 'exam-related' };
  }
  // 2. Holidays & official offdays
  if (
    catSlug === 'offday' ||
    /holiday|offday|vacation|closure|puja|eid|independence day|victory day|ashura|janmashtami/i.test(title)
  ) {
    return { categoryName: 'Offday', categorySlug: 'offday' };
  }
  // 3. Semester registration & fees
  if (
    catSlug === 'semester' ||
    /semester|registration|tuition fee|installment|waiver|admission|course pre-registration/i.test(title)
  ) {
    return { categoryName: 'Semester', categorySlug: 'semester' };
  }
  // 4. Class related & labs
  if (catSlug === 'class-related' || /class|laboratory|lab|routine|room allocation|schedule of classes/i.test(title)) {
    return { categoryName: 'Class Related', categorySlug: 'class-related' };
  }
  // 5. Tenders & procurement
  if (catSlug === 'tender' || /tender|quotation|procurement|supply of/i.test(title)) {
    return { categoryName: 'Tender', categorySlug: 'tender' };
  }

  return { categoryName: catName || 'General', categorySlug: catSlug || 'general' };
}

function resolvePriority(notice: any, catSlug: string): { priority: 'Urgent' | 'Important' | 'General'; pinned: boolean } {
  const title = (notice.title || '').toLowerCase();

  // Urgent: Holidays, unexpected closures, emergencies, admit card distribution deadline
  if (
    catSlug === 'offday' ||
    /holiday|janmashtami|eid|closure|postponed|emergency|admit card|urgent|immediate|last date/i.test(title)
  ) {
    return { priority: 'Urgent', pinned: true };
  }

  // Important: Mid-Term & Final routines, semester registration confirmation, results, viva
  if (
    catSlug === 'exam-related' ||
    catSlug === 'semester' ||
    /mid-term|final examination|routine|result|registration|viva voce|viva schedule/i.test(title)
  ) {
    return { priority: 'Important', pinned: false };
  }

  return { priority: 'General', pinned: false };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Auth & Throttle Gate
  const authHeader = req.headers.get('Authorization') ?? '';
  const syncSecretHeader = req.headers.get('x-sync-secret') ?? '';
  let isForce = req.headers.get('x-force-sync') === 'true';
  const deepCrawl = req.headers.get('x-deep-crawl') === 'true';

  let triggeredBy = 'user';
  let isAuthorized = false;

  // Validate cron secret if provided
  if (syncSecretHeader) {
    const { data: secretRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'sync_secret')
      .maybeSingle();

    if (secretRow?.value && secretRow.value === syncSecretHeader) {
      triggeredBy = 'cron';
      isAuthorized = true;
    }
  }

  // Validate authenticated user session if not cron
  if (!isAuthorized && authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);

    if (!userErr && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      triggeredBy = profile?.role === 'admin' ? 'admin' : (profile?.role || 'student');
      isAuthorized = true;
    }
  }

  // Reject unauthorized callers
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized invocation' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Only admins and cron can force bypass the throttle
  if (isForce && triggeredBy !== 'admin' && triggeredBy !== 'cron') {
    isForce = false;
  }

  // Throttle check: 90s cooldown unless forced by admin or cron
  if (!isForce && triggeredBy !== 'cron') {
    const { data: recentLog } = await supabase
      .from('notice_sync_logs')
      .select('id, total_scanned, new_added, updated_count, created_at')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentLog && (Date.now() - new Date(recentLog.created_at).getTime() < 90000)) {
      return new Response(
        JSON.stringify({
          success: true,
          throttled: true,
          total_scanned: recentLog.total_scanned,
          new_added: 0,
          updated_count: recentLog.updated_count,
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 2. Insert initial running log
  const { data: logEntry } = await supabase
    .from('notice_sync_logs')
    .insert({
      triggered_by: triggeredBy,
      status: 'running',
    })
    .select('id')
    .single();

  const logId = logEntry?.id;

  try {
    // 3. Resolve system admin user for created_by
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    let createdBy = adminProfile?.id;
    if (!createdBy) {
      const { data: anyProfile } = await supabase.from('profiles').select('id').limit(1).single();
      createdBy = anyProfile?.id;
    }

    if (!createdBy) {
      throw new Error('No user profile found in database to assign as announcement author');
    }

    // 4. Fetch BUBT Notice Board
    const noticeRes = await fetch(BUBT_NOTICE_URL, {
      headers: { 'User-Agent': 'CampusOne-Sync/1.0 (Academic Bot; BUBT Mobile)' },
    });

    if (!noticeRes.ok) {
      throw new Error(`Failed to fetch BUBT notice board: HTTP ${noticeRes.status}`);
    }

    const html = await noticeRes.text();

    // Extract notices JSON
    const match = html.match(/notices:\s*(\[[\s\S]*?\]),\s*categories:/);
    if (!match) {
      throw new Error('Could not find notices dataset on BUBT notice page');
    }

    const rawNotices = JSON.parse(match[1]);
    const totalScanned = rawNotices.length;

    // Scan up to 300 notices (or full dataset if requested via header/body)
    const scanLimit = deepCrawl ? Math.min(rawNotices.length, 600) : Math.min(rawNotices.length, 300);
    const batch = rawNotices.slice(0, scanLimit);

    // Collect all candidate codes
    const batchCodes = batch.map((n: any) => `BUBT-N-${n.id}`);

    // Fetch existing notices in one single fast query
    const { data: existingList } = await supabase
      .from('announcements')
      .select('id, code, pinned')
      .in('code', batchCodes);

    const existingMap = new Map<string, { id: string; pinned: boolean }>();
    if (existingList) {
      for (const item of existingList) {
        if (item.code) existingMap.set(item.code, item);
      }
    }

    const rowsToUpsert: any[] = [];
    let newAdded = 0;
    let updatedCount = 0;

    for (const n of batch) {
      if (!n || !n.title) continue;

      const code = `BUBT-N-${n.id}`;
      const externalId = String(n.id);
      const { categoryName, categorySlug } = resolveCategory(n);
      const { department, deptCode } = resolveDepartment(n);
      const { priority, pinned: defaultPinned } = resolvePriority(n, categorySlug);
      const externalUrl = n.slug ? `https://www.bubt.edu.bd/notice/details/${n.slug}` : BUBT_NOTICE_URL;

      let imageUrl: string | null = null;
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      // 1. Direct file field check
      if (n.file) {
        const cleanFile = String(n.file).replace(/^\/+/, '');
        const fullUrl = cleanFile.startsWith('http') ? cleanFile : `${BUBT_STORAGE_BASE}${cleanFile}`;
        if (/\.(jpg|jpeg|png|webp)$/i.test(cleanFile)) {
          imageUrl = fullUrl;
        } else if (/\.pdf$/i.test(cleanFile)) {
          attachmentUrl = fullUrl;
          attachmentName = (n.title || 'BUBT Notice').slice(0, 60).trim() + '.pdf';
        }
      }

      // 2. Check notice_document (838 older/established BUBT notices host their PDF here!)
      if (!attachmentUrl && n.notice_document) {
        const cleanDoc = String(n.notice_document).replace(/^\/+/, '');
        const docUrl = cleanDoc.startsWith('http') ? cleanDoc : `${BUBT_UPLOADS_BASE}${cleanDoc}`;
        if (/\.pdf$/i.test(cleanDoc)) {
          attachmentUrl = docUrl;
          attachmentName = (n.title || 'BUBT Notice').slice(0, 60).trim() + '.pdf';
        } else if (/\.(jpg|jpeg|png|webp)$/i.test(cleanDoc)) {
          imageUrl = imageUrl || docUrl;
        }
      }

      // 3. Check inline image in description HTML
      if (!imageUrl && n.description) {
        const imgMatch = String(n.description).match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) {
          const src = imgMatch[1].trim();
          imageUrl = src.startsWith('http') ? src : `${BUBT_STORAGE_BASE}${src.replace(/^\/+/, '')}`;
        }
      }

      const rawDesc = n.description ? stripHtml(n.description) : '';
      const body = rawDesc && rawDesc.length > 5
        ? rawDesc
        : `Official circular published by BUBT for ${categoryName}. View or download the attached document for full details.`;

      const existing = existingMap.get(code);

      // Preserve pinned if already pinned by administrator
      const finalPinned = existing?.pinned !== undefined ? existing.pinned : defaultPinned;

      rowsToUpsert.push({
        code,
        title: n.title.trim(),
        body,
        department: department || null,
        department_code: deptCode || null,
        priority,
        pinned: finalPinned,
        category: categoryName,
        category_slug: categorySlug,
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
        image_url: imageUrl || null,
        external_url: externalUrl || null,
        external_id: externalId || null,
        source: 'bubt_official',
        created_by: createdBy,
        created_at: n.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // High performance batch upsert in chunks of 50
    const CHUNK_SIZE = 50;
    for (let i = 0; i < rowsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToUpsert.slice(i, i + CHUNK_SIZE);
      const { error: upsertErr } = await supabase
        .from('announcements')
        .upsert(chunk, { onConflict: 'code' });

      if (upsertErr) {
        console.error('Batch upsert error on chunk, falling back to row-by-row:', upsertErr.message);
        // Fallback row-by-row to isolate failures so valid notices still get inserted
        for (const row of chunk) {
          const isNew = !existingMap.has(row.code);
          const { error: singleErr } = await supabase
            .from('announcements')
            .upsert(row, { onConflict: 'code' });
          if (!singleErr) {
            if (isNew) newAdded++;
            else updatedCount++;
          } else {
            console.error(`Failed to upsert notice ${row.code}:`, singleErr.message);
          }
        }
      } else {
        // Chunk succeeded
        for (const row of chunk) {
          if (!existingMap.has(row.code)) {
            newAdded++;
          } else {
            updatedCount++;
          }
        }
      }
    }

    const durationMs = Date.now() - startedAt;

    // 5. Update audit log
    if (logId) {
      await supabase
        .from('notice_sync_logs')
        .update({
          status: 'success',
          total_scanned: totalScanned,
          new_added: newAdded,
          updated_count: updatedCount,
          duration_ms: durationMs,
          details: { batch_processed: rowsToUpsert.length, deep_crawl: deepCrawl },
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_scanned: totalScanned,
        batch_scanned: rowsToUpsert.length,
        new_added: newAdded,
        updated_count: updatedCount,
        duration_ms: durationMs,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    if (logId) {
      await supabase
        .from('notice_sync_logs')
        .update({
          status: 'failed',
          error_message: err.message,
          duration_ms: durationMs,
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
