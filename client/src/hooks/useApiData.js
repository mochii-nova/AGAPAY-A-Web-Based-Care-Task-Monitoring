import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { onLiveRefresh } from '../utils/liveRefresh';

const OFFLINE_MESSAGE = "Can't reach the server. Please check that the backend is running.";
const SLOW_MESSAGE = 'The server is taking too long to answer. Please try again.';
// A request that hasn't answered by then counts as failed. Generous, because the online server can take
// up to a minute to wake up the first time.
const TIME_LIMIT = 60 * 1000;

// The default `transform`. It must be the same function on every render: a new one each time
// would start a new request after every answer, forever.
const asIs = (data) => data;

// The last answer for each route, per signed-in person, so going back to a page shows its data straight
// away (then it's refreshed quietly). The server's answer is kept as it came, and each page's own
// `transform` is applied when it's read. It lives until the browser page is reloaded.
const cache = new Map();
const cacheKey = (path) => `${localStorage.getItem('token') ?? ''} ${path}`;
const fromCache = (path, transform) => {
  const key = cacheKey(path);
  return path && cache.has(key) ? transform(cache.get(key)) : undefined;
};
const startState = (path, transform, useCache) => {
  const cached = useCache ? fromCache(path, transform) : undefined;
  return cached !== undefined
    ? { path, data: cached, status: 'ready', error: '' }
    : { path, data: null, status: 'loading', error: '' };
};

// Loads data from a backend route and tracks loading / error.
// `transform` must be defined outside the component (or memoized).
// `live`: also refresh quietly with the app's one shared timer (every 15 s, and when you come back
// to the tab or window; paused while the tab is hidden). See utils/liveRefresh.js.
// A refresh that brings the same data changes nothing on screen (no new render), and it never
// shows the loading skeleton, so typing and open pop-ups are never reset.
// `cache` (on unless turned off): a route loaded before shows its data straight away, then refreshes quietly.
// A `path` of null loads nothing (data stays null).
export default function useApiData(path, { transform = asIs, live = false, cache: useCache = true } = {}) {
  const [state, setState] = useState(() => startState(path, transform, useCache));
  const [reloadKey, setReloadKey] = useState(0);
  const lastAnswer = useRef(null); // the last answer as text, to skip refreshes that bring nothing new

  // Another route (another day, another person): show its remembered data if there is some; otherwise
  // what's on screen stays until the new answer arrives (as before)
  if (state.path !== path) {
    const cached = useCache ? fromCache(path, transform) : undefined;
    setState(cached !== undefined ? { path, data: cached, status: 'ready', error: '' } : { ...state, path });
  }

  useEffect(() => {
    if (!path) return undefined; // nothing to load (yet)
    // Leaving the page, switching to another route or reloading cancels the request still running,
    // so an old answer can never land on the new screen
    const controller = new AbortController();

    api
      .get(path, { signal: controller.signal, timeout: TIME_LIMIT })
      .then(({ data }) => {
        if (useCache) cache.set(cacheKey(path), data);
        const text = JSON.stringify(data);
        if (text === lastAnswer.current) {
          setState((s) => (s.status === 'ready' ? s : { ...s, status: 'ready', error: '' }));
          return;
        }
        lastAnswer.current = text;
        setState({ path, data: transform(data), status: 'ready', error: '' });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const error = err.code === 'ECONNABORTED'
          ? SLOW_MESSAGE
          : !err.response
            ? OFFLINE_MESSAGE
            : err.response.data?.message || 'Something went wrong. Please try again.';
        // A failed quiet refresh keeps what is already on screen
        setState((s) => (s.status === 'ready' ? s : { path, data: null, status: 'error', error }));
      });

    return () => controller.abort();
  }, [path, reloadKey, transform, useCache]);

  useEffect(() => {
    if (!live || !path) return undefined;
    return onLiveRefresh(() => setReloadKey((k) => k + 1));
  }, [live, path]);

  // reload() shows the loading skeleton again; reload({ silent: true }) refreshes quietly in the background
  const reload = ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, status: 'loading' }));
    setReloadKey((k) => k + 1);
  };

  // Change the loaded data in place, e.g. to show a saved item right away: setData((list) => ...)
  // (The next answer from the server is then always shown, even if it's the same as the last one.)
  // The remembered copy is dropped, so going back to the page never shows the older answer.
  const setData = (update) => {
    lastAnswer.current = null;
    if (path) cache.delete(cacheKey(path));
    setState((s) => (s.data ? { ...s, data: update(s.data) } : s));
  };

  const { path: _ignored, ...shown } = state;
  return { ...shown, reload, setData };
}
