import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { homeFor, isAdmin } from '../utils/roles';
import Tour from '../components/Tour';

const TourContext = createContext(null);

// Each step points at the first of its targets that is on screen; none -> a card in the middle.
// (On phones the sidebar is hidden, so the menu button stands in for it.)
const MENU_BUTTON = 'button[aria-label="Show or hide menu"]';
const STEPS = {
  caregiver: [
    { targets: ['.sidebar', MENU_BUTTON], title: 'Your menu', text: 'Everything you need is here: your tasks, your schedule, your residents and the handover. On a phone, tap ☰ to open it.' },
    { targets: ['.start-here'], title: 'Start here', text: 'Each time you open AGAPAY, this card shows the one thing to do first, with a button that takes you there.' },
    { targets: ['.sidebar a[href="/handover"]', MENU_BUTTON], title: 'Handover', text: 'Read the handover left for you when your shift starts, and write a short one for the next caregiver before you leave. On a phone, it’s in the ☰ menu.' },
    { targets: ['button[aria-label^="Notifications"]'], title: 'Notifications', text: 'New tasks, overdue reminders, schedule changes and messages show up here. The ? button at the top shows this tour again.' },
  ],
  admin: [
    { targets: ['.sidebar', MENU_BUTTON], title: 'Your menu', text: 'Manage staff and residents, plan the schedule, follow tasks and handovers, and see reports. On a phone, tap ☰ to open it.' },
    { targets: ['.start-here'], title: 'Start here', text: 'This card shows the most important thing to handle right now, with a button that takes you there.' },
    { targets: ['.sidebar a[href="/admin/handover"]', MENU_BUTTON], title: 'Handover', text: 'Check that every shift handed over on time and that the next shift read it. Remind anyone who didn’t. On a phone, it’s in the ☰ menu.' },
    { targets: ['button[aria-label^="Notifications"]'], title: 'Notifications', text: 'Overdue tasks, new handovers, messages and sign-ups show up here. The ? button at the top shows this tour again.' },
  ],
};

// "Seen the tour" is remembered per person in this browser. If storage is blocked, the tour just
// shows once per visit.
const seenKey = (user) => `agapay.tourSeen.${user?.id}`;
const hasSeen = (user) => {
  try {
    return localStorage.getItem(seenKey(user)) === '1';
  } catch {
    return false;
  }
};
const markSeen = (user) => {
  try {
    localStorage.setItem(seenKey(user), '1');
  } catch { /* shows again next time; harmless */ }
};

// The welcome tour: shown the first time someone signs in (on their dashboard), and again from the
// "?" Help button in the top bar.
export function TourProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const home = homeFor(user);
  const [open, setOpen] = useState(false);

  const start = useCallback(() => {
    markSeen(user);
    setOpen(true);
  }, [user]);

  // First visit: wait a moment so the dashboard (and its Start here card) is on screen
  useEffect(() => {
    if (open || hasSeen(user) || pathname !== home) return undefined;
    const timer = setTimeout(start, 900);
    return () => clearTimeout(timer);
  }, [open, user, pathname, home, start]);

  // Help: the tour points at the dashboard, so go there first
  const replay = () => {
    if (pathname !== home) navigate(home);
    start();
  };

  return (
    <TourContext.Provider value={{ replay }}>
      {children}
      {open && <Tour steps={STEPS[isAdmin(user) ? 'admin' : 'caregiver']} onClose={() => setOpen(false)} />}
    </TourContext.Provider>
  );
}

export const useTour = () => useContext(TourContext);
