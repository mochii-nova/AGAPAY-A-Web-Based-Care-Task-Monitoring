import { useEffect, useState } from 'react';
import api from '../api';

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
// `refreshEvery` (ms): also refresh quietly on a timer and when you come back to the window,
// e.g. for notifications and messages.
// `cache`: show the copy loaded earlier straight away (then refresh it quietly).
export default function useApiData(path, { transform = asIs, refreshEvery, cache: useCache = false } = {}) {
  const [state, setState] = useState(() =>
    useCache && cache.has(cacheKey(path))
      ? { data: cache.get(cacheKey(path)), status: 'ready', error: '' }
      : { data: null, status: 'loading', error: '' }
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Leaving the page, switching to another route or reloading cancels the request still running,
    // so an old answer can never land on the new screen
    const controller = new AbortController();

    api
      .get(path, { signal: controller.signal, timeout: TIME_LIMIT })
      .then(({ data }) => setState({ data: transform(data), status: 'ready', error: '' }))
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
    if (!refreshEvery) return undefined;
    const refresh = () => {
      if (document.visibilityState === 'visible') setReloadKey((k) => k + 1);
    };
    const timer = setInterval(refresh, refreshEvery);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshEvery]);

  // reload() shows "Loading…" again; reload({ silent: true }) refreshes quietly in the background
  const reload = ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, status: 'loading' }));
    setReloadKey((k) => k + 1);
  };

  // Change the loaded data in place, e.g. to show a saved item right away: setData((list) => ...)
  const setData = (update) => setState((s) => (s.data ? { ...s, data: update(s.data) } : s));

  return { ...state, reload, setData };
}
