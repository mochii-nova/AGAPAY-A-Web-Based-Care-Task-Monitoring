import { Link } from 'react-router-dom';
import { ListChecks, PartyPopper } from 'lucide-react';
import CardHeader from '../CardHeader';
import StatusPill from '../StatusPill';
import TaskCategoryIcon from '../TaskCategoryIcon';
import { EmptyState } from '../StateMessage';
import { formatTime } from '../../utils/format';
import { byUrgency } from '../../utils/tasks';

const SHOW = 3;

// The next few unfinished tasks (overdue first). Titled "Next tasks" so it never
// looks like it disagrees with the total in the summary card.
export default function NextTasksCard({ tasks }) {
  const open = tasks.filter((t) => t.status !== 'completed').sort(byUrgency);
  const next = open.slice(0, SHOW);

  return (
    <section className="card">
      <CardHeader icon={ListChecks} title="Next tasks" linkTo="/tasks" linkLabel={`View all ${tasks.length}`}>
        {open.length > 0 && <span className="card__meta">{open.length} left today</span>}
      </CardHeader>

      {next.length === 0 ? (
        <EmptyState icon={PartyPopper}>
          {tasks.length === 0 ? 'No tasks for today.' : 'All tasks for today are done. Great work!'}
        </EmptyState>
      ) : (
        <ul className="task-rows">
          {next.map((t) => (
            <li key={t._id} className={`task-row ${t.status === 'overdue' ? 'task-row--overdue' : ''}`}>
              <TaskCategoryIcon category={t.category} />
              <div className="task-row__main">
                <strong>{t.task}</strong>
                <span>Resident: {t.resident}</span>
              </div>
              <span className="task-row__time">Due {formatTime(t.dueAt)}</span>
              <StatusPill status={t.status} />
              <Link to={`/tasks?open=${t._id}`} className="btn btn--outline btn--sm" aria-label={`View task: ${t.task}`}>
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
