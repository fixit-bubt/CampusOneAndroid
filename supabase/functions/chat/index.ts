// chat — AI chatbot proxy (Google Gemini). Keeps the Gemini API key server-side;
// the app never sees it. Requires a valid Supabase user JWT (default edge
// function auth gate — no anonymous calls).
//
// Grounds the bot in real campus data via Gemini function calling: bus routes,
// prayer times, lost & found, clubs, rides, routine files, events, blood
// requests, and jobs are looked up live from the DB instead of guessed. DB
// reads run as the CALLING USER (their JWT + anon key, not the service role)
// so Postgres RLS applies exactly as it does everywhere else in the app —
// e.g. lost_found_items is student-only by policy, so a staff/admin asking
// the bot about it correctly gets nothing back.
//
// Required secret (dashboard -> Edge Functions -> Secrets):
//   GEMINI_API_KEY  - from aistudio.google.com/apikey
// Auto-provided: SUPABASE_URL, SUPABASE_ANON_KEY.

const SYSTEM_PROMPT = `You are the CampusOne assistant for BUBT (Bangladesh University of Business & Technology) students. Be concise and helpful.

You have tools to look up live bus schedules, prayer times, lost & found posts, clubs, rides, class/exam routine files, campus events, blood donation requests, job/internship postings, and the faculty directory — use them instead of guessing when asked. If a tool returns no results, say so plainly rather than inventing an answer; lost & found is student-only data, so if a non-student account gets an empty result, mention that it's restricted to students rather than implying nothing exists. Routine lookups return uploaded PDF/image files per department/semester/section, not a per-course class-time schedule — point the user to the file rather than inventing a specific class time you don't actually have.

For CGPA questions you can calculate directly — you don't need a tool for this. The grading scale is: A+ =4.00, A=3.75, A- =3.50, B+ =3.25, B=3.00, B- =2.75, C+ =2.50, C=2.25, D=2.00, F=0.00. CGPA = sum(credit × grade point) / sum(credit). Show the math when it helps.

For anything else you don't have a tool for, tell the user to check the relevant tab in the app instead of guessing.`;

const GEMINI_MODEL = 'gemini-flash-latest';
const MAX_TOOL_ROUNDS = 3;

interface HistoryTurn {
  role: 'user' | 'model';
  text: string;
}

interface Payload {
  message: string;
  history?: HistoryTurn[];
}

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_bus_routes',
        description: 'Look up active BUBT campus bus routes, optionally filtered by area/stop name. Returns route code, name, area, bus number, helper contact, days it runs, and departure times to/from campus.',
        parameters: {
          type: 'object',
          properties: {
            area: { type: 'string', description: 'Optional area or stop name to filter by (partial match), e.g. "Mirpur"' },
          },
        },
      },
      {
        name: 'get_prayer_times',
        description: "Look up today's Azan and Jamaat times for all five daily prayers plus Jummah, as configured by campus admin.",
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'get_lostfound_items',
        description: 'Search open Lost & Found posts. Student-only data — returns empty for non-student accounts.',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['Lost', 'Found'], description: 'Filter to lost or found items only' },
            category: { type: 'string', enum: ['Personal', 'Electronics', 'Documents', 'Other'] },
            query: { type: 'string', description: 'Free-text match against the item title, e.g. "wallet"' },
          },
        },
      },
      {
        name: 'get_clubs',
        description: 'Search active campus clubs by category or name.',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['Tech', 'Cultural', 'Sports', 'Professional', 'Social'] },
            query: { type: 'string', description: 'Free-text match against the club name or tagline, e.g. "robotics"' },
          },
        },
      },
      {
        name: 'get_rides',
        description: 'Look up upcoming shared-ride offers to or from campus.',
        parameters: {
          type: 'object',
          properties: {
            direction: { type: 'string', enum: ['To Campus', 'From Campus'] },
            date: { type: 'string', description: 'ISO date (YYYY-MM-DD) to filter to; omit for all upcoming rides' },
          },
        },
      },
      {
        name: 'get_routines',
        description: 'Look up uploaded class or exam routine files by department/semester/section. Returns file metadata and a link, not individual class times.',
        parameters: {
          type: 'object',
          properties: {
            routineType: { type: 'string', enum: ['class', 'exam'] },
            department: { type: 'string', description: 'Partial match, e.g. "CSE"' },
            semester: { type: 'string' },
            section: { type: 'string' },
          },
        },
      },
      {
        name: 'get_events',
        description: 'Look up upcoming campus events, optionally filtered by category or a text search on the title.',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['Academic', 'Cultural', 'Sports', 'Club', 'Career'] },
            query: { type: 'string', description: 'Free-text match against the event title' },
          },
        },
      },
      {
        name: 'get_blood_requests',
        description: 'Look up active blood donation requests, optionally filtered by blood group.',
        parameters: {
          type: 'object',
          properties: {
            bloodGroup: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
          },
        },
      },
      {
        name: 'get_jobs',
        description: 'Look up open (non-expired) job and internship postings.',
        parameters: {
          type: 'object',
          properties: {
            jobType: { type: 'string', enum: ['internship', 'part_time', 'full_time'] },
            query: { type: 'string', description: 'Free-text match against the job title, e.g. "developer"' },
          },
        },
      },
      {
        name: 'get_faculty',
        description: 'Search the BUBT faculty directory by name or department. Returns designation, email, phone (CSE only), office/leave status.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Free-text match against the teacher\'s name, e.g. "Rahman"' },
            department: { type: 'string', description: 'Department name, partial match, e.g. "CSE" or "Computer Science"' },
          },
        },
      },
    ],
  },
];

// LIKE/ILIKE metacharacters in user-supplied search text must be escaped so a
// literal % or _ doesn't turn into a wildcard (same rule as messagesService).
function escLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function supaGet(supabaseUrl: string, anonKey: string, authHeader: string, path: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: anonKey, Authorization: authHeader },
  });
  if (!res.ok) throw new Error(`supabase query failed: ${res.status}`);
  return res.json();
}

async function runTool(
  name: string, args: Record<string, unknown>, supabaseUrl: string, anonKey: string, authHeader: string,
) {
  const get = (path: string) => supaGet(supabaseUrl, anonKey, authHeader, path);
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  if (name === 'get_bus_routes') {
    const area = str(args.area);
    const filter = area ? `&area=ilike.*${encodeURIComponent(escLike(area))}*` : '';
    const rows = await get(
      `bus_routes?select=id,name,area,bus_no,helper_name,helper_phone,days,to_departures,from_departures&active=eq.true${filter}&limit=10`,
    );
    return { routes: rows };
  }

  if (name === 'get_prayer_times') {
    const rows = await get(`prayer_times?select=key,en,azan,jamaat&order=sort`);
    return { prayer_times: rows };
  }

  if (name === 'get_lostfound_items') {
    const type = args.type === 'Lost' || args.type === 'Found' ? args.type : '';
    const category = str(args.category);
    const query = str(args.query);
    let filter = `&status=eq.Open`;
    if (type) filter += `&type=eq.${encodeURIComponent(type)}`;
    if (category) filter += `&category=eq.${encodeURIComponent(category)}`;
    if (query) filter += `&title=ilike.*${encodeURIComponent(escLike(query))}*`;
    const rows = await get(
      `lost_found_items?select=code,type,title,category,location,item_date,status${filter}&order=created_at.desc&limit=10`,
    );
    return { items: rows };
  }

  if (name === 'get_clubs') {
    const category = str(args.category);
    const query = str(args.query);
    let filter = `&is_active=eq.true`;
    if (category) filter += `&category=eq.${encodeURIComponent(category)}`;
    if (query) filter += `&or=(name.ilike.*${encodeURIComponent(escLike(query))}*,tagline.ilike.*${encodeURIComponent(escLike(query))}*)`;
    const rows = await get(`clubs?select=name,tagline,category,about${filter}&order=name.asc&limit=10`);
    return { clubs: rows };
  }

  if (name === 'get_rides') {
    const direction = args.direction === 'To Campus' || args.direction === 'From Campus' ? args.direction : '';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(str(args.date)) ? str(args.date) : '';
    const today = new Date().toISOString().slice(0, 10);
    let filter = `&date=gte.${date || today}`;
    if (date) filter = `&date=eq.${date}`;
    if (direction) filter += `&direction=eq.${encodeURIComponent(direction)}`;
    const rows = await get(
      `rides?select=code,direction,vehicle,origin,destination,date,time,seats_total,fare,recurring${filter}&order=date.asc,time.asc&limit=10`,
    );
    return { rides: rows };
  }

  if (name === 'get_routines') {
    const routineType = args.routineType === 'class' || args.routineType === 'exam' ? args.routineType : '';
    const department = str(args.department);
    const semester = str(args.semester);
    const section = str(args.section);
    let filter = '';
    if (routineType) filter += `&type=eq.${encodeURIComponent(routineType)}`;
    if (department) filter += `&department=ilike.*${encodeURIComponent(escLike(department))}*`;
    if (semester) filter += `&semester=eq.${encodeURIComponent(semester)}`;
    if (section) filter += `&section=eq.${encodeURIComponent(section)}`;
    const rows = await get(
      `routines?select=type,title,department,semester,intake,section,file_url,image_url,created_at${filter}&order=created_at.desc&limit=5`,
    );
    return { routines: rows };
  }

  if (name === 'get_events') {
    const category = str(args.category);
    const query = str(args.query);
    const today = new Date().toISOString().slice(0, 10);
    let filter = `&date=gte.${today}`;
    if (category) filter += `&category=eq.${encodeURIComponent(category)}`;
    if (query) filter += `&title=ilike.*${encodeURIComponent(escLike(query))}*`;
    const rows = await get(
      `events?select=title,category,organizer,date,time,end_time,venue,description,capacity${filter}&order=date.asc,time.asc&limit=10`,
    );
    return { events: rows };
  }

  if (name === 'get_blood_requests') {
    const groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    const bloodGroup = groups.includes(args.bloodGroup as string) ? (args.bloodGroup as string) : '';
    // Match the app's own feed rules exactly (bloodService.getBloodFeed):
    // hide fulfilled requests, age out anything older than 21 days.
    const staleCutoff = new Date(Date.now() - 21 * 86400000).toISOString();
    let filter = `&fulfilled_at=is.null&created_at=gte.${encodeURIComponent(staleCutoff)}`;
    if (bloodGroup) filter += `&blood_group=eq.${encodeURIComponent(bloodGroup)}`;
    const rows = await get(
      `blood_requests?select=code,blood_group,units,patient,hospital,area,urgency,created_at${filter}&order=created_at.desc&limit=10`,
    );
    return { blood_requests: rows };
  }

  if (name === 'get_jobs') {
    const jobType = ['internship', 'part_time', 'full_time'].includes(args.jobType as string) ? (args.jobType as string) : '';
    const query = str(args.query);
    const today = new Date().toISOString().slice(0, 10);
    let filter = `&deadline=gte.${today}`;
    if (jobType) filter += `&job_type=eq.${encodeURIComponent(jobType)}`;
    if (query) filter += `&title=ilike.*${encodeURIComponent(escLike(query))}*`;
    const rows = await get(
      `jobs?select=title,company,job_type,work_mode,location,stipend,deadline,apply_method,apply_value${filter}&order=deadline.asc&limit=10`,
    );
    return { jobs: rows };
  }

  if (name === 'get_faculty') {
    const query = str(args.query);
    const department = str(args.department);
    let select = 'name,designation,email,phone,on_leave,is_chairman';
    let filter = '';
    if (query) filter += `&name=ilike.*${encodeURIComponent(escLike(query))}*`;
    if (department) {
      select += ',departments!inner(name)';
      filter += `&departments.name=ilike.*${encodeURIComponent(escLike(department))}*`;
    } else {
      select += ',departments(name)';
    }
    const rows = await get(`faculty?select=${select}${filter}&order=name.asc&limit=10`);
    return { faculty: rows };
  }

  return { error: `unknown tool: ${name}` };
}

async function callGemini(apiKey: string, contents: unknown[]) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        tools: TOOLS,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `gemini request failed: ${res.status}`);
  return json;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'Gemini not configured' }), { status: 500 });
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    // The gateway already verified this JWT before invoking us — forward it
    // as-is so DB reads run as the calling user and RLS applies normally.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

    const p = (await req.json()) as Payload;
    const message = (p?.message ?? '').trim();
    if (!message) return new Response(JSON.stringify({ error: 'message required' }), { status: 400 });
    if (message.length > 4000) return new Response(JSON.stringify({ error: 'message too long (max 4000 chars)' }), { status: 400 });

    // Client-supplied history is untrusted — this endpoint is callable by any
    // authenticated user directly, not just through the app. Drop malformed
    // entries rather than letting a bad role/oversized text 400 the Gemini call.
    const history = (Array.isArray(p.history) ? p.history : [])
      .filter((h): h is HistoryTurn =>
        (h?.role === 'user' || h?.role === 'model') && typeof h?.text === 'string' && h.text.length > 0 && h.text.length <= 4000)
      .slice(-20);

    const contents: any[] = [
      ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message }] },
    ];

    let reply = '';
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const json = await callGemini(apiKey, contents);
      const candidate = json?.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const functionCalls = parts.filter((part: any) => part.functionCall);

      if (functionCalls.length === 0) {
        reply = parts.map((part: any) => part.text ?? '').join('');
        break;
      }

      // Echo the model's function-call turn, then run each tool and feed results back.
      contents.push({ role: 'model', parts });
      const responseParts = [];
      for (const fc of functionCalls) {
        const { name, args } = fc.functionCall;
        let result: unknown;
        try {
          result = await runTool(name, args ?? {}, supabaseUrl, anonKey, authHeader);
        } catch (e) {
          result = { error: String(e) };
        }
        responseParts.push({ functionResponse: { name, response: result } });
      }
      // NOTE: despite older Gemini docs showing role: "function" for tool
      // results, the live API rejects it ("Role 'function' is not supported")
      // — confirmed against the deployed model. "user" is what it accepts.
      contents.push({ role: 'user', parts: responseParts });
    }

    if (!reply) return new Response(JSON.stringify({ error: 'no response from model' }), { status: 502 });

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
