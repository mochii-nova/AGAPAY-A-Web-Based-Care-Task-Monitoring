import { useEffect, useState } from 'react';
import api from '../api';

const OFFLINE_MESSAGE = "Can't reach the server. Please check that the backend is running.";

// Loads data from a backend route and tracks loading / error.
// `transform` must be defined outside the component (or memoized).
// `refreshEvery` (ms): also refresh quietly on a timer and when you come back to the window,
// e.g. for notifications and messages.
export default function useApiData(path, { transform = (data) => data, refreshEvery } = {}) {
  const [state, setState] = useState({ data: null, status: 'loading', error: '' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api
      .get(path)
      .then(({ data }) => {
        if (!cancelled) setState({ data: transform(data), status: 'ready', error: '' });
      })
      .catch((err) => {
        if (cancelled) return;
        const error = !err.response
          ? OFFLINE_MESSAGE
          : err.response.data?.message || 'Something went wrong. Please try again.';
        // A failed quiet refresh keeps what is already on screen
        setState((s) => (s.status === 'ready' ? s : { data: null, status: 'error', error }));
      });

    return () => {
      cancelled = true;
    };
  }, [path, reloadKey, transform]);

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
