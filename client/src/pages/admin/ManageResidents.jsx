import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Users, UserPlus } from 'lucide-react';
import api from '../../api';
import { useStaff } from '../../context/StaffContext';
import { useHandovers } from '../../context/HandoverContext';
import { useToast } from '../../context/ToastContext';
import useApiData from '../../hooks/useApiData';
import useResidents from '../../hooks/useResidents';
import useMediaQuery from '../../hooks/useMediaQuery';
import { isoDay } from '../../hooks/useShifts';
import { TASK_CATEGORIES } from '../../constants';
import { RESIDENT_STATUS, updateFor } from '../../utils/handover';
import PageHeader from '../../components/PageHeader';
import Avatar from '../../components/Avatar';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import CareNeeds from '../../components/residents/CareNeeds';
import ResidentDetails from '../../components/admin/ResidentDetails';
import ResidentFormModal, { nextResidentCode } from '../../components/admin/ResidentFormModal';
import AssignCaregiversModal from '../../components/admin/AssignCaregiversModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateMessage';
import '../../styles/residents.css';
import '../../styles/admin.css';

const STATUS_FILTERS = [
  { value: '', label: 'All residents' },
  { value: 'flagged', label: 'Watch closely or urgent' },
  { value: 'unassigned', label: 'No caregiver yet' },
];

// The newest handover that has an update about this resident: { handover, update } or null.
// (Handovers come newest first.)
function latestUpdate(handovers, resident) {
  for (const handover of handovers) {
    const update = updateFor(handover, resident);
    if (update && RESIDENT_STATUS[update.status]) return { handover, update };
  }
  return null;
}

// Add residents, keep their details up to date and choose who looks after them
export default function ManageResidents() {
  const { residents, status, error, reload, setData } = useResidents();
  const { staff } = useStaff();
  const { handovers } = useHandovers();
  const showToast = useToast();
  const today = isoDay(new Date());
  const tasksQuery = useApiData(`/tasks?from=${today}&to=${today}`);
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const isPhone = useMediaQuery('(max-width: 600px)');
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [need, setNeed] = useState('');
  const [form, setForm] = useState(null); // { resident } for Edit, {} for Add
  const [assignFor, setAssignFor] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const tasks = tasksQuery.data ?? [];
  const caregivers = staff.filter((u) => u.role === 'caregiver');
  const latestOf = (r) => latestUpdate(handovers, r);
  const isFlagged = (r) => ['watch', 'urgent'].includes(latestOf(r)?.update.status);

  const query = search.trim().toLowerCase();
  const shown = residents
    .filter((r) => statusFilter !== 'flagged' || isFlagged(r))
    .filter((r) => statusFilter !== 'unassigned' || r.caregivers.length === 0)
    .filter((r) => !need || r.careNeeds.includes(need))
    .filter(
      (r) =>
        !query ||
        r.name.toLowerCase().includes(query) ||
        r.room.toLowerCase().includes(query) ||
        r.residentCode.toLowerCase().includes(query)
    );

  // ?open=<Resident ID> picks a resident. Laptops always show one (the first in the list).
  const openCode = searchParams.get('open');
  const selected = residents.find((r) => r.residentCode === openCode) ?? (isNarrow ? null : shown[0] ?? null);
  const select = (r) => setSearchParams({ open: r.residentCode });
  const closePopup = () => setSearchParams({}, { replace: true });

  // Puts a saved resident in the list (or replaces the old copy)
  const put = (saved) =>
    setData((list) => (list.some((r) => r.id === saved.id) ? list.map((r) => (r.id === saved.id ? saved : r)) : [...list, saved]));

  const saveResident = async (fields) => {
    const editing = form?.resident;
    const { data } = editing ? await api.put(`/residents/${editing.id}`, fields) : await api.post('/residents', fields);
    put(data);
    if (editing) {
      showToast(`Saved ${data.name}'s details.`);
      if (editing.residentCode !== data.residentCode && openCode) setSearchParams({ open: data.residentCode }, { replace: true });
    } else {
      showToast(`${data.name} is added. Next, choose their caregivers.`);
      select(data);
    }
  };

  const saveCaregivers = async (ids) => {
    const { data } = await api.put(`/residents/${assignFor.id}/caregivers`, { caregiverIds: ids });
    put(data);
    showToast(`Saved the caregivers for ${data.name}.`);
  };

  const askDelete = (r) => {
    setDeleteError('');
    setDeleteFor(r);
  };

  const doDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/residents/${deleteFor.id}`);
      setData((list) => list.filter((r) => r.id !== deleteFor.id));
      showToast(`${deleteFor.name} was removed.`);
      setDeleteFor(null);
      closePopup();
    } catch (err) {
      setDeleteError(err.response ? err.response.data?.message || "Couldn't delete. Please try again." : "Can't reach the server. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const details = selected && (
    <ResidentDetails
      resident={selected}
      staff={staff}
      tasks={tasks.filter((t) => t.residentId === selected.id).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))}
      tasksLoading={tasksQuery.status === 'loading'}
      latest={latestOf(selected)}
      onEdit={() => setForm({ resident: selected })}
      onAssign={() => setAssignFor(selected)}
      onDelete={() => askDelete(selected)}
      showName={!isNarrow}
    />
  );

  const count = residents.length;

  return (
    <div>
      <PageHeader
        title="Manage Residents"
        subtitle={status === 'ready' ? `${count} ${count === 1 ? 'resident' : 'residents'} · choose one to see and edit their details.` : 'Residents, their care needs and their caregivers.'}
      >
        <button type="button" className="btn btn--primary" onClick={() => setForm({})}>
          <UserPlus size={18} aria-hidden="true" /> Add resident
        </button>
      </PageHeader>

      {status === 'loading' && <div className="card"><LoadingState label="Loading residents…" /></div>}
      {status === 'error' && <div className="card"><ErrorState message={error} onRetry={reload} /></div>}

      {status === 'ready' && (
        <div className="residents-layout">
          <section className="residents-main" aria-label="Residents">
            <div className="residents-toolbar admin-residents__toolbar">
              <div className="search-box">
                <Search size={18} aria-hidden="true" />
                <label htmlFor="resident-search" className="sr-only">Search name, room or resident ID</label>
                <input
                  id="resident-search"
                  type="search"
                  className="field__input"
                  placeholder="Search name, room or ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label htmlFor="resident-status" className="sr-only">Filter by status</label>
              <select id="resident-status" className="field__input select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <label htmlFor="resident-need" className="sr-only">Filter by care need</label>
              <select id="resident-need" className="field__input select" value={need} onChange={(e) => setNeed(e.target.value)}>
                <option value="">All care needs</option>
                {TASK_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            {shown.length === 0 ? (
              <div className="card">
                <EmptyState icon={Users}>
                  {count === 0 ? 'No residents yet. Press "Add resident" to add the first one.' : 'No residents match your search.'}
                </EmptyState>
              </div>
            ) : (
              <ul className="resident-list">
                {shown.map((r) => {
                  const latest = latestOf(r);
                  const flag = latest && RESIDENT_STATUS[latest.update.status];
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="resident-card"
                        aria-pressed={selected?.id === r.id}
                        aria-label={`${r.name}, room ${r.room}. Open details`}
                        onClick={() => select(r)}
                      >
                        <Avatar name={r.name} size={44} />
                        <span className="resident-card__body">
                          <span className="resident-card__line">
                            <strong className="resident-card__name">{r.name}</strong>
                            {flag && <span className={`status-pill status-pill--${flag.tone} resident-card__status`}>{flag.label}</span>}
                          </span>
                          <span className="resident-card__line resident-card__meta">
                            <span className="resident-card__ellipsis">
                              {r.residentCode} · Room {r.room} ·{' '}
                              {r.caregivers.length ? r.caregivers.map((c) => c.name).join(', ') : <span className="resident-details__gap">No caregiver yet</span>}
                            </span>
                          </span>
                          {r.careNeeds.length > 0 && <CareNeeds needs={r.careNeeds} max={isPhone ? 2 : 3} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {!isNarrow && (
            <aside className="card resident-panel" aria-label={selected ? `Details of ${selected.name}` : 'Resident details'}>
              {details ?? <EmptyState icon={Users}>No resident selected.</EmptyState>}
            </aside>
          )}
        </div>
      )}

      {isNarrow && (
        <Modal open={!!selected} onClose={closePopup} title={selected?.name ?? ''} size="lg">
          {details}
        </Modal>
      )}

      <ResidentFormModal
        open={!!form}
        resident={form?.resident}
        suggestedCode={nextResidentCode(residents)}
        onSave={saveResident}
        onClose={() => setForm(null)}
      />
      <AssignCaregiversModal
        resident={assignFor}
        caregivers={caregivers}
        residentCount={(id) => residents.filter((r) => r.caregivers.some((c) => c.id === id)).length}
        onSave={saveCaregivers}
        onClose={() => setAssignFor(null)}
      />
      <ConfirmModal
        open={!!deleteFor}
        title="Delete this resident?"
        confirmLabel="Delete resident"
        danger
        busy={deleting}
        error={deleteError}
        onConfirm={doDelete}
        onClose={() => setDeleteFor(null)}
      >
        {deleteFor && (
          <p>
            {deleteFor.name} ({deleteFor.residentCode}) will be removed, with their caregiver list and their updates in
            handovers. Their tasks are kept but will no longer be linked to them. This can't be undone.
          </p>
        )}
      </ConfirmModal>
    </div>
  );
}
