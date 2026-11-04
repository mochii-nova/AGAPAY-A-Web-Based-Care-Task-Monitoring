import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { onLiveRefresh } from '../utils/liveRefresh';

const OFFLINE_MESSAGE = "Can't reach the server. Please check that the backend is running.";
const SLOW_MESSAGE = 'The server is taking too long to answer. Please try again.';
const TIME_LIMIT = 20 * 1000; // a request that hasn't answered by then counts as failed

// The default `transform`. It must be the same function on every render: a new one each time
// would start a new request after every answer, forever.
const asIs = (data) => data;

// Data kept for { cache: true }, per signed-in person and route, so going back is instant.
// It lives until the page is reloaded.
const cache = new Map();
const cacheKey = (path) => `${localStorage.getItem('token') ?? ''} ${path}`;

// Loads data from a backend route and tracks loading / error.
// `transform` must be defined outside the component (or memoized).
// `live`: also refresh quietly with the app's one shared timer (every 15 s, and when you come back
// to the tab or window; paused while the tab is hidden). See utils/liveRefresh.js.
// A refresh that brings the same data changes nothing on screen (no new render), and it never
// shows "Loading…", so typing and open pop-ups are never reset.
// `cache`: show the copy loaded earlier straight away (then refresh it quietly).
// A `path` of null loads nothing (data stays null).
export default function useApiData(path, { transform = asIs, live = false, cache: useCache = false } = {}) {
  const [state, setState] = useState(() =>
    useCache && cache.has(cacheKey(path))
      ? { data: cache.get(cacheKey(path)), status: 'ready', error: '' }
      : { data: null, status: 'loading', error: '' }
  );
  const [reloadKey, setReloadKey] = useState(0);
  const lastAnswer = useRef(null); // the last answer as text, to skip refreshes that bring nothing new

  useEffect(() => {
    if (!path) return undefined; // nothing to load (yet)
    // Leaving the page, switching to another route or reloading cancels the request still running,
    // so an old answer can never land on the new screen
    const controller = new AbortController();

    api
      .get(path, { signal: controller.signal, timeout: TIME_LIMIT })
      .then(({ data }) => {
        const text = JSON.stringify(data);
        if (text === lastAnswer.current) {
          setState((s) => (s.status === 'ready' ? s : { ...s, status: 'ready', error: '' }));
          return;
        }
        lastAnswer.current = text;
        setState({ data: transform(data), status: 'ready', error: '' });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const error = err.code === 'ECONNABORTED'
          ? SLOW_MESSAGE
          : !err.response
            ? OFFLINE_MESSAGE
            : err.response.data?.message || 'Something went wrong. Please try again.';
        // A failed quiet refresh keeps what is already on screen
        setState((s) => (s.status === 'ready' ? s : { data: null, status: 'error', error }));
      });

    return () => controller.abort();
  }, [path, reloadKey, transform]);

  // Keep the cached copy up to date (also after setData)
  useEffect(() => {
    if (useCache && state.status === 'ready') cache.set(cacheKey(path), state.data);
  }, [useCache, path, state]);

  useEffect(() => {
    if (!live || !path) return undefined;
    return onLiveRefresh(() => setReloadKey((k) => k + 1));
  }, [live, path]);

  // reload() shows "Loading…" again; reload({ silent: true }) refreshes quietly in the background
  const reload = ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, status: 'loading' }));
    setReloadKey((k) => k + 1);
  };

  // Change the loaded data in place, e.g. to show a saved item right away: setData((list) => ...)
  // (The next answer from the server is then always shown, even if it's the same as the last one.)
  const setData = (update) => {
    lastAnswer.current = null;
    setState((s) => (s.data ? { ...s, data: update(s.data) } : s));
  };

  return { ...state, reload, setData };
}
