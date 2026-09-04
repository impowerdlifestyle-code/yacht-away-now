// Daily cron: the morning after a completed charter, text the guest a review
// request. The target rotates by booking id across Google, Yelp and TripAdvisor
// so no single profile gets every review. Sends nothing unless REVIEW_ASK_LIVE=1;
// otherwise it returns the exact messages it would have sent.
const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';

const TARGETS = [
  { key: 'google', url: process.env.REVIEW_URL_GOOGLE || 'https://share.google/7e44SLfCM74VXYfe2' },
  { key: 'yelp', url: process.env.REVIEW_URL_YELP || 'https://www.yelp.com/writeareview/biz/yacht-away-now-st-petersburg' },
  { key: 'tripadvisor', url: process.env.REVIEW_URL_TRIPADVISOR || 'https://www.tripadvisor.com/UserReviewEdit-g34607-d34299444' },
];

const SUPABASE_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

function yesterdayInNewYork() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(Date.now() - 86400000));
}

function toE164US(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(raw).startsWith('+')) return raw;
  return `+${digits}`;
}

function targetFor(id) {
  const tail = String(id).replace(/[^0-9a-f]/gi, '').slice(-8);
  return TARGETS[parseInt(tail || '0', 16) % 3];
}

// Telnyx does not append opt-out language; every outbound text in this
// business carries it by hand, so it is part of the body here too.
function buildMessage(firstName, url) {
  const named = `${firstName}, Capt Josh here. Mind a quick review of your St. Pete trip? ${url} Reply STOP to opt out`;
  if (named.length <= 160) return named;
  return `Capt Josh here. Mind a quick review of your St. Pete trip? ${url} Reply STOP to opt out`;
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  console.log(`review-ask run trigger=${authHeader ? 'cron' : 'manual'} at=${new Date().toISOString()}`);
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && req.method !== 'GET') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const live = process.env.REVIEW_ASK_LIVE === '1';
  const requestedDate = req.query && typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : null;
  const charterDate = requestedDate || yesterdayInNewYork();

  const params = new URLSearchParams({
    select: 'id,first_name,phone,charter_date,charter_time,status,payment_status,review_asked_at',
    charter_date: `eq.${charterDate}`,
    sms_consent: 'is.true',
    phone: 'not.is.null',
    review_asked_at: 'is.null',
    review_request_sent_at: 'is.null',
    or: '(payment_status.in.(deposit_paid,paid_full),status.in.(confirmed,completed))',
    order: 'charter_time.asc.nullslast',
  });
  params.append('status', 'not.in.(cancelled,canceled)');

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bookings?${params}`, { headers: SUPABASE_HEADERS });
    const rows = await r.json();

    if (!r.ok) {
      if (rows && rows.code === '42703' && /review_asked_at/.test(rows.message || '')) {
        console.error('review-ask: bookings.review_asked_at is missing; run migrations/2026-09-03-review-asked-at.sql before this cron can do anything');
        return res.status(200).json({ ok: false, reason: 'missing_column', column: 'review_asked_at', migration: 'migrations/2026-09-03-review-asked-at.sql' });
      }
      console.error('review-ask: Supabase query failed', rows);
      return res.status(502).json({ ok: false, error: rows });
    }

    const planned = rows.map((b) => {
      const target = targetFor(b.id);
      const firstName = (b.first_name || '').trim().split(/\s+/)[0] || 'there';
      return {
        booking_id: b.id,
        first_name: firstName,
        to: toE164US(b.phone),
        charter_date: b.charter_date,
        target: target.key,
        text: buildMessage(firstName, target.url),
      };
    });

    for (const p of planned) {
      console.log(`review-ask ${live ? 'SEND' : 'DRY'} booking=${p.booking_id} target=${p.target} to=${p.to} len=${p.text.length} text=${JSON.stringify(p.text)}`);
    }

    if (!live) {
      return res.status(200).json({ ok: true, live: false, charter_date: charterDate, would_send: planned.length, messages: planned });
    }
    if (planned.length === 0) {
      return res.status(200).json({ ok: true, live: true, charter_date: charterDate, sent: 0, results: [] });
    }
    if (!process.env.TELNYX_API_KEY || !process.env.TELNYX_FROM) {
      console.error('review-ask: TELNYX_API_KEY / TELNYX_FROM not set; nothing sent');
      return res.status(500).json({ ok: false, error: 'Telnyx not configured', would_send: planned.length });
    }

    const results = [];
    for (const p of planned) {
      try {
        const smsRes = await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: process.env.TELNYX_FROM, to: p.to, text: p.text }),
        });
        const smsData = await smsRes.json();
        if (!smsRes.ok) {
          console.error(`review-ask: Telnyx rejected booking=${p.booking_id}`, JSON.stringify(smsData));
          results.push({ ...p, status: 'failed', error: smsData });
          continue;
        }

        const patch = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${p.booking_id}`, {
          method: 'PATCH',
          headers: { ...SUPABASE_HEADERS, Prefer: 'return=minimal' },
          body: JSON.stringify({ review_asked_at: new Date().toISOString(), review_asked_target: p.target }),
        });
        if (!patch.ok) {
          console.error(`review-ask: sent but failed to stamp review_asked_at booking=${p.booking_id}`, await patch.text());
        }

        results.push({ ...p, status: 'sent', message_id: smsData?.data?.id || null, stamped: patch.ok });
      } catch (err) {
        console.error(`review-ask: error booking=${p.booking_id}`, err);
        results.push({ ...p, status: 'error', error: String(err) });
      }
    }

    return res.status(200).json({ ok: true, live: true, charter_date: charterDate, sent: results.filter((x) => x.status === 'sent').length, results });
  } catch (err) {
    console.error('review-ask error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
