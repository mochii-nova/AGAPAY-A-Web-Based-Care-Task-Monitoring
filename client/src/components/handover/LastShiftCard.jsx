import { useState } from 'react';
import { CheckCheck, Inbox } from 'lucide-react';
import CardHeader from '../CardHeader';
import { EmptyState } from '../StateMessage';
import { shiftLabel } from '../../constants';
import { formatTime } from '../../utils/format';
import { RESIDENT_STATUS } from '../../utils/handover';

const when = (date) =>
  `${formatTime(date)}, ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

// The newest handover from another caregiver, with "Mark as Read" to confirm you've seen it
export default function LastShiftCard({ handover, onAcknowledge }) {
  const [busy, setBusy] = useState(false);

  if (!handover) {
    return (
      <section className="card">
        <CardHeader title="From last shift" />
        <EmptyState icon={Inbox}>No handover from the last shift yet.</EmptyState>
      </section>
    );
  }

  const { data } = handover;
  const flagged = data?.residents.filter((r) => r.status !== 'normal') ?? [];
  const read = !!handover.acknowledgedBy;

  const markRead = async () => {
    setBusy(true);
    try {
      await onAcknowledge(handover);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`card last-shift ${read ? '' : 'is-unread'}`}>
      <CardHeader title={`From the ${shiftLabel(handover.shift).toLowerCase()} shift`}>
        <span className={`status-pill status-pill--${read ? 'completed' : 'new'}`}>{read ? 'Read' : 'Unread'}</span>
      </CardHeader>

      <p className="last-shift__meta">
        {handover.author?.name} · submitted {when(handover.createdAt)}
      </p>

      {flagged.map((r) => (
        <div key={r.name} className="last-shift__flag">
          <p className="last-shift__flag-title">{RESIDENT_STATUS[r.status].label} · {r.name}</p>
          <p>{r.note}</p>
        </div>
      ))}

      {data ? (
        <>
          <p className="last-shift__line"><span>Passed to you:</span> {data.passOn.length} {data.passOn.length === 1 ? 'task' : 'tasks'}</p>
          {data.other && <p className="last-shift__line"><span>Other notes:</span> {data.other}</p>}
        </>
      ) : (
        <p className="last-shift__text">{handover.text}</p>
      )}
      <p className="signature">— {handover.author?.name?.split(' ')[0]}, {formatTime(handover.createdAt)}</p>

      {read ? (
        <p className="last-shift__read">
          <CheckCheck size={16} aria-hidden="true" /> Read by {handover.acknowledgedBy.name}
          {handover.acknowledgedAt && ` at ${formatTime(handover.acknowledgedAt)}`}
        </p>
      ) : (
        <button type="button" className="btn btn--soft last-shift__btn" onClick={markRead} disabled={busy}>
          {busy ? 'Saving…' : 'Mark as read'}
        </button>
      )}
    </section>
  );
}
