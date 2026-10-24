import { Link } from 'react-router-dom';
import { FileText, Inbox } from 'lucide-react';
import CardHeader from '../CardHeader';
import { EmptyState } from '../StateMessage';
import { shiftLabel } from '../../constants';
import { formatTime } from '../../utils/format';
import { handoverSummary, RESIDENT_STATUS } from '../../utils/handover';

// The latest handover written by someone else (usually the previous shift)
export default function RecentHandoverCard({ handover }) {
  const flagged = handover?.data?.residents.filter((r) => r.status !== 'normal') ?? [];

  return (
    <section className="card">
      <CardHeader icon={FileText} title="Latest handover" linkTo="/handover?tab=received" />

      {!handover ? (
        <EmptyState icon={Inbox}>No handovers yet.</EmptyState>
      ) : (
        <Link to="/handover?tab=received" className="handover-preview">
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
          <p className="handover-preview__notes">
            {handover.data
              ? flagged.length
                ? flagged.map((r) => `${RESIDENT_STATUS[r.status].label}: ${r.name}`).join(' · ')
                : handoverSummary(handover)
              : handover.text}
          </p>
        </Link>
      )}
    </section>
  );
}
