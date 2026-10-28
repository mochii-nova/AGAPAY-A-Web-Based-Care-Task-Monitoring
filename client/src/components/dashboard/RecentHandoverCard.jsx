import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import CardHeader from '../CardHeader';
import { EmptyState } from '../StateMessage';
import { shiftLabel } from '../../constants';
import { handoverSummary, submittedLine } from '../../utils/handover';

// The latest handover written by someone else (usually the previous shift), with who submitted it
// and the same "Mark as read" as on the Handover page.
export default function RecentHandoverCard({ handover, onMarkRead, busy }) {
  if (!handover) {
    return (
      <section className="card">
        <CardHeader title="From the last shift" />
        <EmptyState icon={Inbox}>No handovers yet.</EmptyState>
      </section>
    );
  }

  const read = handover.readByMe;
  // Form handovers: their "Other notes", or a short line like "1 resident to watch".
  // (data.summary is the task counts, not text.)
  const note = handover.data ? handover.data.other || handoverSummary(handover) : handover.text;

  return (
    <section className="card handover-note-card">
      <CardHeader title={`From the ${shiftLabel(handover.shift).toLowerCase()} shift`}>
        <span className={`status-pill status-pill--${read ? 'completed' : 'new'}`}>{read ? 'Read' : 'Unread'}</span>
      </CardHeader>

      <Link to="/handover?tab=received" className="handover-note">
        <p className="handover-note__text">{note}</p>
        <p className="submitted-line">{submittedLine(handover)}</p>
      </Link>

      {!read && (
        <button type="button" className="btn btn--primary handover-note-card__btn" onClick={onMarkRead} disabled={busy}>
          {busy ? 'Marking…' : 'Mark as read'}
        </button>
      )}
    </section>
  );
}
