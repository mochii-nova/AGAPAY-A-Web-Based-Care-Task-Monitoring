import { Link } from 'react-router-dom';
import { FileText, Inbox } from 'lucide-react';
import CardHeader from '../CardHeader';
import { EmptyState } from '../StateMessage';
import { shiftLabel } from '../../constants';
import { formatTime } from '../../utils/format';

// The latest handover written by someone else (usually the previous shift)
export default function RecentHandoverCard({ handover }) {
  return (
    <section className="card">
      <CardHeader icon={FileText} title="Latest handover" linkTo="/handover" />

      {!handover ? (
        <EmptyState icon={Inbox}>No handovers yet.</EmptyState>
      ) : (
        <Link to="/handover" className="handover-preview">
          <div className="handover-preview__top">
            <strong>From {shiftLabel(handover.shift)} shift</strong>
            {handover.acknowledgedBy ? (
              <span className="status-pill status-pill--completed">Read</span>
            ) : (
              <span className="status-pill status-pill--overdue">Not yet read</span>
            )}
          </div>
          <p className="handover-preview__meta">
            {handover.author?.name} · {formatTime(handover.createdAt)},{' '}
            {new Date(handover.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
          <p className="handover-preview__notes">{handover.notes}</p>
        </Link>
      )}
    </section>
  );
}
