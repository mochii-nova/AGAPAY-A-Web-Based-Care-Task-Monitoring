import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import useTasks from '../hooks/useTasks';
import useResidents from '../hooks/useResidents';
import useMediaQuery from '../hooks/useMediaQuery';
import { useToast } from '../context/ToastContext';
import { TASK_CATEGORIES, shiftLabel } from '../constants';
import { useHandovers } from '../context/HandoverContext';
import { useProfile } from '../context/ProfileContext';
import { RESIDENT_STATUS } from '../utils/handover';
import { isToday, savedText } from '../utils/tasks';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ResidentCard from '../components/residents/ResidentCard';
import ResidentProfile from '../components/residents/ResidentProfile';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { EmptyState, LoadingState, ErrorState } from '../components/StateMessage';
import '../styles/residents.css';

// Notes about this resident: their update in each handover (or, for older plain-text handovers,
// any handover that mentions their first name), plus task notes and skip reasons.
// TODO (phase 4): match handover updates by resident ID once handovers come from the new routes.
function notesFor(resident, handovers, tasks) {
  const firstName = resident.name.split(' ')[0].toLowerCase();
  const fromHandovers = handovers.flatMap((h) => {
    const base = { id: `h${h._id}`, source: `${shiftLabel(h.shift)} shift handover`, author: h.author?.name, time: h.createdAt };
    if (h.data) {
      const update = h.data.residents.find((r) => r.name === resident.name);
      if (!update || update.status === 'normal') return [];
      return [{ ...base, text: `${RESIDENT_STATUS[update.status].label}. ${update.note}` }];
    }
    return h.text.toLowerCase().includes(firstName) ? [{ ...base, text: h.text }] : [];
  });
  const fromTasks = tasks
    .filter((t) => t.residentId === resident.id && (t.note || t.skipReason))
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
  const { residents, status, error, reload } = useResidents();
  const { handovers } = useHandovers();
  const { profile: { id: profileId } } = useProfile();
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
    .filter((r) => !query || r.name.toLowerCase().includes(query) || r.residentCode.toLowerCase().includes(query));

  // ?open=<resident code, e.g. RP-2020-001> picks a resident (the Dashboard links here like that).
  // Laptops always show a profile (the first resident until you pick one);
  // tablets and phones only open the pop-up when you tap a card.
  const openCode = searchParams.get('open');
  const selected = residents.find((r) => r.residentCode === openCode) ?? (isNarrow ? null : shown[0] ?? null);

  const selectResident = (code) => setSearchParams({ open: code });
  const closePopup = () => setSearchParams({}, { replace: true });

  const tasksOf = (r) => tasks.filter((t) => t.residentId === r.id && isToday(t.dueAt));
  // "Watch closely" / "Urgent" from the latest handover another caregiver wrote
  const latestReceived = handovers.find((h) => h.author?._id !== profileId);
  const statusOf = (r) => latestReceived?.data?.residents.find((u) => u.name === r.name)?.status;
  const profile = selected && (
    <ResidentProfile
      resident={selected}
      status={statusOf(selected)}
      tasks={tasksOf(selected)}
      tasksLoading={tasksStatus === 'loading'}
      notes={notesFor(selected, handovers, tasks)}
      onOpenTask={(t) => setOpenTaskId(t._id)}
      showName={!isNarrow}
    />
  );

  const openTask = tasks.find((t) => t._id === openTaskId) ?? null;
  const handleSave = async (task, changes) => {
    await updateTask(task, changes);
    setOpenTaskId(null);
    showToast(savedText(task, changes));
  };

  return (
    <div>
      <PageHeader title="My residents" subtitle="Choose a resident to see their care needs, tasks and notes." />

      {status === 'loading' && <div className="card"><LoadingState label="Loading your residents…" /></div>}
      {status === 'error' && <div className="card"><ErrorState message={error} onRetry={reload} /></div>}

      {status === 'ready' && (
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
              <div className="card">
                <EmptyState icon={Users}>
                  {residents.length === 0 ? 'No residents are assigned to you yet.' : 'No residents match your search.'}
                </EmptyState>
              </div>
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
              {profile ?? <EmptyState icon={Users}>No resident selected.</EmptyState>}
            </aside>
          )}
        </div>
      )}

      {isNarrow && (
        <Modal open={!!selected} onClose={closePopup} title={selected?.name ?? ''} size="lg">
          {profile}
        </Modal>
      )}

      <TaskDetailModal task={openTask} onSave={handleSave} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}
