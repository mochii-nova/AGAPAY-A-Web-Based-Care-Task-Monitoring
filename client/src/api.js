import axios from 'axios';
import { trackRequest } from './utils/serverWake';

// Saves wait up to a minute before they count as failed (the online server can be slow to wake up).
// Loading data sets its own limit in useApiData.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', timeout: 60 * 1000 });

// Send the login token with every request, and note it for "Waking up the server…" (utils/serverWake.js)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.finishedWaking = trackRequest();
  return config;
});
api.interceptors.response.use(
  (response) => {
    response.config.finishedWaking?.(true);
    return response;
  },
  (error) => {
    error.config?.finishedWaking?.(!!error.response);
    return Promise.reject(error);
  }
);

// If the login token has expired, or the account was deactivated or deleted,
// sign out and go back to the Sign In page. The backend's reason is shown there.
// (Not for /auth routes: a wrong password also answers 401.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.startsWith('/auth')) {
      const reason = error.response.data?.message;
      try {
        if (reason && /inactive|approval|no longer exists/i.test(reason)) sessionStorage.setItem('agapay.signedOut', reason);
      } catch { /* the default message is shown instead */ }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.assign('/login?expired=1');
    }
    return Promise.reject(error);
  }
);

export default api;
