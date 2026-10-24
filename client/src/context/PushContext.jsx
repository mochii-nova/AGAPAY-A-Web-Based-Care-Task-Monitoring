import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  PUSH_MESSAGES,
  pushSupport,
  permission,
  connectToServer,
  disconnectFromServer,
  sendServerTest,
  showLocalTest,
} from '../utils/push';

const PushContext = createContext();

// "This person wants pop-ups on this browser", remembered per AGAPAY account
const wantedKey = (userId) => `agapay.push.${userId}`;
const readWanted = (userId) => {
  try {
    return localStorage.getItem(wantedKey(userId)) === 'on';
  } catch {
    return false;
  }
};
const writeWanted = (userId, on) => {
  try {
    if (on) localStorage.setItem(wantedKey(userId), 'on');
    else localStorage.removeItem(wantedKey(userId));
  } catch {
    // Only a convenience; the switch just starts off next time
  }
};

const support = pushSupport();

// Pop-up (push) notifications: the switch, its status message, and the test button.
// Shared so the bell dropdown and the Notifications page always agree.
export function PushProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? 'me';
  const [perm, setPerm] = useState(permission);
  const [wanted, setWanted] = useState(() => readWanted(userId));
  const [server, setServer] = useState('idle'); // idle (= still connecting while on) | ready | backend | worker | error
  const [notice, setNotice] = useState(null); // { tone, text } after a click
  const [busy, setBusy] = useState(false);

  const on = support === 'ok' && perm === 'granted' && wanted;

  // Whenever the switch is on (also when AGAPAY opens), connect this browser to the server.
  // So it starts working by itself once Aeron adds the backend part.
  useEffect(() => {
    if (!on) return;
    connectToServer().then(
      () => setServer('ready'),
      (err) => setServer(['backend', 'worker'].includes(err.code) ? err.code : 'error')
    );
  }, [on]);

  // Notice when permission is changed in the browser's site settings
  useEffect(() => {
    if (support !== 'ok') return;
    const refresh = () => setPerm(Notification.permission);
    window.addEventListener('focus', refresh);
    let status;
    navigator.permissions?.query({ name: 'notifications' }).then((s) => {
      status = s;
      s.addEventListener('change', refresh);
    }, () => {});
    return () => {
      window.removeEventListener('focus', refresh);
      status?.removeEventListener('change', refresh);
    };
  }, []);

  const turnOn = async () => {
    // Ask first, straight from the click, or the browser may ignore the request
    const answer = await Notification.requestPermission();
    setPerm(answer);
    if (answer !== 'granted') {
      if (answer === 'default') setNotice({ tone: 'warning', text: PUSH_MESSAGES.dismissed });
      return;
    }
    writeWanted(userId, true);
    setWanted(true);
  };

  const turnOff = async () => {
    writeWanted(userId, false);
    setWanted(false);
    setServer('idle');
    await disconnectFromServer();
  };

  const toggle = async () => {
    if (busy || support !== 'ok') return;
    setNotice(null);
    setBusy(true);
    try {
      await (on ? turnOff() : turnOn());
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setNotice(null);
    setBusy(true);
    try {
      if (server === 'ready') {
        await sendServerTest();
        setNotice({ tone: 'success', text: 'Test sent by the AGAPAY server. It should pop up in a few seconds.' });
      } else {
        await showLocalTest();
        setNotice({ tone: 'success', text: 'Test pop-up shown by this browser. Click it to check that it opens AGAPAY.' });
      }
    } catch (err) {
      setNotice({ tone: 'error', text: err.message || PUSH_MESSAGES.server });
    } finally {
      setBusy(false);
    }
  };

  // The one-line status shown under the switch: { tone, text }
  let status;
  if (support !== 'ok') status = { tone: 'warning', text: PUSH_MESSAGES[support] };
  else if (perm === 'denied') status = { tone: 'warning', text: PUSH_MESSAGES.denied };
  else if (!on) status = { tone: 'muted', text: 'Off. Turn on to get pop-ups for overdue tasks and new handovers.' };
  else if (server === 'ready') status = { tone: 'success', text: 'On. You’ll get pop-ups for overdue tasks and new handovers, even when AGAPAY is in the background.' };
  else if (server === 'backend') status = { tone: 'info', text: PUSH_MESSAGES.backend };
  else if (server === 'worker') status = { tone: 'warning', text: PUSH_MESSAGES.worker };
  else if (server === 'error') status = { tone: 'warning', text: PUSH_MESSAGES.server };
  else status = { tone: 'muted', text: 'Connecting to the AGAPAY server…' };

  return (
    <PushContext.Provider
      value={{
        on,
        // The switch can't be used when the browser can't do it or has blocked it
        disabled: busy || support !== 'ok' || perm === 'denied',
        busy,
        canTest: on && ['ready', 'backend', 'error'].includes(server),
        status,
        notice,
        toggle,
        sendTest,
      }}
    >
      {children}
    </PushContext.Provider>
  );
}

export const usePush = () => useContext(PushContext);
