import crypto from 'node:crypto';

export const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
export const DASHBOARD_URL = 'https://yan-dashboard.vercel.app';

export function supabaseHeaders(extra) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra };
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function isAdmin(req) {
  return safeEqual(req.headers['x-admin-key'], process.env.AFFILIATE_ADMIN_KEY);
}

export function isAdminUser(req) {
  return isAdmin(req) && safeEqual(req.headers['x-admin-user'], process.env.AFFILIATE_ADMIN_USER);
}

export function isCron(req) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.method === 'GET' && safeEqual(req.headers.authorization, `Bearer ${secret}`);
}

export function hasBookingSecret(req) {
  return safeEqual(req.headers['x-yan-booking-secret'], process.env.YAN_BOOKING_SECRET);
}

export function dashboardHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-yan-booking-secret': process.env.YAN_BOOKING_SECRET || '',
  };
}

export async function postDashboard(path, body) {
  try {
    const res = await fetch(`${DASHBOARD_URL}${path}`, {
      method: 'POST',
      headers: dashboardHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`Dashboard ${path} failed: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error(`Dashboard ${path} error:`, err);
    return false;
  }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Model output is told not to use em dashes; this catches the ones that slip through.
export function withoutEmDashes(text) {
  return String(text ?? '').replace(/\s*\u2014\s*/g, ', ');
}

export function clip(value, max) {
  if (value == null) return '';
  return String(value).trim().slice(0, max);
}

export function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(value);
}

export function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(`${value}T12:00:00`).getTime());
}

const PAID_STATES = ['deposit_paid', 'paid_full'];

export function isPaid(booking) {
  return !!booking && PAID_STATES.includes(booking.payment_status);
}

// Lowest total a charter on this date and boat can legitimately cost: the
// published hourly rate times the 4-hour minimum. Weekend is Fri/Sat/Sun.
// With no usable date the weekday rate applies, since that is the floor.
export function minCharterTotal(date, boat) {
  const slyFox = /sly\s*fox/i.test(String(boat || ''));
  let weekend = false;
  if (isIsoDate(date)) {
    const day = new Date(`${date}T12:00:00`).getDay();
    weekend = day === 5 || day === 6 || day === 0;
  }
  const rate = slyFox ? (weekend ? 750 : 650) : weekend ? 600 : 500;
  return rate * 4;
}

export async function findBooking({ id, email }) {
  const select = async (filter) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?${filter}&limit=1`, { headers: supabaseHeaders() });
    if (!res.ok) throw new Error(`Booking lookup failed: ${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  };
  if (id && /^[A-Za-z0-9-]{1,64}$/.test(String(id))) {
    const byId = await select(`id=eq.${encodeURIComponent(id)}`);
    if (byId) return byId;
  }
  if (!email) return null;
  return select(`email=eq.${encodeURIComponent(email)}&archived=eq.false&order=created_at.desc`);
}

const CALENDAR_WEBHOOK = 'https://script.google.com/macros/s/AKfycbwvbcNmqi9QRDriGsv7rKZNIAOOm9u8KbLxL6sOndNzUspmqT3ecC_Dj53LovtxsWrh/exec';

export async function createCalendarEvent(b) {
  const url = process.env.GOOGLE_CALENDAR_WEBHOOK || CALENDAR_WEBHOOK;
  if (!b || !b.charter_date) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: b.first_name || '',
        last_name: b.last_name || '',
        phone: b.phone || '',
        email: b.email || '',
        charter_type: b.charter_type || 'Charter',
        preferred_date: b.charter_date,
        preferred_time: b.charter_time || '10:00',
        guests: b.guests || '',
        duration: b.duration || '4hr',
        message: b.special_requests || '',
      }),
    });
    if (!res.ok) console.error(`Calendar webhook failed: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error('Calendar create error:', err);
    return false;
  }
}

export function signOAuthState() {
  const ts = Date.now().toString();
  const mac = crypto.createHmac('sha256', process.env.AFFILIATE_ADMIN_KEY).update(ts).digest('hex');
  return `${ts}.${mac}`;
}

export function validOAuthState(state) {
  const key = process.env.AFFILIATE_ADMIN_KEY;
  if (!key || typeof state !== 'string') return false;
  const [ts, mac] = state.split('.');
  if (!ts || !mac || Date.now() - Number(ts) > 15 * 60 * 1000) return false;
  return safeEqual(mac, crypto.createHmac('sha256', key).update(ts).digest('hex'));
}
