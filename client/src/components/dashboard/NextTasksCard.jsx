import { Link } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import CardHeader from '../CardHeader';
import StatusPill from '../StatusPill';
import { formatTime } from '../../utils/format';
import { byUrgency } from '../../utils/tasks';

const SHOW = 3;

// Today's next few unfinished tasks (overdue first): time, task + resident, status, Open.
// `earlierOverdue`: open tasks from earlier days, linked when today has nothing left.
export default function NextTasksCard({ tasks, earlierOverdue = 0 }) {
  const open = tasks.filter((t) => t.status === 'pending' || t.status === 'overdue').sort(byUrgency);
  const next = open.slice(0, SHOW);

  return (
    <section className="card">
      <CardHeader title="Up next" linkTo="/tasks" linkLabel={tasks.length ? `All ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}` : 'My tasks'} />

      {next.length === 0 ? (
        // One compact line, so the card doesn't leave a big empty area
        <p className="next-empty">
          <CalendarCheck size={18} aria-hidden="true" />
          <span>
            {tasks.length === 0 ? 'No tasks scheduled for today.' : 'All of today’s tasks are done. Great work.'}
            {earlierOverdue > 0 && (
              <>
                {' '}
                <Link to="/tasks?tab=overdue" className="card__link">{earlierOverdue} overdue from earlier days</Link>
              </>
            )}
          </span>
        </p>
      ) : (
        <ul className="task-rows">
          {next.map((t) => {
            const { room } = t;
            return (
              <li key={t._id} className="task-row">
                <span className="task-row__time">{formatTime(t.dueAt)}</span>
                <div className="task-row__main">
                  <strong>{t.task}</strong>
                  <span>{t.resident}{room && ` · Room ${room}`}</span>
                </div>
                <StatusPill status={t.status} />
                <Link to={`/tasks?open=${t._id}`} className="btn btn--outline btn--sm" aria-label={`Open task: ${t.task}`}>
                  Open
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
