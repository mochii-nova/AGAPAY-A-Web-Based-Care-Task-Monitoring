import { Link } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import CardHeader from '../CardHeader';
import { RESIDENT_STATUS } from '../../utils/handover';
import { formatTime } from '../../utils/format';
import { isToday } from '../../utils/tasks';

const MAX = 4;

// What needs attention first: residents marked Urgent / Watch closely in the latest handovers,
// then my overdue tasks. Each line opens the resident or the task.
// `flagged`: [{ resident, status, note }] (urgent first); `overdue`: my overdue tasks (earliest first)
export default function PriorityAlertsCard({ flagged, overdue }) {
  const alerts = [
    ...flagged.map(({ resident, status, note }) => ({
      key: `r${resident.id}`,
      tone: RESIDENT_STATUS[status].tone,
      tag: status === 'urgent' ? 'Urgent' : 'Watch',
      title: resident.name,
      sub: note || RESIDENT_STATUS[status].label,
      to: `/residents?open=${resident.residentCode}`,
    })),
    ...overdue.map((t) => ({
      key: `t${t._id}`,
      tone: 'overdue',
      tag: 'Overdue',
      title: t.task,
      sub: `${t.resident} · due ${isToday(t.dueAt) ? '' : `${new Date(t.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, `}${formatTime(t.dueAt)}`,
      to: `/tasks?open=${t._id}`,
    })),
  ];
  const more = alerts.length - MAX;

  return (
    <section className="card alerts-card">
      <CardHeader title="Priority alerts" />
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
      {more > 0 && (
        <Link to="/tasks?tab=overdue" className="card__link alerts-card__more">
          {more} more {more === 1 ? 'alert' : 'alerts'}
        </Link>
      )}
    </section>
  );
}
