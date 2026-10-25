const PARTS = [
  { key: 'completed', label: 'completed' },
  { key: 'pending', label: 'pending' },
  { key: 'overdue', label: 'overdue' },
  { key: 'skipped', label: 'skipped' },
];

const R = 44;
const LENGTH = 2 * Math.PI * R;

// Today's progress: a ring (completed / total) and a short legend
export default function ProgressCard({ tasks }) {
  const counts = Object.fromEntries(PARTS.map(({ key }) => [key, tasks.filter((t) => t.status === key).length]));
  const total = tasks.length;
  const done = counts.completed;
  const offset = LENGTH * (1 - (total ? done / total : 0));

  return (
    <section className="card progress-card" aria-labelledby="progress-title">
      <div className="ring" role="img" aria-label={`${done} of ${total} tasks done`}>
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
          <small>tasks done</small>
        </span>
      </div>

      <div className="progress-card__text">
        <h2 id="progress-title" className="card__title">Today’s progress</h2>
        <ul className="progress-legend">
          {PARTS.filter(({ key }) => key !== 'skipped' || counts.skipped > 0).map(({ key, label }) => (
            <li key={key} className={`status-pill status-pill--${key}`}>{counts[key]} {label}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
