import { ClipboardList } from 'lucide-react';
import CardHeader from '../CardHeader';

const PARTS = [
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'skipped', label: 'Skipped' },
];

// Today's numbers: total tasks, a coloured progress bar, residents and handover status
export default function CareSummaryCard({ tasks, residentCount, handover }) {
  const counts = Object.fromEntries(PARTS.map(({ key }) => [key, tasks.filter((t) => t.status === key).length]));
  const total = tasks.length;

  return (
    <section className="card dash-summary">
      <CardHeader icon={ClipboardList} title="Today's Care Summary" linkTo="/tasks" />

      <div className="dash-summary__progress">
        <p className="dash-summary__total">
          <strong>{total}</strong> {total === 1 ? 'task' : 'tasks'} today
        </p>
        <ul className="legend">
          {PARTS.filter(({ key }) => key !== 'skipped' || counts.skipped > 0).map(({ key, label }) => (
            <li key={key}>
              <span className={`legend__dot legend__dot--${key}`} aria-hidden="true" />
              {label} <strong>{counts[key]}</strong>
            </li>
          ))}
        </ul>
      </div>

      {total > 0 && (
        <div className="progress-bar" aria-hidden="true">
          {PARTS.filter(({ key }) => counts[key] > 0).map(({ key }) => (
            <span key={key} className={`progress-bar__part progress-bar__part--${key}`} style={{ flexGrow: counts[key] }}>
              {counts[key]}
            </span>
          ))}
        </div>
      )}

      <dl className="dash-summary__facts">
        <div>
          <dt>Residents in your care</dt>
          <dd>{residentCount}</dd>
        </div>
        <div>
          <dt>Handover</dt>
          <dd><span className={`status-pill status-pill--${handover.tone}`}>{handover.label}</span></dd>
        </div>
      </dl>
    </section>
  );
}
