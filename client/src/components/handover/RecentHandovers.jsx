import { ArrowRight, History } from 'lucide-react';
import CardHeader from '../CardHeader';
import { EmptyState } from '../StateMessage';
import { shiftLabel } from '../../constants';
import { handoverTiming, handoverSummary } from '../../utils/handover';

const shortDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// The last few handovers, each marked On time or Late
export default function RecentHandovers({ handovers, myId, onViewAll }) {
  return (
    <section className="card">
      <CardHeader title="Recent handovers">
        <button type="button" className="card__link" onClick={onViewAll}>
          View all <ArrowRight size={16} aria-hidden="true" />
        </button>
      </CardHeader>

      {handovers.length === 0 ? (
        <EmptyState icon={History}>No handovers yet.</EmptyState>
      ) : (
        <ul className="recent-handovers">
          {handovers.slice(0, 3).map((h) => {
            const timing = handoverTiming(h);
            return (
              <li key={h._id}>
                <span>
                  <strong>
                    {shortDate(h.createdAt)} · {shiftLabel(h.shift)}
                    {h.author?._id === myId && ' (you)'}
                  </strong>
                  <small>{handoverSummary(h)}</small>
                </span>
                {timing && <span className={`timing ${timing.late ? 'timing--late' : ''}`}>{timing.label}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
