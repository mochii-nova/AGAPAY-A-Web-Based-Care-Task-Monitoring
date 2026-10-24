import { useEffect, useState } from 'react';
import api from '../api';

const OFFLINE_MESSAGE = "Can't reach the server. Please check that the backend is running.";

// Loads data from a backend route and tracks loading / error.
//
// While developing (npm run dev), if the server can't be reached at all,
// it shows `sample()` instead so the design can still be previewed.
// The real website (npm run build) never shows sample data.
//
// `sample` and `transform` must be defined outside the component (not inline).
export default function useApiData(path, { sample, transform = (data) => data } = {}) {
  const [state, setState] = useState({ data: null, status: 'loading', error: '', usingSample: false });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api
      .get(path)
      .then(({ data }) => {
        if (!cancelled) setState({ data: transform(data), status: 'ready', error: '', usingSample: false });
      })
      .catch((err) => {
        if (cancelled) return;
        const offline = !err.response;
        if (offline && import.meta.env.DEV && sample) {
          setState({ data: transform(sample()), status: 'ready', error: '', usingSample: true });
        } else {
          const error = offline ? OFFLINE_MESSAGE : err.response.data?.message || 'Something went wrong. Please try again.';
          setState({ data: null, status: 'error', error, usingSample: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, reloadKey, sample, transform]);

  // reload() shows "Loading…" again; reload({ silent: true }) refreshes quietly in the background
  const reload = ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, status: 'loading' }));
    setReloadKey((k) => k + 1);
  };

  return { ...state, reload };
}
