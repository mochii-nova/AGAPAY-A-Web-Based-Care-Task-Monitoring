import { useState } from 'react';
import { BellRing, CircleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePush } from '../context/PushContext';
import { isAdmin } from '../utils/roles';

const WEEK = 7 * 24 * 60 * 60 * 1000;
// "Not now" hides the card for 7 days on this browser, per AGAPAY account
const snoozeKey = (userId) => `agapay.pushPrompt.${userId}`;
const isSnoozed = (userId) => {
  try {
    return Number(localStorage.getItem(snoozeKey(userId))) > Date.now();
  } catch {
    return false;
  }
};

// "Turn on reminders" card at the top of the dashboards. Shown only while the browser has never asked
// about notifications; once it has (allowed or blocked), the card goes away by itself.
export default function PushPrompt() {
  const { user } = useAuth();
  const push = usePush();
  const userId = user?.id ?? 'me';
  const [snoozed, setSnoozed] = useState(() => isSnoozed(userId));

  if (!push.canAsk || snoozed) return null;

  const notNow = () => {
    try {
      localStorage.setItem(snoozeKey(userId), String(Date.now() + WEEK));
    } catch {
      // Can't remember it: the card just comes back next time
    }
    setSnoozed(true);
  };

  return (
    <section className="card push-prompt" aria-labelledby="push-prompt-title">
      <span className="push-prompt__badge" aria-hidden="true"><BellRing size={20} /></span>
      <div className="push-prompt__text">
        <h2 id="push-prompt-title">Turn on reminders</h2>
        <p>
          {isAdmin(user)
            ? 'Get a pop-up for new sign-ups, missing handovers and new messages.'
            : 'Get a pop-up for overdue tasks and new handovers, even when AGAPAY is in the background.'}
        </p>
      </div>
      <div className="push-prompt__actions">
        <button type="button" className="btn btn--primary" onClick={push.turnOn} disabled={push.busy}>Turn on</button>
        <button type="button" className="btn btn--outline" onClick={notNow}>Not now</button>
      </div>
      {push.notice && (
        <div className={`alert alert--${push.notice.tone}`} role="status">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{push.notice.text}</span>
        </div>
      )}
    </section>
  );
}
