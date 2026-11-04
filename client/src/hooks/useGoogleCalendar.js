import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '../context/AuthContext';
import useNow from './useNow';
import {
  googleConfigured,
  googleLoaded,
  loadGoogle,
  requestToken,
  revokeToken,
  fetchEmail,
  fetchCalendarTimeZone,
  shiftEventId,
  findShiftEvent,
  addShiftEvent,
} from '../utils/googleCalendar';

// The Google connection lives in memory only (never saved), so it survives moving between
// pages but not a page reload. The email is remembered so reconnecting is one click.
let state = { userId: null, token: null, expiresAt: 0, email: '', calendarTz: '', events: {} };
const listeners = new Set();
const setState = (changes) => {
  state = { ...state, ...changes };
  listeners.forEach((fn) => fn());
};
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const emailKey = (userId) => `agapay.gcal.${userId}`;
const readEmail = (userId) => {
  try {
    return localStorage.getItem(emailKey(userId)) ?? '';
  } catch {
    return '';
  }
};
const writeEmail = (userId, email) => {
  try {
    if (email) localStorage.setItem(emailKey(userId), email);
    else localStorage.removeItem(emailKey(userId));
  } catch {
    // Only a convenience; fine to lose
  }
};

// Connect / disconnect Google Calendar and add shifts to it.
// status: 'off' (never connected), 'connected', or 'expired' (connected before, needs one click)
export default function useGoogleCalendar() {
  const { user } = useAuth();
  const userId = user?.id ?? 'me';
  const store = useSyncExternalStore(subscribe, () => state);
  const now = useNow(30000);
  const [ready, setReady] = useState(googleLoaded);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!googleConfigured || ready) return;
    loadGoogle().then(() => setReady(true), setLoadError);
  }, [ready]);

  // A different AGAPAY account signed in on this tab: forget the old connection
  const mine = store.userId === userId;
  const lastEmail = (mine && store.email) || readEmail(userId);
  const connected = mine && Boolean(store.token) && now.getTime() < store.expiresAt;
  const status = connected ? 'connected' : lastEmail ? 'expired' : 'off';

  // Wraps Google calls: an expired token switches the status to "expired"
  const withToken = async (fn) => {
    try {
      return await fn(store.token);
    } catch (err) {
      if (err.code === 'expired') setState({ token: null });
      throw err;
    }
  };

  return {
    configured: googleConfigured,
    ready,
    loadError,
    status,
    email: connected ? store.email : '',
    calendarTz: connected ? store.calendarTz : '',
    lastEmail,

    // Must be called straight from a click, so the pop-up isn't blocked
    async connect() {
      const { token, expiresAt } = await requestToken(lastEmail);
      const [email, calendarTz] = await Promise.all([
        fetchEmail(token).catch(() => ''),
        fetchCalendarTimeZone(token).catch(() => ''),
      ]);
      const events = mine && email === store.email ? store.events : {};
      setState({ userId, token, expiresAt, email, calendarTz, events });
      writeEmail(userId, email);
    },

    disconnect() {
      if (store.token) revokeToken(store.token);
      setState({ userId, token: null, expiresAt: 0, email: '', calendarTz: '', events: {} });
      writeEmail(userId, '');
    },

    // undefined = not checked yet, null = not in the calendar, otherwise the Google event
    savedEvent: (shift, date) => (connected ? store.events[shiftEventId(userId, shift, date)] : undefined),

    async checkShift(shift, date) {
      const id = shiftEventId(userId, shift, date);
      try {
        const event = await withToken((token) => findShiftEvent(token, id));
        setState({ events: { ...state.events, [id]: event } });
      } catch (err) {
        // Couldn't check: still let them press Add (adding twice is safe anyway)
        if (err.code !== 'expired') setState({ events: { ...state.events, [id]: null } });
        throw err;
      }
    },

    async addShift(shift, date) {
      const id = shiftEventId(userId, shift, date);
      const result = await withToken((token) => addShiftEvent(token, id, shift, date));
      setState({ events: { ...state.events, [id]: result.event } });
      return result;
    },
  };
}
