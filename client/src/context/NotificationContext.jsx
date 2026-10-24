import { createContext, useContext, useState } from 'react';
import { sampleNotifications } from '../data/sample';

const NotificationContext = createContext();

// Shared list so the bell dropdown and the Notifications page stay in sync.
// Uses sample data until the backend has a notifications route.
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(sampleNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id) =>
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const markAllRead = () => setNotifications((list) => list.map((n) => ({ ...n, read: true })));

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
