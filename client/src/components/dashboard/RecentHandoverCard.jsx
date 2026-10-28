import { Link } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { shiftLabel } from '../../constants';
import { formatTime } from '../../utils/format';
import { handoverSummary } from '../../utils/handover';

// "Sat, Oct 24 · 10:17 PM"
const when = (date) =>
  `${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatTime(date)}`;

// Handover status: the last handover I received (from whom, when, read or not),
// with the same "Mark as read" as on the Handover page.
export default function RecentHandoverCard({ handover, myId, onMarkRead, busy }) {
  if (!handover) {
    return (
      <section className="card dash-card">
        <p className="small-label">Handover status</p>
        <p className="dash-card__big">No handovers yet</p>
        <p className="dash-card__sub">When the shift before yours hands over, it shows here.</p>
      </section>
    );
  }

  const read = handover.readByMe;
  const myRead = handover.reads?.find((r) => r.userId === myId);
  // Form handovers: a short line like "1 resident to watch"; older plain-text ones: their text
  // (cut to two lines by CSS, so it never stops in the middle of a word)
  const summary = handover.data ? handoverSummary(handover) : handover.text;

  return (
    <section className="card dash-card">
      <div className="dash-card__head">
        <p className="small-label">Handover status</p>
        <span className={`status-pill status-pill--${read ? 'completed' : 'new'}`}>{read ? 'Read' : 'Unread'}</span>
      </div>
      <p className="dash-card__big">From {handover.author?.name ?? 'a caregiver'}</p>
      <p className="dash-card__sub">
        {shiftLabel(handover.shift)} shift · submitted {when(handover.submittedAt ?? handover.createdAt)}
      </p>
      <p className="dash-card__line">{summary}</p>

      <div className="dash-card__foot">
        {read ? (
          <span className="dash-card__done">
            <CheckCheck size={16} aria-hidden="true" /> You read it{myRead?.readAt && ` at ${formatTime(myRead.readAt)}`}
          </span>
        ) : (
          <button type="button" className="btn btn--soft btn--sm" onClick={onMarkRead} disabled={busy}>
            {busy ? 'Marking…' : 'Mark as read'}
          </button>
        )}
        <Link to="/handover?tab=received" className="card__link">Open</Link>
      </div>
    </section>
  );
}
