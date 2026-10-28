import { useState } from 'react';
import { CheckCheck, Inbox } from 'lucide-react';
import CardHeader from '../CardHeader';
import { EmptyState } from '../StateMessage';
import { shiftLabel } from '../../constants';
import { formatTime } from '../../utils/format';
import { RESIDENT_STATUS, submittedLine } from '../../utils/handover';

// The newest handover from someone else, with "Mark as read" to confirm you've seen it
export default function LastShiftCard({ handover, myId, onAcknowledge }) {
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
  const read = handover.readByMe;
  const myRead = handover.reads?.find((r) => r.userId === myId);

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

      <p className="last-shift__meta submitted-line">
        {submittedLine(handover)}, {new Date(handover.submittedAt ?? handover.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </p>

      {flagged.map((r) => (
        <div key={r.residentId ?? r.name} className="last-shift__flag">
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

      {read ? (
        <p className="last-shift__read">
          <CheckCheck size={16} aria-hidden="true" /> You read this
          {myRead?.readAt && ` at ${formatTime(myRead.readAt)}`}
        </p>
      ) : (
        <button type="button" className="btn btn--soft last-shift__btn" onClick={markRead} disabled={busy}>
          {busy ? 'Saving…' : 'Mark as read'}
        </button>
      )}
    </section>
  );
}
