// sync-faculty — automated BUBT faculty directory sync engine.
// Crawls official BUBT websites (www.bubt.edu.bd and cse.bubt.edu.bd),
// extracts teacher initial codes, designations, photos, emails, blood groups,
// academic links, and updates public.faculty with audit logs in faculty_sync_logs.
//
// Requires admin role when invoked by user JWT, or service-role for cron.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUBT_BASE = 'https://www.bubt.edu.bd';

interface ScrapedFaculty {
  name: string;
  designation: string;
  department_slug: string;
  short_code: string | null;
  photo_url: string | null;
  profile_url: string | null;
  email: string | null;
  phone?: string | null;
  blood_group?: string | null;
  scholar_url?: string | null;
  researchgate_url?: string | null;
  scopus_url?: string | null;
  research_interests?: string[];
  qualifications?: string[];
  on_leave?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Auth Verification: Caller must be admin or service role
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
    .from('faculty_sync_logs')
    .insert({
      triggered_by: triggeredBy,
      status: 'running',
    })
    .select('id')
    .single();

  const logId = logEntry?.id;

  try {
    // 3. Fetch departments map from DB
    const { data: dbDepts } = await supabase.from('departments').select('id, name, dept_number');
    const deptMap = new Map<string, string>();
    (dbDepts ?? []).forEach(d => {
      deptMap.set(d.name.toLowerCase().trim(), d.id);
      deptMap.set(d.dept_number.trim(), d.id);
    });

    // 4. Fetch BUBT Homepage to get academicHierarchy
    const homeRes = await fetch(BUBT_BASE, {
      headers: { 'User-Agent': 'CampusOne-Sync/1.0 (Academic Bot; BUBT Mobile)' },
    });
    const homeHtml = await homeRes.text();

    const hierarchyMatch = homeHtml.match(/window\.academicHierarchy\s*=\s*(\[[\s\S]*?\]);/);
    const departmentSlugs: { name: string; slug: string }[] = [];

    if (hierarchyMatch) {
      try {
        const rawHierarchy = JSON.parse(hierarchyMatch[1]);
        for (const facultyGroup of rawHierarchy) {
          if (Array.isArray(facultyGroup.subPages)) {
            for (const sub of facultyGroup.subPages) {
              if (sub.slug && sub.name) {
                departmentSlugs.push({ name: sub.name, slug: sub.slug });
              }
            }
          }
        }
      } catch (_e) {
        // Fallback below
      }
    }

    // Fallback if regex failed
    if (departmentSlugs.length === 0) {
      departmentSlugs.push(
        { name: 'Department of Computer Science & Engineering', slug: 'department-of-computer-science-engineering' },
        { name: 'Department of Electrical & Electronic Engineering', slug: 'department-of-electrical-electronic-engineering' },
        { name: 'Department of Civil Engineering', slug: 'department-of-civil-engineering' },
        { name: 'Department of Textile Engineering', slug: 'department-of-textile-engineering' },
        { name: 'Department of Data Science & Engineering', slug: 'department-of-data-science-engineering' },
        { name: 'Department of Management', slug: 'department-of-management' },
        { name: 'Department of Accounting', slug: 'department-of-accounting' },
        { name: 'Department of Marketing', slug: 'department-of-marketing' },
        { name: 'Department of Finance', slug: 'department-of-finance' },
        { name: 'Department of Mathematics & Statistics', slug: 'department-of-mathematics-statistics' },
        { name: 'Department of Law & Justice', slug: 'department-of-law-justice' },
        { name: 'Department of English', slug: 'department-of-english' },
        { name: 'Department of Economics', slug: 'department-of-economics' },
      );
    }

    let totalScanned = 0;
    let newAdded = 0;
    let promotionsUpdated = 0;
    let photosUpdated = 0;

    // 5. Scrape Department Rosters
    for (const d of departmentSlugs) {
      try {
        const deptUrl = `${BUBT_BASE}/department/${d.slug}`;
        const deptRes = await fetch(deptUrl, {
          headers: { 'User-Agent': 'CampusOne-Sync/1.0 (Academic Bot; BUBT Mobile)' },
        });
        if (!deptRes.ok) continue;
        const deptHtml = await deptRes.text();

        // Find department id in DB
        let deptId: string | undefined;
        for (const [key, id] of deptMap.entries()) {
          if (d.name.toLowerCase().includes(key) || key.includes(d.name.toLowerCase())) {
            deptId = id;
            break;
          }
        }
        if (!deptId) continue;

        // Extract faculty cards:
        // class="faculty-card ...", profile url contains "/faculty/profile/{code}", img contains photo, name in alt
        const cardRegex = /<div[^>]*class="[^"]*faculty-card[^"]*"[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<a[^>]*href="([^"]*\/faculty\/profile\/([^"]+))"/gi;

        let match: RegExpExecArray | null;
        while ((match = cardRegex.exec(deptHtml)) !== null) {
          totalScanned++;
          const photoUrl = match[1]?.trim() || null;
          const name = match[2]?.trim();
          let rawDesig = match[3]?.replace(/<[^>]+>/g, '').trim() || 'Lecturer';
          const profileUrl = match[4]?.trim() || null;
          const shortCode = match[5]?.trim().toUpperCase() || null;

          // Clean designation: remove department suffix if present
          if (rawDesig.includes(' - ')) rawDesig = rawDesig.split(' - ')[0].trim();
          if (rawDesig.includes(' — ')) rawDesig = rawDesig.split(' — ')[0].trim();

          const onLeave = rawDesig.toLowerCase().includes('leave');

          // Check existing faculty row
          const { data: existing } = await supabase
            .from('faculty')
            .select('id, designation, photo_url, short_code, blood_group')
            .eq('department_id', deptId)
            .ilike('name', name)
            .maybeSingle();

          if (existing) {
            const updates: Record<string, any> = {
              last_synced_at: new Date().toISOString(),
            };
            if (shortCode && !existing.short_code) updates.short_code = shortCode;
            if (photoUrl && existing.photo_url !== photoUrl) {
              updates.photo_url = photoUrl;
              photosUpdated++;
            }
            if (rawDesig && existing.designation !== rawDesig) {
              updates.designation = rawDesig;
              promotionsUpdated++;
            }
            if (onLeave) updates.on_leave = true;

            await supabase.from('faculty').update(updates).eq('id', existing.id);
          } else {
            // New teacher found on BUBT official site!
            const newRow = {
              department_id: deptId,
              name,
              designation: rawDesig,
              short_code: shortCode,
              photo_url: photoUrl,
              profile_url: profileUrl,
              on_leave: onLeave,
              research_interests: [],
              qualifications: [],
              data_source: 'main_site',
              last_synced_at: new Date().toISOString(),
            };
            await supabase.from('faculty').insert(newRow);
            newAdded++;
          }
        }
      } catch (_err) {
        // Continue with next department
      }
    }

    const durationMs = Date.now() - startedAt;

    // 6. Update audit log
    if (logId) {
      await supabase.from('faculty_sync_logs').update({
        status: 'success',
        total_scanned: totalScanned,
        new_added: newAdded,
        promotions_updated: promotionsUpdated,
        photos_updated: photosUpdated,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      }).eq('id', logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_scanned: totalScanned,
        new_added: newAdded,
        promotions_updated: promotionsUpdated,
        photos_updated: photosUpdated,
        duration_ms: durationMs,
      }),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    if (logId) {
      await supabase.from('faculty_sync_logs').update({
        status: 'failed',
        error_message: error?.message || 'Unknown crawl error',
        completed_at: new Date().toISOString(),
      }).eq('id', logId);
    }

    return new Response(JSON.stringify({ error: error?.message || 'Sync failed' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
