import { createContext, useContext } from 'react';
import api from '../api';
import useApiData from '../hooks/useApiData';
import { useAuth } from './AuthContext';
import { linkFor } from '../utils/roles';

const NotificationContext = createContext();

const REFRESH = 60 * 1000; // new notifications show up within a minute

// My newest notifications from the backend (task reminders, overdue tasks, handovers,
// schedule changes, messages). Shared so the bell dropdown and the Notifications page agree.
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const query = useApiData('/notifications', { refreshEvery: REFRESH });
  // Administrators get the admin page for each link (e.g. a new handover opens Handover monitoring)
  const notifications = (query.data ?? []).map((n) => ({ ...n, link: linkFor(user, n.link) }));
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Shown as read straight away; the backend is told in the background
  const markRead = (id) => {
    if (notifications.find((n) => n.id === id)?.read) return;
    query.setData((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    api.patch(`/notifications/${id}/read`).catch(() => query.reload({ silent: true }));
  };

  const markAllRead = () => {
    query.setData((list) => list.map((n) => ({ ...n, read: true })));
    api.patch('/notifications/read-all').catch(() => query.reload({ silent: true }));
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, status: query.status, error: query.error, reload: query.reload }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
