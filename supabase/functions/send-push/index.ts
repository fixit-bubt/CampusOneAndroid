// send-push — deliver a notification to a user's devices via FCM HTTP v1.
//
// Invoked by the trg_push_on_notification trigger (pg_net) on each new
// `notifications` row. Reads the user's FCM tokens from push_tokens, mints a
// Google OAuth token from the Firebase service account (FCM_SERVICE_ACCOUNT
// secret), and posts to FCM v1. Invalid tokens are pruned.
//
// Required secret (dashboard -> Edge Functions -> Secrets):
//   FCM_SERVICE_ACCOUNT  - the full Firebase service-account JSON (as a string)
// The shared push_secret lives in the app_config table (read via service role),
// not an env var. Auto-provided: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

interface Payload {
  user_id: string;
  title: string;
  body: string;
  sector?: string;
  reference_id?: string | null;
  reference_type?: string | null;
}

function pemToBinary(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

function b64url(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Google OAuth access token via service-account JWT (scope firebase.messaging).
async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${b64url(new Uint8Array(sig))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`oauth failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Shared-secret gate: the DB trigger sends x-push-secret from a private
    // app_config row. Reject anything that doesn't match (the public anon key
    // alone is not enough to forge a push).
    const cfgRes = await fetch(
      `${supabaseUrl}/rest/v1/app_config?key=eq.push_secret&select=value`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    const cfg = (await cfgRes.json()) as { value: string }[];
    const expected = cfg?.[0]?.value;
    if (expected && req.headers.get('x-push-secret') !== expected) {
      return new Response('forbidden', { status: 403 });
    }

    const p = (await req.json()) as Payload;
    if (!p?.user_id || !p?.title) return new Response('bad request', { status: 400 });

    const saRaw = Deno.env.get('FCM_SERVICE_ACCOUNT');
    if (!saRaw) return new Response('FCM not configured', { status: 500 });
    const sa = JSON.parse(saRaw);

    // Fetch this user's device tokens.
    const tokRes = await fetch(
      `${supabaseUrl}/rest/v1/push_tokens?user_id=eq.${p.user_id}&select=token`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    const rows = (await tokRes.json()) as { token: string }[];
    if (!rows?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

    const accessToken = await getAccessToken(sa);
    const projectId = sa.project_id;
    let sent = 0;

    for (const { token } of rows) {
      const message = {
        message: {
          token,
          notification: { title: p.title, body: p.body },
          data: {
            sector: p.sector ?? '',
            reference_id: p.reference_id ?? '',
            reference_type: p.reference_type ?? '',
          },
          android: { priority: 'high', notification: { channel_id: 'default', sound: 'default' } },
        },
      };
      const fcmRes = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        },
      );
      if (fcmRes.ok) {
        sent++;
      } else if (fcmRes.status === 404 || fcmRes.status === 400) {
        // UNREGISTERED / invalid token — prune it.
        await fetch(`${supabaseUrl}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, {
          method: 'DELETE',
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        });
      }
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
