import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import useTasks from '../hooks/useTasks';
import useApiData from '../hooks/useApiData';
import useMediaQuery from '../hooks/useMediaQuery';
import { useToast } from '../context/ToastContext';
import { TASK_CATEGORIES, shiftLabel } from '../constants';
import { sampleResidents, sampleHandovers } from '../data/sample';
import { isToday, SAVED_TEXT } from '../utils/tasks';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ResidentCard from '../components/residents/ResidentCard';
import ResidentProfile from '../components/residents/ResidentProfile';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { EmptyState } from '../components/StateMessage';
import '../styles/residents.css';

// TODO: residents come from sample data until the backend has a residents table
const residents = sampleResidents;

// Notes that mention this resident: from handovers (by first name) and from task notes / skip reasons.
// TODO: Phase 7 handovers will link resident updates by ID instead of searching the text.
function notesFor(resident, handovers, tasks) {
  const firstName = resident.name.split(' ')[0].toLowerCase();
  const fromHandovers = handovers
    .filter((h) => h.notes.toLowerCase().includes(firstName))
    .map((h) => ({ id: `h${h._id}`, source: `${shiftLabel(h.shift)} shift handover`, author: h.author?.name, time: h.createdAt, text: h.notes }));
  const fromTasks = tasks
    .filter((t) => t.resident === resident.name && (t.note || t.skipReason))
    .map((t) => ({
      id: `t${t._id}`,
      source: t.task,
      time: t.dueAt,
      text: t.skipReason ? `Skipped: ${t.skipReason}${t.note ? `. ${t.note}` : ''}` : t.note,
    }));
  return [...fromHandovers, ...fromTasks].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 3);
}

export default function Residents() {
  const { tasks, status: tasksStatus, updateTask } = useTasks();
  const handoversQuery = useApiData('/handovers', { sample: sampleHandovers });
  const showToast = useToast();
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const isPhone = useMediaQuery('(max-width: 600px)');
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [need, setNeed] = useState('');
  const [openTaskId, setOpenTaskId] = useState(null);

  const query = search.trim().toLowerCase();
  const shown = residents
    .filter((r) => !need || r.careNeeds.includes(need))
    .filter((r) => !query || r.name.toLowerCase().includes(query) || r.id.toLowerCase().includes(query));

  // ?open=<resident ID> picks a resident (the Dashboard links here like that).
  // Laptops always show a profile (the first resident until you pick one);
  // tablets and phones only open the pop-up when you tap a card.
  const openId = searchParams.get('open');
  const selected = residents.find((r) => r.id === openId) ?? (isNarrow ? null : shown[0] ?? null);

  const selectResident = (id) => setSearchParams({ open: id });
  const closePopup = () => setSearchParams({}, { replace: true });

  const tasksOf = (r) => tasks.filter((t) => t.resident === r.name && isToday(t.dueAt));
  const profile = selected && (
    <ResidentProfile
      resident={selected}
      tasks={tasksOf(selected)}
      tasksLoading={tasksStatus === 'loading'}
      notes={notesFor(selected, handoversQuery.data ?? [], tasks)}
      onOpenTask={(t) => setOpenTaskId(t._id)}
      showName={!isNarrow}
    />
  );

  const openTask = tasks.find((t) => t._id === openTaskId) ?? null;
  const handleSave = async (task, changes) => {
    await updateTask(task, changes);
    setOpenTaskId(null);
    showToast(`${task.task} ${SAVED_TEXT[changes.status]}.`);
  };

  return (
    <div>
      <PageHeader
        title="My Residents"
        titleExtra={<span className="sample-tag" title="Residents aren't in the database yet">Sample residents</span>}
        subtitle="Click a resident to see their profile, tasks and notes."
      />

      <div className="residents-layout">
        <section className="residents-main" aria-label="Residents">
          <div className="residents-toolbar">
            <div className="search-box">
              <Search size={18} aria-hidden="true" />
              <label htmlFor="resident-search" className="sr-only">Search by name or resident ID</label>
              <input
                id="resident-search"
                type="search"
                className="field__input"
                placeholder="Search name or resident ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label htmlFor="resident-need" className="sr-only">Filter by care need</label>
            <select id="resident-need" className="field__input select" value={need} onChange={(e) => setNeed(e.target.value)}>
              <option value="">All care needs</option>
              {TASK_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {shown.length === 0 ? (
            <div className="card"><EmptyState icon={Users}>No residents match your search.</EmptyState></div>
          ) : (
            <ul className="resident-list">
              {shown.map((r) => (
                <li key={r.id}>
                  <ResidentCard
                    resident={r}
                    todayTasks={tasksOf(r)}
                    selected={selected?.id === r.id}
                    maxNeeds={isPhone ? 2 : 3}
                    onSelect={selectResident}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {!isNarrow && (
          <aside className="card resident-panel" aria-label={selected ? `Profile of ${selected.name}` : 'Resident profile'}>
            <p className="small-label resident-panel__label">Resident profile</p>
            {profile ?? <EmptyState icon={Users}>No resident selected.</EmptyState>}
          </aside>
        )}
      </div>

      {isNarrow && (
        <Modal open={!!selected} onClose={closePopup} title={selected?.name ?? ''} size="lg">
          {profile}
        </Modal>
      )}

      <TaskDetailModal
        task={openTask}
        residentRoom={openTask && residents.find((r) => r.name === openTask.resident)?.room}
        onSave={handleSave}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  );
}
