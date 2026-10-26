import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';
import { disconnectFromServer } from '../utils/push';

const AuthContext = createContext();

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  // Keeps the saved copy of the user in step with what the app shows
  const saveUser = (next) => {
    localStorage.setItem('user', JSON.stringify(next));
    setUser(next);
  };

  // Session check: when the app opens, ask the backend who is signed in.
  // A deactivated account or an expired token answers 401, and api.js then signs the person out.
  // If the server can't be reached, the saved user is kept so the page can show its own message.
  const userId = user?.id;
  useEffect(() => {
    if (!userId || !localStorage.getItem('token')) return;
    let cancelled = false;
    api
      .get('/users/me')
      .then(({ data }) => {
        if (!cancelled) saveUser(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const login = (data) => {
    localStorage.setItem('token', data.token);
    saveUser(data.user);
  };

  const logout = () => {
    // Stop pop-up notifications for this person on this browser (they come back on next sign-in)
    disconnectFromServer(localStorage.getItem('token'));
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser: saveUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
