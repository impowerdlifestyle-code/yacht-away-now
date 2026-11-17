import crypto from 'node:crypto';
import { RATES, MIN_HOURS } from './_business-facts.js';
import { alertOwners as sendOwnerAlert } from './_owner-alert.js';

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

export function lowerEmail(value) {
  return clip(value, 254).toLowerCase();
}

// For names that end up in emails, the dashboard and the signed contract.
// The straight apostrophe becomes a typographic one so O'Brien stays O'Brien
// without leaving a quote character that could close an HTML attribute.
export function cleanName(value, max) {
  return clip(value, max).replace(/[<>"`]/g, '').replace(/'/g, '’').trim();
}

export const MAX_SIGNATURE_CHARS = 1000000;

export function isSignature(value) {
  return typeof value === 'string' && value.length <= MAX_SIGNATURE_CHARS
    && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value);
}

export function cleanInitials(initials) {
  if (!initials || typeof initials !== 'object' || Array.isArray(initials)) return null;
  const out = {};
  for (const [k, v] of Object.entries(initials).slice(0, 8)) out[clip(k, 40).replace(/[<>"'`]/g, '')] = clip(v, 8).replace(/[<>"'`]/g, '');
  return out;
}

// The contract page shows captains as "First L." and posts the row id. The
// dashboard matches bookings to captains on the exact full name, so that is
// what gets stored. Free text stays for Charterer's Choice.
export async function resolveCaptain(body) {
  const typed = cleanName(body.captain, 120);
  const id = String(body.captain_id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return typed;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/captains?id=eq.${id}&status=eq.active&select=name`, { headers: supabaseHeaders() });
    const rows = res.ok ? await res.json() : [];
    if (Array.isArray(rows) && rows[0] && rows[0].name) return cleanName(rows[0].name, 120);
    console.error(`Captain ${id} was not found among active captains (${res.status})`);
  } catch (err) {
    console.error('Captain lookup failed:', err);
  }
  return typed;
}

export const SITE_URL = 'https://www.yachtawaynow.com';

// Published hourly rates (pricing.html, sly-fox.html). Weekend is
// Fri/Sat/Sun. This is the only place the server prices a charter.
const HOURLY_RATES = { marquis: RATES.marquis, 'sly-fox': RATES.slyFox };
const MAX_HOURS = 12;

export function boatKey(boat) {
  const name = String(boat || '');
  if (/sly\s*fox/i.test(name)) return 'sly-fox';
  if (/marquis/i.test(name)) return 'marquis';
  return null;
}

// Hours for an hourly charter ("4hr", "8 hours"). Null for overnight,
// multi-day and anything else that is quoted by hand.
export function charterHours(duration) {
  const m = String(duration || '').trim().match(/^(\d{1,2})\s*h/i);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  return hours >= MIN_HOURS && hours <= MAX_HOURS ? hours : null;
}

export function hourlyRate(date, boat) {
  if (!isIsoDate(date)) return null;
  const day = new Date(`${date}T12:00:00`).getDay();
  const weekend = day === 5 || day === 6 || day === 0;
  return HOURLY_RATES[boatKey(boat) || 'marquis'][weekend ? 'weekend' : 'weekday'];
}

export function rateCardTotal({ date, boat, hours }) {
  const rate = hourlyRate(date, boat);
  return rate && hours ? rate * hours : null;
}

// A link token proves the holder was handed this booking's link by us. It is
// derived, not stored, so the dashboard can mint the same token from the same
// secret. The secret is trimmed because the dashboard's copy has a trailing newline.
export function linkToken(purpose, bookingId) {
  const secret = (process.env.YAN_BOOKING_SECRET || '').trim();
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(`${purpose}:${bookingId}`).digest('hex');
}

export function isBookingId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id);
}

export function validLinkToken(purpose, bookingId, token) {
  return isBookingId(bookingId) && typeof token === 'string' && safeEqual(token, linkToken(purpose, bookingId));
}

export function contractUrl(bookingId, flags = {}) {
  const params = new URLSearchParams({ booking_id: bookingId, t: linkToken('contract', bookingId) });
  for (const [k, v] of Object.entries(flags)) if (v) params.set(k, v);
  return `${SITE_URL}/contract?${params.toString()}`;
}

export function payBalanceUrl(bookingId) {
  const params = new URLSearchParams({ booking: bookingId, t: linkToken('pay', bookingId) });
  return `${SITE_URL}/api/pay-balance?${params.toString()}`;
}

async function selectBookings(filter) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?${filter}`, { headers: supabaseHeaders() });
  if (!res.ok) throw new Error(`Booking lookup failed: ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function getBooking(id) {
  if (!isBookingId(id)) return null;
  const rows = await selectBookings(`id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] || null;
}

// Older rows were saved with the casing the guest typed, so the match is
// case-insensitive. ilike treats % _ and * as wildcards, hence the exact
// comparison afterwards.
export async function findBookingByEmail(email) {
  const wanted = lowerEmail(email);
  if (!isEmail(wanted)) return null;
  const rows = await selectBookings(`email=ilike.${encodeURIComponent(wanted)}&archived=not.is.true&order=created_at.desc&limit=20`);
  return rows.find((r) => String(r.email || '').toLowerCase() === wanted) || null;
}

function toMinutes(hhmm) {
  const m = typeof hhmm === 'string' ? hhmm.match(/^(\d{1,2}):(\d{2})/) : null;
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

// Where a charter sits in its day, in minutes. Null when it has no start time
// and so cannot be placed. Overnight and multi-day hold the rest of the day.
export function busyRange(row) {
  const startMin = toMinutes(row.charter_time);
  if (startMin == null) return null;
  const num = String(row.duration || '').toLowerCase().match(/(\d+)\s*h/);
  return { startMin, endMin: num ? startMin + parseInt(num[1], 10) * 60 : 20 * 60 };
}

// Only money holds a slot. contract_signed can be set without paying, so a
// signature alone never blocks a time for other customers. The boat column is
// newer than the table, so the select falls back to fleet-wide without it.
export async function paidBookingsOn(date) {
  const filters =
    `charter_date=eq.${encodeURIComponent(date)}` +
    `&or=(payment_status.in.(deposit_paid,paid_full),status.in.(confirmed,deposit_paid))` +
    `&archived=not.is.true`;
  try {
    return { hasBoat: true, rows: await selectBookings(`${filters}&select=id,charter_time,duration,boat`) };
  } catch {
    return { hasBoat: false, rows: await selectBookings(`${filters}&select=id,charter_time,duration`) };
  }
}

// The paid booking, if any, that overlaps this one on the same boat. A paid
// row with no boat on it blocks both boats, as it does in the booking wizard.
export async function findConflict(booking) {
  const mine = isIsoDate(booking.charter_date) ? busyRange(booking) : null;
  if (!mine) return null;
  const myBoat = boatKey(booking.boat) || 'marquis';
  const { rows } = await paidBookingsOn(booking.charter_date);
  for (const row of rows) {
    if (String(row.id) === String(booking.id)) continue;
    const theirs = busyRange(row);
    if (!theirs || theirs.endMin <= mine.startMin || theirs.startMin >= mine.endMin) continue;
    const theirBoat = boatKey(row.boat);
    if (!theirBoat || theirBoat === myBoat) return row;
  }
  return null;
}

const lastAlertAt = new Map();

// True when this key already fired inside the window. Memory covers one warm
// instance; the alert_throttle table (migrations/2026-11-17-alert-throttle.sql)
// covers all of them. Without the table the memory check still applies.
export async function throttled(key, windowMs) {
  const now = Date.now();
  if (now - (lastAlertAt.get(key) || 0) < windowMs) return true;
  lastAlertAt.set(key, now);
  if (!process.env.SUPABASE_SERVICE_KEY) return false;
  try {
    const url = `${SUPABASE_URL}/rest/v1/alert_throttle`;
    const seen = await fetch(`${url}?key=eq.${encodeURIComponent(key)}&select=sent_at`, { headers: supabaseHeaders() });
    if (!seen.ok) return false;
    const [row] = await seen.json();
    if (row && now - new Date(row.sent_at).getTime() < windowMs) return true;
    await fetch(url, {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ key, sent_at: new Date(now).toISOString() }),
    });
  } catch (err) {
    console.error('throttle store unavailable:', err);
  }
  return false;
}

export async function alertOwners(subject, text, throttle) {
  if (throttle && await throttled(throttle.key, throttle.windowMs)) {
    console.error(`Owner alert throttled: ${subject}`);
    return false;
  }
  return sendOwnerAlert({ subject, text });
}

// The dashboard texts and emails the owners. If it cannot be reached the same
// facts go out by email from here, so the event is never lost in a log line.
export async function notifyOwners(payload) {
  if (await postDashboard('/api/owner-notify', payload)) return true;
  const lines = Object.entries(payload).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}: ${v}`);
  await alertOwners(`Yacht Away Now: ${payload.event} (dashboard alert failed)`, lines.join('\n'));
  return false;
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
