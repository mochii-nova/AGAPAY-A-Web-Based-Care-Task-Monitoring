import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ClipboardList, StickyNote } from 'lucide-react';
import useTasks from '../hooks/useTasks';
import { useToast } from '../context/ToastContext';
import { TASK_CATEGORIES } from '../constants';
import { formatTime } from '../utils/format';
import { isToday, savedText } from '../utils/tasks';
import PageHeader from '../components/PageHeader';
import StatusPill from '../components/StatusPill';
import Avatar from '../components/Avatar';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { LoadingState, ErrorState, EmptyState } from '../components/StateMessage';
import '../styles/tasks.css';

const TABS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'upcoming', label: 'Upcoming', match: (t) => t.status === 'pending' },
  { id: 'completed', label: 'Completed', match: (t) => t.status === 'completed' },
  { id: 'skipped', label: 'Skipped', match: (t) => t.status === 'skipped' },
  { id: 'overdue', label: 'Overdue', match: (t) => t.status === 'overdue' },
];

const EMPTY_TEXT = {
  all: 'No tasks match your search.',
  upcoming: 'No upcoming tasks. You’re all caught up!',
  completed: 'No completed tasks yet.',
  skipped: 'No skipped tasks.',
  overdue: 'No overdue tasks. Nice work!',
};

const shortDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function Tasks() {
  const { tasks, status, error, reload, updateTask } = useTasks();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  // ?tab=overdue (the Dashboard's priority alerts) opens that tab over all dates
  const linkedTab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : null;
  const [scope, setScope] = useState(linkedTab ? 'all' : 'today');
  const [tab, setTab] = useState(linkedTab ?? 'all');
  // ?q=<name> fills the search box (used by "View all" on a resident's profile)
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [category, setCategory] = useState('');

  // ?open=<id> in the address opens that task (used by the Dashboard's "View" buttons)
  const openId = searchParams.get('open');
  const openTask = tasks.find((t) => String(t._id) === openId) ?? null;
  const openTaskById = (id) => setSearchParams({ open: id });
  const closeTask = () => setSearchParams({}, { replace: true });

  // Date, search and category filters first; the tabs then split what's left
  const query = search.trim().toLowerCase();
  const filtered = tasks
    .filter((t) => scope === 'all' || isToday(t.dueAt))
    .filter((t) => !category || t.category === category)
    .filter((t) => !query || t.task.toLowerCase().includes(query) || t.resident.toLowerCase().includes(query))
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

  const counts = Object.fromEntries(TABS.map(({ id, match }) => [id, filtered.filter(match).length]));
  const shown = filtered.filter(TABS.find((t) => t.id === tab).match);

  const handleSave = async (task, changes) => {
    await updateTask(task, changes);
    closeTask();
    showToast(savedText(task, changes));
  };

  return (
    <div>
      <PageHeader title="My Tasks" subtitle="Open a task to mark it completed or skipped.">
        <div className="segmented" role="group" aria-label="Which days to show">
          <button type="button" className="segmented__btn" aria-pressed={scope === 'today'} onClick={() => setScope('today')}>Today</button>
          <button type="button" className="segmented__btn" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>All dates</button>
        </div>
      </PageHeader>

      {/* One card: status tabs and filters on top, the table underneath */}
      <div className="card tasks-card">
        <div className="tasks-toolbar">
          <div className="tabs tabs--flat" role="tablist" aria-label="Filter by status">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls="tasks-panel"
                className="tab"
                onClick={() => setTab(id)}
              >
                {label} <span className="tab__count">{counts[id]}</span>
              </button>
            ))}
          </div>

          <div className="tasks-toolbar__filters">
            <div className="search-box">
              <Search size={18} aria-hidden="true" />
              <label htmlFor="task-search" className="sr-only">Search task or resident</label>
              <input
                id="task-search"
                type="search"
                className="field__input"
                placeholder="Search task or resident"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label htmlFor="task-category" className="sr-only">Filter by category</label>
            <select id="task-category" className="field__input select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {TASK_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <section id="tasks-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="tasks-panel">
          {status === 'loading' && <LoadingState label="Loading your tasks…" />}
          {status === 'error' && <ErrorState message={error} onRetry={reload} />}
          {status === 'ready' && shown.length === 0 && (
            <EmptyState icon={ClipboardList}>
              {tasks.length === 0
                ? 'No tasks are assigned to you yet.'
                : scope === 'today' && filtered.length === 0 && !query && !category
                  ? 'No tasks for today. Switch to “All dates” to see other days.'
                  : EMPTY_TEXT[tab]}
            </EmptyState>
          )}

          {status === 'ready' && shown.length > 0 && (
            <table className="task-table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Task</th>
                  <th scope="col">Resident</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t) => {
                  const { room } = t;
                  return (
                    // The whole row opens the task (the View button stays for keyboards and screen readers)
                    <tr key={t._id} className="task-table__row is-clickable" onClick={() => openTaskById(t._id)}>
                      <td className="task-table__time">
                        {scope === 'all' && !isToday(t.dueAt) && <small>{shortDate(t.dueAt)}</small>}
                        {formatTime(t.dueAt)}
                      </td>
                      <td className="task-table__task">
                        <strong>{t.task}</strong>
                        {t.skipReason && <small>Reason: {t.skipReason}</small>}
                        {t.note && (
                          <small className="note-flag" title={t.note}>
                            <StickyNote size={13} aria-hidden="true" /> Has a note
                          </small>
                        )}
                      </td>
                      <td className="task-table__resident">
                        <div className="cell-flex">
                          <Avatar name={t.resident} size={30} />
                          <span>
                            {t.resident}
                            {room && <small> · Rm {room}</small>}
                          </span>
                        </div>
                      </td>
                      <td className="task-table__status"><StatusPill status={t.status} /></td>
                      <td className="task-table__action">
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => openTaskById(t._id)}
                          aria-label={`View task: ${t.task} for ${t.resident}`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <TaskDetailModal task={openTask} onSave={handleSave} onClose={closeTask} />
    </div>
  );
}
