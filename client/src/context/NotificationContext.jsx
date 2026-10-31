import { createContext, useContext, useState } from 'react';
import api from '../api';
import useApiData from '../hooks/useApiData';
import useNow from '../hooks/useNow';
import { isoDay } from '../hooks/useShifts';
import { useAuth } from './AuthContext';
import { useHandovers } from './HandoverContext';
import { useMessages } from './MessagesContext';
import { useStaff } from './StaffContext';
import { linkFor, isAdmin } from '../utils/roles';
import { addDays } from '../utils/adminTasks';
import { describe, signupNotifications, taskIdOf } from '../utils/notifications';

const NotificationContext = createContext();

const REFRESH = 60 * 1000; // new notifications show up within a minute
const SIGNUPS_READ = 'agapay.readSignups'; // sign-ups opened in this browser

const readSignupIds = () => {
  try {
    return JSON.parse(localStorage.getItem(SIGNUPS_READ)) ?? [];
  } catch {
    return [];
  }
};

// My newest notifications from the backend (new and overdue tasks, handovers, schedule changes,
// messages), plus, for administrators, people waiting for approval. Each one gets specific text
// (utils/notifications.js). Shared so the bell dropdown and the Notifications page agree.
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const now = useNow();
  const { handovers } = useHandovers();
  const { conversations } = useMessages();
  const staff = useStaff(); // null for caregivers
  const query = useApiData('/notifications', { refreshEvery: REFRESH });
  const list = query.data ?? [];

  // The tasks the task notifications are about: one request for the days around them
  const taskTimes = list.filter((n) => taskIdOf(n.link)).map((n) => new Date(n.time));
  const tasksPath = taskTimes.length
    ? `/tasks?from=${addDays(isoDay(Math.min(...taskTimes)), -2)}&to=${addDays(isoDay(Math.max(...taskTimes)), 31)}`
    : null;
  const tasksQuery = useApiData(tasksPath, { refreshEvery: REFRESH });

  const [signupsRead, setSignupsRead] = useState(readSignupIds);
  const signups = admin && staff ? signupNotifications(staff.staff, signupsRead) : [];

  const context = { tasks: tasksQuery.data ?? [], handovers, conversations, now, admin };
  const notifications = [
    ...signups,
    // Administrators get the admin page for each link (e.g. a new handover opens Handover monitoring)
    ...list.map((n) => describe({ ...n, link: linkFor(user, n.link) }, context)),
  ].sort((a, b) => new Date(b.time) - new Date(a.time));
  const unreadCount = notifications.filter((n) => !n.read).length;

  const rememberSignups = (ids) => {
    const next = [...new Set([...signupsRead, ...ids])];
    setSignupsRead(next);
    try {
      localStorage.setItem(SIGNUPS_READ, JSON.stringify(next));
    } catch { /* only remembered until the page is reloaded */ }
  };

  // Shown as read straight away; the backend is told in the background
  const markRead = (id) => {
    if (String(id).startsWith('signup-')) return rememberSignups([id]);
    if (list.find((n) => n.id === id)?.read) return undefined;
    query.setData((all) => all.map((n) => (n.id === id ? { ...n, read: true } : n)));
    api.patch(`/notifications/${id}/read`).catch(() => query.reload({ silent: true }));
    return undefined;
  };

  const markAllRead = () => {
    rememberSignups(signups.map((s) => s.id));
    if (!list.some((n) => !n.read)) return;
    query.setData((all) => all.map((n) => ({ ...n, read: true })));
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
