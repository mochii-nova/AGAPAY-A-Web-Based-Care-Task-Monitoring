import { Link } from 'react-router-dom';

const PARTS = [
  { key: 'completed', label: 'completed' },
  { key: 'pending', label: 'pending' },
  { key: 'overdue', label: 'overdue' },
  { key: 'skipped', label: 'skipped' },
];

const R = 44;
const LENGTH = 2 * Math.PI * R;

// Today's progress: a ring (completed / total) and a short legend.
// `earlierOverdue`: my tasks from earlier days that are still open (the same number Priority alerts shows)
export default function ProgressCard({ tasks, earlierOverdue = 0 }) {
  const counts = Object.fromEntries(PARTS.map(({ key }) => [key, tasks.filter((t) => t.status === key).length]));
  const total = tasks.length;
  const done = counts.completed;
  const offset = LENGTH * (1 - (total ? done / total : 0));

  return (
    <section className="card dash-card progress-card" aria-labelledby="progress-title">
      <div className="progress-card__body">
        <div className="ring" role="img" aria-label={`${done} of ${total} tasks done today`}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="ring__track" cx="50" cy="50" r={R} />
            <circle
              className="ring__fill"
              cx="50"
              cy="50"
              r={R}
              transform="rotate(-90 50 50)"
              strokeDasharray={LENGTH}
              strokeDashoffset={offset}
              style={{ '--ring-length': LENGTH }}
            />
          </svg>
          <span className="ring__label" aria-hidden="true">
            <strong>{done}/{total}</strong>
            <small>done</small>
          </span>
        </div>

        <div className="progress-card__text">
          <h2 id="progress-title" className="small-label">Today’s progress</h2>
          {total === 0 ? (
            <p className="dash-card__sub">No tasks scheduled for today.</p>
          ) : (
            <ul className="progress-legend">
              {PARTS.filter(({ key }) => key !== 'skipped' || counts.skipped > 0).map(({ key, label }) => (
                <li key={key} className={`status-pill status-pill--${key}`}>{counts[key]} {label}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {earlierOverdue > 0 ? (
        <Link to="/tasks?tab=overdue" className="dash-card__foot progress-card__earlier">
          <span className="status-pill status-pill--overdue">{earlierOverdue} overdue from earlier days</span>
          <span className="card__link">View</span>
        </Link>
      ) : (
        <div className="dash-card__foot">
          <span className="dash-card__sub">Nothing left over from earlier days</span>
          <Link to="/tasks" className="card__link">My tasks</Link>
        </div>
      )}
    </section>
  );
}
