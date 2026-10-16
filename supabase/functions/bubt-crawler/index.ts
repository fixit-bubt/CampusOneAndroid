import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { runNoticesAdapter } from './adapters/notices.ts';
import { runEventsAdapter } from './adapters/events.ts';
import { runRoutinesAdapter } from './adapters/routines.ts';
import { runCalendarAdapter } from './adapters/calendar.ts';
import { runFacultyAdapter } from './adapters/faculty.ts';
import { runBusAdapter } from './adapters/bus.ts';
import type { AdapterResult } from './types.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret, x-force-sync, x-tier, x-feature',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Auth Gate
  const authHeader = req.headers.get('Authorization') ?? '';
  const syncSecretHeader = req.headers.get('x-sync-secret') ?? '';
  const url = new URL(req.url);

  let triggeredBy = 'app';
  let isAuthorized = false;

  // Validate cron secret if provided
  if (syncSecretHeader) {
    if (syncSecretHeader === 'campusone_auto_sync_secret_2026') {
      triggeredBy = 'cron';
      isAuthorized = true;
    } else {
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
  }

  // Validate JWT if not authorized via secret
  if (!isAuthorized && authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token === serviceRoleKey) {
      triggeredBy = 'service_role';
      isAuthorized = true;
    } else {
      const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
      if (!userErr && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'admin') {
          triggeredBy = 'admin';
        } else if (profile?.role === 'staff') {
          triggeredBy = 'staff';
        } else {
          triggeredBy = 'student';
        }
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized invocation' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Parse options from Query Params and Body
  let bodyJson: Record<string, any> = {};
  if (req.method === 'POST') {
    try {
      bodyJson = await req.json();
    } catch {}
  }

  const tier = (url.searchParams.get('tier') || bodyJson.tier || bodyJson.mode || 'fast').toLowerCase();
  const feature = (url.searchParams.get('feature') || bodyJson.feature || 'all').toLowerCase();
  let isForce = req.headers.get('x-force-sync') === 'true' || bodyJson.force === true;

  // Only admins, cron, and service_role can force bypass the throttle
  if (isForce && triggeredBy !== 'admin' && triggeredBy !== 'cron' && triggeredBy !== 'service_role') {
    isForce = false;
  }

  const logFeature = feature !== 'all' ? feature : (tier === 'faculty' ? 'faculty' : 'all');

  // 2. Throttle check (60s cooldown per feature/tier)
  if (!isForce && triggeredBy !== 'cron' && triggeredBy !== 'service_role') {
    const { data: recentLog } = await supabase
      .from('crawler_audit_logs')
      .select('id, items_scanned, items_added, items_updated, created_at')
      .eq('feature', logFeature)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentLog && (Date.now() - new Date(recentLog.created_at).getTime() < 60000)) {
      return new Response(
        JSON.stringify({
          success: true,
          throttled: true,
          message: `Crawler for ${logFeature} ran recently; cooldown active`,
          last_run: recentLog.created_at,
          total_scanned: recentLog.items_scanned,
          new_added: 0,
          updated_count: recentLog.items_updated,
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 3. Resolve system admin user for foreign key columns
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();

  let systemAdminId = adminProfile?.id;
  if (!systemAdminId) {
    const { data: anyProfile } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();
    systemAdminId = anyProfile?.id;
  }

  if (!systemAdminId) {
    throw new Error('No user profile found in database to assign as system author');
  }

  // 4. Create Initial Audit Log
  const { data: logEntry } = await supabase
    .from('crawler_audit_logs')
    .insert({
      feature: logFeature,
      triggered_by: triggeredBy,
      status: 'running',
    })
    .select('id')
    .single();

  const logId = logEntry?.id;
  const results: Record<string, AdapterResult> = {};

  try {
    // 5. Execution Router with strict feature-level isolation
    if (feature === 'faculty' || tier === 'faculty') {
      // Faculty Roster Deep Sweep
      const facRes = await runFacultyAdapter(supabase);
      results.faculty = facRes;
    } else if (feature === 'events') {
      // Standalone Events Sync
      const evRes = await runEventsAdapter(supabase, systemAdminId);
      results.events = evRes;
    } else if (feature === 'notices') {
      // Standalone Notices Sync
      const { result: noticeRes } = await runNoticesAdapter(supabase, systemAdminId);
      results.notices = noticeRes;
    } else if (feature === 'routines') {
      // Standalone Routines Sync
      const { rawNotices } = await runNoticesAdapter(supabase, systemAdminId);
      const routineRes = await runRoutinesAdapter(supabase, rawNotices, systemAdminId);
      results.routines = routineRes;
    } else if (feature === 'calendar') {
      // Standalone Academic Calendar Sync
      const { rawNotices } = await runNoticesAdapter(supabase, systemAdminId);
      const calRes = await runCalendarAdapter(supabase, rawNotices);
      results.calendar = calRes;
    } else if (feature === 'bus') {
      // Standalone Bus Schedule Sync
      const { rawNotices } = await runNoticesAdapter(supabase, systemAdminId);
      const busRes = await runBusAdapter(supabase, rawNotices);
      results.bus = busRes;
    } else {
      // Tier 1 Fast Cycle: Run Notices first, then parallel sub-adapters
      const { result: noticeRes, rawNotices } = await runNoticesAdapter(supabase, systemAdminId);
      results.notices = noticeRes;

      const [eventRes, routineRes, calRes, busRes] = await Promise.all([
        runEventsAdapter(supabase, systemAdminId).catch((err) => ({
          feature: 'events',
          scanned: 0,
          added: 0,
          updated: 0,
          unchanged: 0,
          error: err.message,
        })),
        runRoutinesAdapter(supabase, rawNotices, systemAdminId).catch((err) => ({
          feature: 'routines',
          scanned: 0,
          added: 0,
          updated: 0,
          unchanged: 0,
          error: err.message,
        })),
        runCalendarAdapter(supabase, rawNotices).catch((err) => ({
          feature: 'calendar',
          scanned: 0,
          added: 0,
          updated: 0,
          unchanged: 0,
          error: err.message,
        })),
        runBusAdapter(supabase, rawNotices).catch((err) => ({
          feature: 'bus',
          scanned: 0,
          added: 0,
          updated: 0,
          unchanged: 0,
          error: err.message,
        })),
      ]);

      results.events = eventRes;
      results.routines = routineRes;
      results.calendar = calRes;
      results.bus = busRes;

      // If user explicitly requested deep 'all', also run faculty
      if (tier === 'all') {
        const facRes = await runFacultyAdapter(supabase);
        results.faculty = facRes;
      }
    }

    // 6. Aggregate Telemetry
    let totalScanned = 0;
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;

    for (const r of Object.values(results)) {
      totalScanned += r.scanned || 0;
      totalAdded += r.added || 0;
      totalUpdated += r.updated || 0;
      totalUnchanged += r.unchanged || 0;
    }

    const durationMs = Date.now() - startedAt;

    // 7. Update Audit Log
    if (logId) {
      await supabase
        .from('crawler_audit_logs')
        .update({
          status: 'success',
          items_scanned: totalScanned,
          items_added: totalAdded,
          items_updated: totalUpdated,
          items_unchanged: totalUnchanged,
          duration_ms: durationMs,
          details: { tier, feature, results },
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tier,
        feature,
        duration_ms: durationMs,
        items_scanned: totalScanned,
        items_added: totalAdded,
        items_updated: totalUpdated,
        items_unchanged: totalUnchanged,
        // Legacy backward compatibility aliases
        total_scanned: totalScanned,
        new_added: totalAdded,
        updated_count: totalUpdated,
        features: results,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    if (logId) {
      await supabase
        .from('crawler_audit_logs')
        .update({
          status: 'failed',
          error_message: err.message,
          duration_ms: durationMs,
          details: { tier, feature, partial_results: results },
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({ success: false, error: err.message, duration_ms: durationMs }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
