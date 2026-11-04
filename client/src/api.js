import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

// Send the login token with every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
