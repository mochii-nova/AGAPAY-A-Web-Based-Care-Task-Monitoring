// Google Calendar straight from the browser, using Google Identity Services (GIS).
// Only the public Client ID is used (VITE_GOOGLE_CLIENT_ID in client/.env). No secrets, no backend.
import { shiftManilaTimes, shiftEventText, CAREHOME_TZ } from './shift';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const googleConfigured = Boolean(CLIENT_ID);

const MESSAGES = {
  load: "Couldn't load Google sign-in. Check your internet connection, then reload the page.",
  popup_closed: 'The Google window was closed before you finished. Please try again.',
  popup_failed_to_open: 'Your browser blocked the Google window. Allow pop-ups for this site, then try again.',
  access_denied: "You didn't allow access, so AGAPAY can't add shifts to your Google Calendar.",
  scope: 'Please tick the box that lets AGAPAY “see, edit, share and delete” calendar events, then try again.',
  expired: 'Your Google connection has expired. Please connect again.',
  api_disabled: 'The Google Calendar API is turned off in the Google Cloud project. Turn it on in APIs & Services → Library.',
  network: "Can't reach Google. Check your internet connection.",
  duplicate: 'This shift is already in your Google Calendar.',
  unknown: 'Something went wrong with Google Calendar. Please try again.',
};

export class GoogleError extends Error {
  constructor(code) {
    super(MESSAGES[code] ?? MESSAGES.unknown);
    this.code = MESSAGES[code] ? code : 'unknown';
  }
}

// Loads Google's sign-in script once. Load it early (when the page opens), because the
// sign-in pop-up must open straight from the click or the browser blocks it.
let scriptPromise;
export function loadGoogle() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new GoogleError('load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export const googleLoaded = () => Boolean(window.google?.accounts?.oauth2);

// Opens Google's pop-up and asks for calendar access. Resolves with a short-lived access token.
export function requestToken(loginHint) {
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) return Promise.reject(new GoogleError('load'));
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: `openid email ${CALENDAR_SCOPE}`,
      login_hint: loginHint || undefined,
      callback: (res) => {
        if (res.error) return reject(new GoogleError(res.error));
        if (!oauth2.hasGrantedAllScopes(res, CALENDAR_SCOPE)) return reject(new GoogleError('scope'));
        // Treat it as expired a minute early, so a request never fails halfway
        resolve({ token: res.access_token, expiresAt: Date.now() + (Number(res.expires_in) - 60) * 1000 });
      },
      error_callback: (err) => reject(new GoogleError(err.type)),
    });
    client.requestAccessToken();
  });
}

export function revokeToken(token) {
  window.google?.accounts?.oauth2?.revoke(token, () => {});
}

// Calls a Google API and turns failures into GoogleError with a clear message.
// Returns null for "not found".
async function call(token, url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  } catch {
    throw new GoogleError('network');
  }
  if (res.ok) return res.json();
  if (res.status === 404 || res.status === 410) return null;
  if (res.status === 401) throw new GoogleError('expired');
  if (res.status === 409) throw new GoogleError('duplicate');

  const { error } = await res.json().catch(() => ({}));
  const reasons = [...(error?.errors ?? []), ...(error?.details ?? [])].map((e) => e.reason);
  if (reasons.includes('accessNotConfigured') || reasons.includes('SERVICE_DISABLED')) throw new GoogleError('api_disabled');
  if (reasons.includes('insufficientPermissions') || reasons.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) throw new GoogleError('scope');
  throw new GoogleError('unknown');
}

export async function fetchEmail(token) {
  const info = await call(token, USERINFO_URL);
  return info?.email ?? '';
}

// The time zone the person's Google Calendar is set to, e.g. 'Europe/London'
export async function fetchCalendarTimeZone(token) {
  const list = await call(token, `${EVENTS_URL}?maxResults=1&fields=timeZone`);
  return list?.timeZone ?? '';
}

// "GMT+08:00" for a time zone at a given moment (Manila has no daylight saving)
export function utcOffset(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(date);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  return name === 'GMT' ? 'GMT+00:00' : name;
}

// When a Manila shift starts, as shown in a calendar set to `timeZone`, e.g. "Sat, Oct 24, 10:00 PM"
export function shiftStartIn(timeZone, shift, date) {
  const start = new Date(`${shiftManilaTimes(shift, date).start}+08:00`);
  return start.toLocaleString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const sameOffsetAsManila = (timeZone) => !timeZone || utcOffset(timeZone) === utcOffset(CAREHOME_TZ);

// The same shift on the same day always gets the same event ID, so it can never be added twice.
// Google only allows the letters a–v and digits in IDs, so the readable key is written as hex.
export function shiftEventId(userId, shift, date) {
  const d = new Date(date);
  const key = `agapay:${userId ?? 'me'}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}:${shift.id}`;
  return [...new TextEncoder().encode(key)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The event in the user's calendar, or null if it isn't there (or was deleted)
export async function findShiftEvent(token, id) {
  const event = await call(token, `${EVENTS_URL}/${id}`);
  return event && event.status !== 'cancelled' ? event : null;
}

// Adds the shift. Returns { event, existed } — existed is true if it was already in the calendar.
export async function addShiftEvent(token, id, shift, date) {
  // Manila clock times with the Manila time zone, never this computer's time zone
  const { start, end } = shiftManilaTimes(shift, date);
  const { title, details, location } = shiftEventText(shift);
  const body = {
    id,
    summary: title,
    description: details,
    location,
    start: { dateTime: start, timeZone: CAREHOME_TZ },
    end: { dateTime: end, timeZone: CAREHOME_TZ },
    status: 'confirmed',
  };

  try {
    return { event: await call(token, EVENTS_URL, { method: 'POST', body: JSON.stringify(body) }), existed: false };
  } catch (err) {
    if (err.code !== 'duplicate') throw err;
  }
  // The ID is taken: either it's already there, or it was deleted earlier and can be brought back
  const current = await call(token, `${EVENTS_URL}/${id}`);
  if (current && current.status !== 'cancelled') return { event: current, existed: true };
  return { event: await call(token, `${EVENTS_URL}/${id}`, { method: 'PUT', body: JSON.stringify(body) }), existed: false };
}
