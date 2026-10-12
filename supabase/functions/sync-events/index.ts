// sync-events — automated BUBT official campus events & activities crawler.
// Crawls official BUBT news & events hub (https://www.bubt.edu.bd/news),
// extracts published seminars, workshops, fests, sports, club activities,
// flyer banners, dates, venues, maps club relationships, and upserts into public.events.
//
// Requires authenticated JWT or cron sync secret to invoke.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-force-sync, x-sync-secret',
};

const BUBT_NEWS_URL = 'https://www.bubt.edu.bd/news';
const BUBT_NOTICE_URL = 'https://www.bubt.edu.bd/notice';

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

function resolveCategory(title: string, desc: string): 'Academic' | 'Cultural' | 'Sports' | 'Club' | 'Career' {
  const text = (title + ' ' + desc).toLowerCase();

  if (/futsal|cricket|football|sports|tournament|championship|badminton|athletics|olympiad/i.test(text)) {
    return 'Sports';
  }
  if (/cultural|music|singing|drama|dance|reception|farewell|celebration|rabindra|nazrul|pohela boishakh/i.test(text)) {
    return 'Cultural';
  }
  if (/career|job fair|internship|resume|recruitment|corporate|cv writing/i.test(text)) {
    return 'Career';
  }
  if (/club|bncc|rover scout|ieee|moot court|basis|advisory committee|executive committee/i.test(text)) {
    return 'Club';
  }
  return 'Academic';
}

function resolveVenue(desc: string): string {
  const text = desc.toLowerCase();
  if (text.includes('auditorium')) return 'Campus Auditorium, Building 1';
  if (text.includes('hall room')) return 'Hall Room, Building 2';
  if (text.includes('lab') || text.includes('laboratory')) return 'Computer Lab, Building 2';
  if (text.includes('playground') || text.includes('field')) return 'BUBT Campus Ground';
  if (text.includes('conference room')) return 'Conference Room, Building 1';
  return 'BUBT Main Campus, Mirpur-2';
}

function parseDateFromText(text: string): string {
  // Matches e.g. "Dec 29, 2025" or "October 12, 2026" or "12-10-2026"
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const m = text.match(/([a-zA-Z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const mon = monthMap[m[1].toLowerCase().slice(0, 3)];
    if (mon) {
      const day = m[2].padStart(2, '0');
      return `${m[3]}-${mon}-${day}`;
    }
  }

  // Fallback to Dhaka today if no date found
  const now = new Date();
  const dhakaStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(now);
  return dhakaStr;
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

  let triggeredBy = 'user';
  let isAuthorized = false;

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

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized invocation' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Throttle check: 90s cooldown unless forced or cron
  if (!isForce && triggeredBy !== 'cron') {
    const { data: recentLog } = await supabase
      .from('event_sync_logs')
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
    .from('event_sync_logs')
    .insert({ triggered_by: triggeredBy, status: 'running' })
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

    const fallbackAdminId = adminProfile?.id || '00000000-0000-0000-0000-000000000000';

    // 4. Fetch clubs for smart linking
    const { data: clubsList } = await supabase
      .from('clubs')
      .select('id, name')
      .eq('is_active', true);

    // 5. Fetch BUBT News Portal
    const newsRes = await fetch(BUBT_NEWS_URL, {
      headers: { 'User-Agent': 'CampusOne-SyncEngine/1.0 (BUBT Campus Mobile Companion)' }
    });

    if (!newsRes.ok) {
      throw new Error(`Failed to fetch BUBT News: HTTP ${newsRes.status}`);
    }

    const html = await newsRes.text();

    // 6. Regex Parse News/Event Cards from HTML
    // Cards contain: <img src="..."/>, <h3 ...>Title</h3>, <p ...>Desc</p>, <a href=".../news/slug">Read More</a>
    const cardRegex = /<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<a[^>]+href=["'](https?:\/\/www\.bubt\.edu\.bd\/news\/[^"']+)["']/gi;

    let match;
    const rawEvents: Array<{
      imageUrl: string;
      title: string;
      description: string;
      articleUrl: string;
      slug: string;
    }> = [];

    while ((match = cardRegex.exec(html)) !== null) {
      const imageUrl = match[1]?.trim();
      const rawTitle = stripHtml(match[3] || match[2] || '');
      const rawDesc = stripHtml(match[4] || '');
      const articleUrl = match[5]?.trim();
      const slugMatch = articleUrl.match(/\/news\/([^\/\?#]+)/);
      const slug = slugMatch ? slugMatch[1] : '';

      if (rawTitle && articleUrl) {
        rawEvents.push({
          imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://www.bubt.edu.bd${imageUrl}`,
          title: rawTitle,
          description: rawDesc,
          articleUrl,
          slug: slug || encodeURIComponent(rawTitle.slice(0, 30)),
        });
      }
    }

    let totalScanned = rawEvents.length;
    let newAdded = 0;
    let updatedCount = 0;

    for (const item of rawEvents) {
      const category = resolveCategory(item.title, item.description);
      const venue = resolveVenue(item.description);
      const eventDate = parseDateFromText(item.title + ' ' + item.description);

      // Club association matching
      let matchedClubId: string | null = null;
      if (clubsList && clubsList.length > 0) {
        const fullTxt = (item.title + ' ' + item.description).toLowerCase();
        for (const c of clubsList) {
          if (fullTxt.includes(c.name.toLowerCase())) {
            matchedClubId = c.id;
            break;
          }
        }
      }

      const externalId = `bubt_news_${item.slug}`;
      const code = `EVT-${item.slug.slice(0, 16).replace(/[^a-zA-Z0-9]/g, '')}`;

      // Check if already exists in DB
      const { data: existing } = await supabase
        .from('events')
        .select('id, title, date, banner_url')
        .eq('external_id', externalId)
        .maybeSingle();

      if (!existing) {
        // Insert new synced event
        const { error: insErr } = await supabase.from('events').insert({
          code,
          title: item.title,
          category,
          organizer: 'BUBT Administration',
          venue,
          date: eventDate,
          time: '10:00',
          end_time: '13:00',
          capacity: null,
          banner_url: item.imageUrl.includes('no-image') ? null : item.imageUrl,
          description: item.description || item.title,
          created_by: fallbackAdminId,
          source: 'bubt_news',
          external_id: externalId,
          external_url: item.articleUrl,
          club_id: matchedClubId,
          tags: [category.toLowerCase(), 'official_bubt'],
        });

        if (!insErr) newAdded++;
      } else {
        // Update existing record if banner or description refreshed
        const { error: upErr } = await supabase.from('events').update({
          title: item.title,
          banner_url: item.imageUrl.includes('no-image') ? existing.banner_url : item.imageUrl,
          description: item.description || item.title,
          external_url: item.articleUrl,
          club_id: matchedClubId,
        }).eq('id', existing.id);

        if (!upErr) updatedCount++;
      }
    }

    const duration = Date.now() - startedAt;

    // Update log
    if (logId) {
      await supabase.from('event_sync_logs').update({
        status: 'success',
        total_scanned: totalScanned,
        new_added: newAdded,
        updated_count: updatedCount,
        duration_ms: duration,
        details: { scanned_items: totalScanned, added: newAdded, updated: updatedCount },
      }).eq('id', logId);
    }

    return new Response(JSON.stringify({
      success: true,
      total_scanned: totalScanned,
      new_added: newAdded,
      updated_count: updatedCount,
      duration_ms: duration,
    }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    const duration = Date.now() - startedAt;
    if (logId) {
      await supabase.from('event_sync_logs').update({
        status: 'failed',
        error_message: err.message,
        duration_ms: duration,
      }).eq('id', logId);
    }

    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      duration_ms: duration,
    }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
});
