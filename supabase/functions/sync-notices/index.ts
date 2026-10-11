// sync-notices — automated BUBT official notices crawler & sync engine.
// Crawls official BUBT notice board (https://www.bubt.edu.bd/notice),
// extracts published notices, categories, official PDF circulars, flyers,
// maps departments and priorities, and upserts into public.announcements.
//
// Requires admin role when invoked by user JWT, or service-role for cron.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUBT_NOTICE_URL = 'https://www.bubt.edu.bd/notice';
const BUBT_STORAGE_BASE = 'https://www.bubt.edu.bd/storage/';

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
  if (fullText.includes('electrical & electronic') || fullText.includes('eee')) {
    return { department: 'Electrical & Electronic Engineering', deptCode: 'EEE' };
  }
  if (fullText.includes('textile engineering')) {
    return { department: 'Textile Engineering', deptCode: 'Textile' };
  }
  if (fullText.includes('law & justice') || fullText.includes('ll.b') || fullText.includes('ll.m')) {
    return { department: 'Law & Justice', deptCode: 'Law' };
  }
  if (fullText.includes('department of english') || fullText.includes('b.a. in english')) {
    return { department: 'English', deptCode: 'English' };
  }
  if (fullText.includes('faculty of business') || fullText.includes('bba') || fullText.includes('mba') || fullText.includes('accounting') || fullText.includes('finance') || fullText.includes('marketing') || fullText.includes('management')) {
    return { department: 'Faculty of Business', deptCode: 'Business' };
  }
  if (fullText.includes('economics')) {
    return { department: 'Economics', deptCode: 'Economics' };
  }
  if (notice.category?.name === 'Exam related' || notice.office_id === 13 || fullText.includes('examination') || fullText.includes('controller of examinations')) {
    return { department: 'Controller of Examinations', deptCode: 'ALL' };
  }
  if (notice.category?.name === 'Semester' || notice.office_id === 14 || fullText.includes('registrar')) {
    return { department: 'Office of the Registrar', deptCode: 'ALL' };
  }
  if (notice.category?.name === 'Admission' || notice.office_id === 16 || fullText.includes('tuition fee') || fullText.includes('accounts')) {
    return { department: 'Accounts & Admission', deptCode: 'ALL' };
  }

  return { department: 'University-Wide', deptCode: 'ALL' };
}

function resolvePriority(notice: any): { priority: 'Urgent' | 'Important' | 'General'; pinned: boolean } {
  const cat = notice.category?.name || '';
  const title = (notice.title || '').toLowerCase();

  // Urgent: Holidays, unexpected closures, emergencies, admit card distribution deadline
  if (cat === 'Offday' || /holiday|janmashtami|eid|closure|postponed|emergency|admit card/i.test(title)) {
    return { priority: 'Urgent', pinned: true };
  }

  // Important: Mid-Term & Final routines, semester registration confirmation, results
  if (cat === 'Exam related' || cat === 'Semester' || /mid-term|final examination|routine|result|registration/i.test(title)) {
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

  // 1. Auth Verification
  const authHeader = req.headers.get('Authorization') ?? '';
  let triggeredBy = 'admin';

  if (!authHeader.includes(serviceRoleKey)) {
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
  } else {
    triggeredBy = 'cron';
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

    // Scan latest 60 notices
    const batch = rawNotices.slice(0, 60);

    let newAdded = 0;
    let updatedCount = 0;

    for (const n of batch) {
      if (!n || !n.title) continue;

      const code = `BUBT-N-${n.id}`;
      const externalId = String(n.id);
      const categoryName = n.category?.name || 'General';
      const categorySlug = n.category?.slug || 'general';
      const { department, deptCode } = resolveDepartment(n);
      const { priority, pinned } = resolvePriority(n);
      const externalUrl = n.slug ? `https://www.bubt.edu.bd/notice/details/${n.slug}` : BUBT_NOTICE_URL;

      let imageUrl: string | null = null;
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (n.file) {
        const cleanFile = n.file.replace(/^\/+/, '');
        const fullUrl = `${BUBT_STORAGE_BASE}${cleanFile}`;
        if (/\.(jpg|jpeg|png|webp)$/i.test(cleanFile)) {
          imageUrl = fullUrl;
        } else if (/\.pdf$/i.test(cleanFile)) {
          attachmentUrl = fullUrl;
          attachmentName = (n.title || 'BUBT Notice').slice(0, 60).trim() + '.pdf';
        }
      }

      const rawDesc = n.description ? stripHtml(n.description) : '';
      const body = rawDesc && rawDesc.length > 5
        ? rawDesc
        : `Official circular published by BUBT for ${categoryName}. View or download the attached document for full details.`;

      // Check existing row
      const { data: existing } = await supabase
        .from('announcements')
        .select('id, title, pinned')
        .eq('code', code)
        .maybeSingle();

      if (existing) {
        // Update existing row
        await supabase
          .from('announcements')
          .update({
            title: n.title.trim(),
            body,
            department,
            department_code: deptCode,
            category: categoryName,
            category_slug: categorySlug,
            attachment_url: attachmentUrl,
            attachment_name: attachmentName,
            image_url: imageUrl,
            external_url: externalUrl,
            external_id: externalId,
            source: 'bubt_official',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        updatedCount++;
      } else {
        // Insert new announcement (will fire trg_notify_new_announcement!)
        const { error: insErr } = await supabase
          .from('announcements')
          .insert({
            code,
            title: n.title.trim(),
            body,
            department,
            department_code: deptCode,
            priority,
            pinned,
            attachment_url: attachmentUrl,
            attachment_name: attachmentName,
            image_url: imageUrl,
            external_url: externalUrl,
            external_id: externalId,
            source: 'bubt_official',
            category: categoryName,
            category_slug: categorySlug,
            created_by: createdBy,
            created_at: n.created_at || new Date().toISOString(),
          });

        if (!insErr) {
          newAdded++;
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
          details: { batch_processed: batch.length },
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_scanned: totalScanned,
        batch_scanned: batch.length,
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
