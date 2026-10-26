import { Link } from 'react-router-dom';
import { PartyPopper } from 'lucide-react';
import CardHeader from '../CardHeader';
import StatusPill from '../StatusPill';
import { EmptyState } from '../StateMessage';
import { formatTime } from '../../utils/format';
import { byUrgency } from '../../utils/tasks';

const SHOW = 3;

// The next few unfinished tasks (overdue first): time, task + resident, status, Open
export default function NextTasksCard({ tasks }) {
  const open = tasks.filter((t) => t.status === 'pending' || t.status === 'overdue').sort(byUrgency);
  const next = open.slice(0, SHOW);

  return (
    <section className="card">
      <CardHeader title="Up next" linkTo="/tasks" linkLabel={`All ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`} />

      {next.length === 0 ? (
        <EmptyState icon={PartyPopper}>
          {tasks.length === 0 ? 'No tasks for today.' : 'All tasks for today are done. Great work!'}
        </EmptyState>
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
