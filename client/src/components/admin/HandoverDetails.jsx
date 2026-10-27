import { Bell, MessageSquare, Printer, CircleCheck } from 'lucide-react';
import HandoverView from '../handover/HandoverView';
import { shiftTime } from '../../constants';
import { readersOf } from '../../utils/handover';
import { formatTime } from '../../utils/format';
import { dayLabel } from '../../utils/adminTasks';
import { MONITOR_STATUS, sentAt } from '../../utils/handoverMonitor';

const when = (date) => `${formatTime(date)}, ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

// One shift's handover for the admin: when it came in, the content, and who has read it.
// For a missing one: when it was due, and a Remind button.
export default function HandoverDetails({ row, onRemind, onMessage, showTitle = true }) {
  const { handover: h, status } = row;
  const st = MONITOR_STATUS[status];
  const readers = h ? readersOf(h) : [];

  return (
    <div className="handover-details">
      <p className="small-label">{row.shift.label} shift · {dayLabel(row.shiftDate)}</p>
      {showTitle && <h2 className="day-panel__title">{row.userName}</h2>}
      <p className="day-panel__shift-line">
        {h ? `Submitted ${when(sentAt(h))}` : status === 'notDue' ? `Due ${when(row.end)}` : `Was due ${when(row.end)}`}
        {' · '}
        <span className={`status-pill status-pill--${st.tone}`}>{st.label}</span>
      </p>

      {!h && (
        <>
          <p className="handover-details__empty">
            {status === 'missing'
              ? `${row.userName.split(' ')[0]} hasn't submitted the handover for this shift (${shiftTime(row.shift)}).`
              : `The shift ends at ${formatTime(row.end)}. The handover is due then.`}
          </p>
          {status === 'missing' && (
            <div className="handover-details__actions">
              <button type="button" className="btn btn--primary" onClick={onRemind}>
                <Bell size={18} aria-hidden="true" /> Remind {row.userName.split(' ')[0]}
              </button>
            </div>
          )}
        </>
      )}

      {h && (
        <>
          <HandoverView handover={h} />

          <section className="handover-details__reads">
            <h3 className="small-label">Read by</h3>
            {readers.length ? (
              <ul className="handover-details__readers">
                {readers.map((r) => (
                  <li key={r.userId}>
                    <CircleCheck size={16} aria-hidden="true" /> {r.name} at {when(r.readAt)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="handover-details__unread">Nobody has read it yet.</p>
            )}
          </section>

          <div className="handover-details__actions no-print">
            <button type="button" className="btn btn--soft" onClick={onMessage}>
              <MessageSquare size={18} aria-hidden="true" /> Message {row.userName.split(' ')[0]}
            </button>
            <button type="button" className="btn btn--outline" onClick={() => window.print()}>
              <Printer size={18} aria-hidden="true" /> Print
            </button>
          </div>
        </>
      )}
    </div>
  );
}
