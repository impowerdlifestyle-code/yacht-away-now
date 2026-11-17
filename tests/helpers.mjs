// Shared by the node --test suites. Every outbound request goes through a stub;
// a URL no route claims throws, so a test can never reach a live service.

export function setTestEnv() {
  Object.assign(process.env, {
    CRON_SECRET: 'test-cron-secret',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    RESEND_API_KEY: 'test-resend-key',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    AFFILIATE_ADMIN_KEY: 'test-admin-key',
    AFFILIATE_ADMIN_USER: 'test-admin',
  });
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// routes: [[matcher, handler]] where matcher is a string the URL must contain
// or a RegExp, optionally prefixed by a method like 'PUT '.
export function stubFetch(routes) {
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = (init.method || 'GET').toUpperCase();
    const call = { url, method, body: init.body, json: undefined };
    if (typeof init.body === 'string') {
      try { call.json = JSON.parse(init.body); } catch { /* form bodies stay as text */ }
    }
    calls.push(call);
    for (const [matcher, handler] of routes) {
      const hit = matcher instanceof RegExp ? matcher.test(`${method} ${url}`) : `${method} ${url}`.includes(matcher);
      if (hit) return handler(call);
    }
    throw new Error(`unstubbed fetch: ${method} ${url}`);
  };
  return calls;
}

export function makeReq({ method = 'GET', query = {}, body, headers = {} } = {}) {
  return { method, query, body, headers };
}

export function cronReq() {
  return makeReq({ headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
}

export function makeRes() {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.setHeader = (key, value) => { res.headers[key.toLowerCase()] = value; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.send = (body) => { res.body = body; return res; };
  res.redirect = (code, url) => { res.statusCode = code; res.headers.location = url; return res; };
  return res;
}

// An in-memory review_reply_drafts table that answers the three PostgREST
// shapes api/_review-drafts.js uses.
export function draftsTable(initial = []) {
  const table = new Map(initial.map((row) => [row.review_id, { ...row }]));
  const route = [/supabase\.co\/rest\/v1\/review_reply_drafts/, (call) => {
    const url = new URL(call.url);
    if (call.method === 'POST') {
      if (table.has(call.json.review_id)) return json([], 201);
      const row = { emailed_at: null, draft_text: null, hold_reason: null, ...call.json };
      table.set(row.review_id, row);
      return json([row], 201);
    }
    const filter = url.searchParams.get('review_id') || '';
    if (call.method === 'GET') {
      const ids = [...filter.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
      return json(ids.filter((id) => table.has(id)).map((id) => ({ ...table.get(id) })));
    }
    if (call.method === 'PATCH') {
      const row = table.get(filter.replace(/^eq\./, ''));
      const wanted = (url.searchParams.get('status') || '').replace(/^eq\./, '');
      if (!row || row.status !== wanted) return json([]);
      Object.assign(row, call.json);
      return json([{ ...row }]);
    }
    throw new Error(`drafts table: unexpected ${call.method}`);
  }];
  return { table, route };
}

export async function quiet(fn) {
  const saved = { log: console.log, warn: console.warn, error: console.error };
  const logged = [];
  console.log = console.warn = console.error = (...args) => { logged.push(args.map(String).join(' ')); };
  try {
    await fn();
  } finally {
    Object.assign(console, saved);
  }
  return logged;
}
