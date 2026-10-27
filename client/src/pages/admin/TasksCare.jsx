import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ClipboardList, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api';
import { useStaff } from '../../context/StaffContext';
import { useToast } from '../../context/ToastContext';
import useApiData from '../../hooks/useApiData';
import useResidents from '../../hooks/useResidents';
import { isoDay } from '../../hooks/useShifts';
import { SHIFTS, TASK_CATEGORIES, getCategory } from '../../constants';
import { formatTime } from '../../utils/format';
import { normalizeTasks } from '../../utils/tasks';
import { addDays, dayLabel, shiftOfDue } from '../../utils/adminTasks';
import PageHeader from '../../components/PageHeader';
import StatusPill from '../../components/StatusPill';
import ConfirmModal from '../../components/ConfirmModal';
import TaskFormModal from '../../components/admin/TaskFormModal';
import TaskViewModal from '../../components/admin/TaskViewModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateMessage';
import '../../styles/tasks.css';
import '../../styles/residents.css';
import '../../styles/admin.css';

const TABS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'pending', label: 'Pending', match: (t) => t.status === 'pending' },
  { id: 'completed', label: 'Completed', match: (t) => t.status === 'completed' },
  { id: 'skipped', label: 'Skipped', match: (t) => t.status === 'skipped' },
  { id: 'overdue', label: 'Overdue', match: (t) => t.status === 'overdue' },
];

const EMPTY_TEXT = {
  all: 'No tasks match your filters.',
  pending: 'No pending tasks.',
  completed: 'No completed tasks yet.',
  skipped: 'No skipped tasks.',
  overdue: 'Nothing is overdue.',
};

// Create tasks, give them to the caregivers on shift, and follow up on anything late. One day at a time.
export default function TasksCare() {
  const { staff } = useStaff();
  const { residents } = useResidents();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = isoDay(new Date());
  // ?date=2026-10-27 (default today), ?q= fills the search (Manage Residents links here like that)
  const day = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('date') ?? '') ? searchParams.get('date') : today;
  const query = useApiData(`/tasks?from=${day}&to=${day}`, { transform: normalizeTasks });
  const tasks = query.data ?? [];
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [shiftFilter, setShiftFilter] = useState('');
  const [caregiverFilter, setCaregiverFilter] = useState('');
  const [category, setCategory] = useState('');
  // ?open=<task id> opens that task (the Dashboard and task notifications link here like that)
  const [viewId, setViewId] = useState(() => Number(searchParams.get('open')) || null);
  const [form, setForm] = useState(null); // { task } for Edit, {} for Create
  const [deleteFor, setDeleteFor] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const caregivers = staff.filter((u) => u.role === 'caregiver');
  const goTo = (ymd) => {
    const next = new URLSearchParams(searchParams);
    if (ymd === today) next.delete('date');
    else next.set('date', ymd);
    setSearchParams(next, { replace: true });
  };

  // Filters first; the tabs then split what's left
  const q = search.trim().toLowerCase();
  const filtered = tasks
    .filter((t) => !shiftFilter || shiftOfDue(t.dueAt).shift.id === shiftFilter)
    .filter((t) => !caregiverFilter || (caregiverFilter === 'none' ? !t.assignedTo : String(t.assignedTo) === caregiverFilter))
    .filter((t) => !category || t.category === category)
    .filter((t) => !q || t.task.toLowerCase().includes(q) || (t.resident ?? '').toLowerCase().includes(q))
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const counts = Object.fromEntries(TABS.map(({ id, match }) => [id, filtered.filter(match).length]));
  const shown = filtered.filter(TABS.find((t) => t.id === tab).match);
  const filtering = q || shiftFilter || caregiverFilter || category;

  const viewTask = tasks.find((t) => t.id === viewId) ?? null;

  const handleSaved = (saved, { editing, offDays, partial }) => {
    query.reload({ silent: true });
    if (partial) return;
    const first = saved[0];
    if (editing) showToast(`Saved ${first.task}.`);
    else if (saved.length === 1) showToast(`Created ${first.task} for ${dayLabel(isoDay(first.dueAt))}.`);
    else {
      const last = saved[saved.length - 1];
      showToast(
        `Created ${saved.length} tasks: ${first.task}, ${dayLabel(isoDay(first.dueAt))} to ${dayLabel(isoDay(last.dueAt))}.` +
          (offDays ? ` ${offDays} without a caregiver.` : '')
      );
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/tasks/${deleteFor.id}`);
      query.setData((list) => list.filter((t) => t.id !== deleteFor.id));
      showToast(`${deleteFor.task} was deleted.`);
      setDeleteFor(null);
      setViewId(null);
    } catch (err) {
      setDeleteError(err.response ? err.response.data?.message || "Couldn't delete. Please try again." : "Can't reach the server. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Tasks & Care" subtitle="Create tasks, assign them, and follow up on anything late.">
        <button type="button" className="btn btn--primary" onClick={() => setForm({})}>
          <Plus size={18} aria-hidden="true" /> Create task
        </button>
      </PageHeader>

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

          <div className="day-picker" role="group" aria-label="Day">
            <button type="button" className="icon-btn icon-btn--sm" onClick={() => goTo(addDays(day, -1))} aria-label="Previous day">
              <ChevronLeft size={18} />
            </button>
            <label htmlFor="tasks-day" className="sr-only">Day</label>
            <input id="tasks-day" type="date" className="field__input day-picker__input" value={day} onChange={(e) => e.target.value && goTo(e.target.value)} />
            <button type="button" className="icon-btn icon-btn--sm" onClick={() => goTo(addDays(day, 1))} aria-label="Next day">
              <ChevronRight size={18} />
            </button>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => goTo(today)} disabled={day === today}>Today</button>
          </div>
        </div>

        <div className="admin-toolbar admin-tasks__filters">
          <div className="search-box">
            <Search size={18} aria-hidden="true" />
            <label htmlFor="tasks-search" className="sr-only">Search task or resident</label>
            <input
              id="tasks-search"
              type="search"
              className="field__input"
              placeholder="Search task or resident"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label htmlFor="tasks-shift" className="sr-only">Filter by shift</label>
          <select id="tasks-shift" className="field__input select" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
            <option value="">All shifts</option>
            {SHIFTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <label htmlFor="tasks-caregiver" className="sr-only">Filter by caregiver</label>
          <select id="tasks-caregiver" className="field__input select" value={caregiverFilter} onChange={(e) => setCaregiverFilter(e.target.value)}>
            <option value="">All caregivers</option>
            {caregivers.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            <option value="none">Not assigned yet</option>
          </select>
          <label htmlFor="tasks-category" className="sr-only">Filter by category</label>
          <select id="tasks-category" className="field__input select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {TASK_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <section id="tasks-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="tasks-panel">
          {query.status === 'loading' && <LoadingState label="Loading tasks…" />}
          {query.status === 'error' && <ErrorState message={query.error} onRetry={query.reload} />}
          {query.status === 'ready' && shown.length === 0 && (
            <EmptyState icon={ClipboardList}>
              {tasks.length === 0 ? `No tasks on ${dayLabel(day)} yet. Press "Create task" to add one.` : EMPTY_TEXT[filtering && tab === 'all' ? 'all' : tab]}
            </EmptyState>
          )}

          {query.status === 'ready' && shown.length > 0 && (
            <table className="task-table admin-task-table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Task</th>
                  <th scope="col">Resident</th>
                  <th scope="col">Caregiver</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t) => (
                  <tr key={t.id} className="task-table__row">
                    <td className="task-table__time">
                      {formatTime(t.dueAt)}
                      <small>{shiftOfDue(t.dueAt).shift.label}</small>
                    </td>
                    <td className="task-table__task">
                      <strong>{t.task}</strong>
                      <small>{t.skipReason ? `Reason: ${t.skipReason}` : getCategory(t.category)?.label}</small>
                    </td>
                    <td className="task-table__resident">
                      {t.resident ?? <span className="data-table__muted">No resident</span>}
                      {t.room && <small>Room {t.room}</small>}
                    </td>
                    <td className="task-table__caregiver">
                      {t.assignedToName ?? <span className="resident-details__gap">Not assigned</span>}
                    </td>
                    <td className="task-table__status"><StatusPill status={t.status} /></td>
                    <td className="task-table__action">
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => setViewId(t.id)}
                        aria-label={`View task: ${t.task}${t.resident ? ` for ${t.resident}` : ''}`}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {query.status === 'ready' && tasks.length > 0 && (
          <p className="admin-tasks__footer">
            Showing {shown.length} of {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} on {day === today ? 'today' : dayLabel(day)}
          </p>
        )}
      </div>

      <TaskViewModal
        task={form || deleteFor ? null : viewTask}
        onEdit={() => setForm({ task: viewTask })}
        onDelete={() => { setDeleteError(''); setDeleteFor(viewTask); }}
        onClose={() => setViewId(null)}
      />
      <TaskFormModal
        open={!!form}
        task={form?.task}
        preset={{ date: day }}
        residents={residents}
        caregivers={caregivers}
        onSaved={handleSaved}
        onClose={() => setForm(null)}
      />
      <ConfirmModal
        open={!!deleteFor}
        title="Delete this task?"
        confirmLabel="Delete task"
        danger
        busy={deleting}
        error={deleteError}
        onConfirm={doDelete}
        onClose={() => setDeleteFor(null)}
      >
        {deleteFor && (
          <p>
            {deleteFor.task}
            {deleteFor.resident && ` for ${deleteFor.resident}`} at {formatTime(deleteFor.dueAt)} on {dayLabel(isoDay(deleteFor.dueAt))} will be
            removed from {deleteFor.assignedToName ? `${deleteFor.assignedToName}'s` : 'the'} task list. This can't be undone.
          </p>
        )}
      </ConfirmModal>
    </div>
  );
}
