import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import useTasks from '../hooks/useTasks';
import useNow from '../hooks/useNow';
import { useToast } from '../context/ToastContext';
import { SHIFTS, TASK_CATEGORIES } from '../constants';
import { sampleShiftOn } from '../data/sample';
import { addDays, addMonths, dayKey, monthTitle, weekTitle, sameDay } from '../utils/calendar';
import { shiftOfTime } from '../utils/shift';
import { savedText } from '../utils/tasks';
import PageHeader from '../components/PageHeader';
import MonthView from '../components/schedule/MonthView';
import WeekView from '../components/schedule/WeekView';
import DayPanel from '../components/schedule/DayPanel';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { LoadingState, ErrorState } from '../components/StateMessage';
import '../styles/schedule.css';

const STATUS_FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'skipped', label: 'Skipped' },
];

// TODO (phase 3): shifts come from sample data until this page uses the real roster
const shiftOn = (date) => SHIFTS.find((s) => s.apiValue === sampleShiftOn(date)) ?? null;

export default function Schedule() {
  const { tasks, status, error, reload, updateTask } = useTasks();
  const showToast = useToast();
  const today = useNow();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState(searchParams.get('view') === 'week' ? 'week' : 'month');
  const [selected, setSelected] = useState(() => new Date());
  const [statuses, setStatuses] = useState(STATUS_FILTERS.map((s) => s.id));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [openTaskId, setOpenTaskId] = useState(null);

  const toggleStatus = (id) =>
    setStatuses((list) => (list.includes(id) ? list.filter((s) => s !== id) : [...list, id]));

  // Filters shared by the calendar and the side panel
  const query = search.trim().toLowerCase();
  const visible = tasks
    .filter((t) => statuses.includes(t.status))
    .filter((t) => !category || t.category === category)
    .filter((t) => !query || t.task.toLowerCase().includes(query) || t.resident.toLowerCase().includes(query))
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

  const tasksByDay = {};
  visible.forEach((t) => {
    (tasksByDay[dayKey(t.dueAt)] ??= []).push(t);
  });

  const dayTasks = (tasksByDay[dayKey(selected)] ?? []).filter(
    (t) => !shiftFilter || shiftOfTime(SHIFTS, t.dueAt)?.id === shiftFilter
  );

  // ‹ › move one month or one week; the selected day moves with it
  const move = (step) => {
    if (view === 'week') return setSelected((d) => addDays(d, 7 * step));
    const target = addMonths(selected, step);
    setSelected(target.getMonth() === today.getMonth() && target.getFullYear() === today.getFullYear() ? today : target);
  };

  const openTask = tasks.find((t) => t._id === openTaskId) ?? null;
  const handleSave = async (task, changes) => {
    await updateTask(task, changes);
    setOpenTaskId(null);
    showToast(savedText(task, changes));
  };

  return (
    <div>
      <PageHeader title={view === 'month' ? monthTitle(selected) : weekTitle(selected)} subtitle="Your shifts and care tasks.">
        <div className="segmented" role="group" aria-label="Calendar view">
          <button type="button" className="segmented__btn" aria-pressed={view === 'month'} onClick={() => setView('month')}>Month</button>
          <button type="button" className="segmented__btn" aria-pressed={view === 'week'} onClick={() => setView('week')}>Week</button>
        </div>
      </PageHeader>

      <div className="card schedule-toolbar">
        <div className="date-nav">
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => move(-1)} aria-label={view === 'month' ? 'Previous month' : 'Previous week'}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setSelected(new Date())} disabled={sameDay(selected, today)}>
            Today
          </button>
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => move(1)} aria-label={view === 'month' ? 'Next month' : 'Next week'}>
            <ChevronRight size={18} />
          </button>
        </div>

        <fieldset className="status-filters">
          <legend className="sr-only">Show tasks that are</legend>
          {STATUS_FILTERS.map(({ id, label }) => (
            <label key={id} className="status-filter">
              <input type="checkbox" checked={statuses.includes(id)} onChange={() => toggleStatus(id)} />
              <span className={`dot dot--${id}`} aria-hidden="true" />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="schedule-toolbar__filters">
          <div className="search-box">
            <Search size={18} aria-hidden="true" />
            <label htmlFor="schedule-search" className="sr-only">Search task or resident</label>
            <input
              id="schedule-search"
              type="search"
              className="field__input"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label htmlFor="schedule-category" className="sr-only">Filter by category</label>
          <select id="schedule-category" className="field__input select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {TASK_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {status === 'loading' && <div className="card"><LoadingState label="Loading your schedule…" /></div>}
      {status === 'error' && <div className="card"><ErrorState message={error} onRetry={reload} /></div>}

      {status === 'ready' && (
        <div className={`schedule-layout schedule-layout--${view}`}>
          <div className="card schedule-calendar">
            {view === 'month' ? (
              <MonthView selected={selected} today={today} tasksByDay={tasksByDay} shiftOn={shiftOn} onSelect={setSelected} />
            ) : (
              <WeekView
                selected={selected}
                today={today}
                tasksByDay={tasksByDay}
                shiftOn={shiftOn}
                onSelect={setSelected}
                onOpenTask={(t) => setOpenTaskId(t._id)}
              />
            )}
            {/* What the coloured bars mean */}
            <ul className="shift-legend" aria-label="Shift colours">
              {SHIFTS.map((s) => (
                <li key={s.id}><span className={`shift-bar shift-bar--${s.id}`} aria-hidden="true" /> {s.label} shift</li>
              ))}
            </ul>
          </div>

          <DayPanel
            date={selected}
            shift={shiftOn(selected)}
            tasks={dayTasks}
            shiftFilter={shiftFilter}
            onShiftFilter={setShiftFilter}
            onOpenTask={(t) => setOpenTaskId(t._id)}
          />
        </div>
      )}

      <TaskDetailModal task={openTask} onSave={handleSave} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}
