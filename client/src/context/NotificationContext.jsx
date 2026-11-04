import { createContext, useContext, useEffect, useRef, useState } from 'react';
import api from '../api';
import useApiData from '../hooks/useApiData';
import useNow from '../hooks/useNow';
import { isoDay } from '../hooks/useShifts';
import { useAuth } from './AuthContext';
import { useHandovers } from './HandoverContext';
import { useMessages } from './MessagesContext';
import { useStaff } from './StaffContext';
import { useToast } from './ToastContext';
import { linkFor, isAdmin } from '../utils/roles';
import { addDays } from '../utils/adminTasks';
import { describe, groupMessages, mergeScheduleChanges, signupNotifications, taskIdOf, uniqueById } from '../utils/notifications';

const NotificationContext = createContext();

const SIGNUPS_READ = 'agapay.readSignups'; // sign-ups opened in this browser

// Notifications already shown (or already there when the page opened), so a refresh never
// pops the same one up again. Kept for this browser tab (sessionStorage).
const SHOWN = 'agapay.shownNotifications';
const readShown = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SHOWN)) ?? []);
  } catch {
    return new Set();
  }
};
const saveShown = (ids) => {
  try {
    sessionStorage.setItem(SHOWN, JSON.stringify([...ids].slice(-500)));
  } catch { /* only remembered until the page is reloaded */ }
};

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
  const query = useApiData('/notifications', { live: true }); // new ones show up within 15 s
  const list = uniqueById(query.data ?? []); // each notification ID once
  const showToast = useToast();
  const firstLoad = useRef(true);

  // A notification that arrives while the app is open pops up once (a small toast). The ones already
  // there when the page opens don't, and none pops up twice, even after a refresh.
  useEffect(() => {
    if (!query.data) return;
    const shown = readShown();
    const fresh = groupMessages(uniqueById(query.data)).filter((n) => !n.read && (n.mergedIds ?? [n.id]).some((id) => !shown.has(id)));
    query.data.forEach((n) => shown.add(n.id));
    saveShown(shown);
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (fresh.length === 1) showToast(fresh[0].title, 'info');
    else if (fresh.length > 1) showToast(`${fresh.length} new notifications`, 'info');
  }, [query.data, showToast]);

  // The tasks the task notifications are about: one request for the days around them
  const taskTimes = list.filter((n) => taskIdOf(n.link)).map((n) => new Date(n.time));
  const tasksPath = taskTimes.length
    ? `/tasks?from=${addDays(isoDay(Math.min(...taskTimes)), -2)}&to=${addDays(isoDay(Math.max(...taskTimes)), 31)}`
    : null;
  const tasksQuery = useApiData(tasksPath, { live: true });

  const [signupsRead, setSignupsRead] = useState(readSignupIds);
  const signups = admin && staff ? signupNotifications(staff.staff, signupsRead) : [];

  const context = { tasks: tasksQuery.data ?? [], handovers, conversations, now, admin };
  const all = [
    ...signups,
    // Administrators get the admin page for each link (e.g. a new handover opens Handover monitoring)
    // Several "Your schedule changed" for the same day show as one (the newest), and messages from one
    // person as one line ("3 new messages from …" while unread)
    ...groupMessages(mergeScheduleChanges(list)).map((n) => describe({ ...n, link: linkFor(user, n.link) }, context)),
  ];
  const notifications = uniqueById(all).sort((a, b) => new Date(b.time) - new Date(a.time));
  const unreadCount = notifications.filter((n) => !n.read).length;

  const rememberSignups = (ids) => {
    const next = [...new Set([...signupsRead, ...ids])];
    setSignupsRead(next);
    try {
      localStorage.setItem(SIGNUPS_READ, JSON.stringify(next));
    } catch { /* only remembered until the page is reloaded */ }
  };

  // Shown as read straight away; the backend is told in the background
  // (A merged schedule change marks all of that day's notifications read)
  const markRead = (id) => {
    if (String(id).startsWith('signup-')) return rememberSignups([id]);
    const ids = notifications.find((n) => n.id === id)?.mergedIds ?? [id];
    const unread = ids.filter((one) => list.some((n) => n.id === one && !n.read));
    if (unread.length === 0) return undefined;
    query.setData((all) => all.map((n) => (unread.includes(n.id) ? { ...n, read: true } : n)));
    Promise.all(unread.map((one) => api.patch(`/notifications/${one}/read`))).catch(() => query.reload({ silent: true }));
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
