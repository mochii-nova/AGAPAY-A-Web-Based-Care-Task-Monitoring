import { Link } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import CardHeader from '../CardHeader';
import { RESIDENT_STATUS } from '../../utils/handover';
import { formatTime } from '../../utils/format';

const MAX = 4;

// What needs attention first: residents marked Urgent / Watch closely in the latest handovers,
// today's overdue tasks, then one line for tasks still open from earlier days.
// `flagged`: [{ resident, status, note }] (urgent first); `overdueToday`: earliest first;
// `earlierOverdue`: how many (the same number Today's progress shows)
export default function PriorityAlertsCard({ flagged, overdueToday, earlierOverdue }) {
  const alerts = [
    ...flagged.map(({ resident, status, note }) => ({
      key: `r${resident.id}`,
      tone: RESIDENT_STATUS[status].tone,
      tag: status === 'urgent' ? 'Urgent' : 'Watch',
      title: resident.name,
      sub: note || RESIDENT_STATUS[status].label,
      to: `/residents?open=${resident.residentCode}`,
    })),
    ...overdueToday.map((t) => ({
      key: `t${t._id}`,
      tone: 'overdue',
      tag: 'Overdue',
      title: t.task,
      sub: `${t.resident} · due ${formatTime(t.dueAt)}`,
      to: `/tasks?open=${t._id}`,
    })),
    ...(earlierOverdue > 0
      ? [{
          key: 'earlier',
          tone: 'overdue',
          tag: 'Overdue',
          title: `${earlierOverdue} overdue from earlier days`,
          sub: 'Still open from before today',
          to: '/tasks?tab=overdue',
        }]
      : []),
  ];

  return (
    <section className="card alerts-card">
      <CardHeader title="Priority alerts" linkTo={alerts.length ? '/tasks?tab=overdue' : undefined} />
      {alerts.length === 0 ? (
        <p className="alerts-card__clear">
          <CircleCheck size={18} aria-hidden="true" /> Nothing urgent. No residents to watch and no overdue tasks.
        </p>
      ) : (
        <ul className="alerts-card__list">
          {alerts.slice(0, MAX).map((a) => (
            <li key={a.key}>
              <Link to={a.to} className="alerts-card__item">
                <span className={`status-pill status-pill--${a.tone}`}>{a.tag}</span>
                <span className="alerts-card__text">
                  <strong>{a.title}</strong>
                  <small>{a.sub}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
