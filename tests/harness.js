// In-memory stand-ins for Supabase, Stripe, Resend, the dashboard, the
// calendar script, Business Brain and Turnstile. Any other host throws, so a
// test run cannot reach the network.
import crypto from 'node:crypto';

export const SECRET = process.env.YAN_BOOKING_SECRET;

export function token(purpose, id) {
  return crypto.createHmac('sha256', SECRET.trim()).update(`${purpose}:${id}`).digest('hex');
}

export const SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export function createWorld() {
  const world = {
    bookings: [],
    signedContracts: [],
    captains: [],
    stripeEvents: null,
    throttle: null,
    events: {},
    intents: {},
    sessions: [],
    emails: [],
    dashboard: [],
    calendar: [],
    brain: [],
    fail: {},
    turnstile: { success: true },
    nextId: 1,
  };

  const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });

  function supabase(url, init) {
    const table = url.pathname.replace('/rest/v1/', '');
    const q = url.searchParams;
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body ? JSON.parse(init.body) : null;
    if (world.fail[`${method} ${table}`]) return json(500, { message: 'stubbed failure' });

    if (table === 'bookings') {
      const eq = (k) => (q.get(k) || '').startsWith('eq.') ? q.get(k).slice(3) : null;
      if (method === 'GET') {
        let rows = world.bookings;
        if (eq('id')) rows = rows.filter((r) => r.id === eq('id'));
        if (eq('stripe_payment_id')) rows = rows.filter((r) => r.stripe_payment_id === eq('stripe_payment_id'));
        if (q.get('email')) {
          const want = q.get('email').replace('ilike.', '').toLowerCase();
          rows = rows.filter((r) => String(r.email || '').toLowerCase() === want && !r.archived);
        }
        if (eq('charter_date')) {
          rows = rows.filter((r) => r.charter_date === eq('charter_date') && !r.archived
            && (['deposit_paid', 'paid_full'].includes(r.payment_status) || ['confirmed', 'deposit_paid'].includes(r.status)));
        }
        return json(200, rows.map((r) => ({ ...r })));
      }
      if (method === 'POST') {
        const row = { id: `bk-new-${world.nextId++}`, archived: false, ...body };
        world.bookings.push(row);
        return json(201, [row]);
      }
      if (method === 'PATCH') {
        const hit = world.bookings.filter((r) => r.id === eq('id')
          && (q.get('contract_signed_at') !== 'is.null' || !r.contract_signed_at));
        hit.forEach((r) => Object.assign(r, body));
        return json(200, hit.map((r) => ({ ...r })));
      }
    }
    if (table === 'captains' && method === 'GET') {
      return json(200, world.captains.filter((c) => c.id === q.get('id').slice(3) && c.status === 'active').map((c) => ({ name: c.name })));
    }
    if (table === 'signed_contracts' && method === 'POST') {
      world.signedContracts.push(body);
      return json(201);
    }
    if (table === 'stripe_events') {
      if (!world.stripeEvents) return json(404, { code: 'PGRST205', message: "Could not find the table 'public.stripe_events'" });
      if (method === 'POST') {
        if (world.stripeEvents.some((e) => e.event_id === body.event_id)) return json(409, { code: '23505' });
        world.stripeEvents.push(body);
        return json(201);
      }
      if (method === 'DELETE') {
        const id = q.get('event_id').slice(3);
        world.stripeEvents = world.stripeEvents.filter((e) => e.event_id !== id);
        return json(204);
      }
    }
    if (table === 'alert_throttle') {
      if (!world.throttle) return json(404, { code: 'PGRST205' });
      if (method === 'GET') return json(200, world.throttle.filter((t) => t.key === q.get('key').slice(3)));
      world.throttle = world.throttle.filter((t) => t.key !== body.key).concat(body);
      return json(201);
    }
    throw new Error(`Unstubbed Supabase call: ${method} ${url}`);
  }

  function stripe(url, init) {
    const method = (init.method || 'GET').toUpperCase();
    const path = url.pathname.replace('/v1/', '');
    if (method === 'GET' && path.startsWith('events/')) {
      const ev = world.events[path.slice(7)];
      return ev ? json(200, ev) : json(404, {});
    }
    if (method === 'GET' && path.startsWith('payment_intents/')) {
      const pi = world.intents[path.slice(16)];
      return pi ? json(200, pi) : json(404, {});
    }
    if (method === 'POST' && path === 'checkout/sessions') {
      if (world.fail.stripe) return json(400, { error: { message: 'stubbed stripe failure' } });
      const params = Object.fromEntries(new URLSearchParams(init.body));
      const id = `cs_test_${world.sessions.length + 1}`;
      world.sessions.push({ id, params });
      return json(200, { id, url: `https://checkout.stripe.test/${id}` });
    }
    throw new Error(`Unstubbed Stripe call: ${method} ${url}`);
  }

  world.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    switch (url.host) {
      case 'ikntrboqezhkbtfwtzsg.supabase.co': return supabase(url, init);
      case 'api.stripe.com': return stripe(url, init);
      case 'api.resend.com':
        if (world.fail.resend) return json(500, { message: 'stubbed resend failure' });
        world.emails.push(JSON.parse(init.body));
        return json(200, { id: `em_${world.emails.length}` });
      case 'yan-dashboard.vercel.app':
        world.dashboard.push({ path: url.pathname, body: JSON.parse(init.body) });
        return json(world.fail[url.pathname] ? 500 : 200, {});
      case 'script.google.com':
        world.calendar.push(JSON.parse(init.body));
        return json(world.fail.calendar ? 500 : 200, {});
      case 'business-brain-six.vercel.app':
        world.brain.push(JSON.parse(init.body));
        return json(200, {});
      case 'challenges.cloudflare.com':
        return json(200, world.turnstile);
      default:
        throw new Error(`Test tried to reach the network: ${url}`);
    }
  };

  // A paid Stripe session and the event that announces it.
  world.addPayment = ({ event = 'evt_1', pi = 'pi_1', session = 'cs_live_1', amount, email = 'guest@example.com', metadata }) => {
    world.intents[pi] = { id: pi, metadata };
    world.events[event] = {
      id: event,
      type: 'checkout.session.completed',
      data: { object: { id: session, payment_status: 'paid', payment_intent: pi, amount_total: amount * 100, customer_email: email, metadata: {} } },
    };
    return event;
  };

  world.booking = (fields) => {
    const row = {
      id: `bk-${world.nextId++}`, first_name: 'Ada', last_name: 'Lovelace', email: 'guest@example.com', phone: '7275550199',
      charter_type: 'sunset', charter_date: '2026-12-05', charter_time: '13:00', duration: '4hr', boat: '52ft Marquis Flybridge',
      guests: 8, status: 'new', payment_status: 'unpaid', total_price: null, deposit_amount: null, stripe_payment_id: null,
      contract_signed_at: null, archived: false, ...fields,
    };
    world.bookings.push(row);
    return row;
  };

  return world;
}

export async function call(handler, { method = 'POST', body, query, headers = {} } = {}) {
  const res = {
    statusCode: 200, headers: {}, body: undefined, redirectedTo: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    redirect(code, url) { this.statusCode = code; this.redirectedTo = url; return this; },
  };
  await handler({ method, body, query: query || {}, headers }, res);
  return res;
}
