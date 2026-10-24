import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

// Send the login token with every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the login token has expired, sign out and go back to the Sign In page.
// (Not for /auth routes: a wrong password also answers 401.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.startsWith('/auth')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.assign('/login?expired=1');
    }
    return Promise.reject(error);
  }
);

export default api;
