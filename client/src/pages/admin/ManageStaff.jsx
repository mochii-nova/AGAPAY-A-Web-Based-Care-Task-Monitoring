import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Search, Users, UserPlus } from 'lucide-react';
import { useStaff } from '../../context/StaffContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useApiData from '../../hooks/useApiData';
import useResidents from '../../hooks/useResidents';
import useMediaQuery from '../../hooks/useMediaQuery';
import useNow from '../../hooks/useNow';
import { isoDay } from '../../hooks/useShifts';
import { SHIFTS } from '../../constants';
import { shiftOnDate } from '../../utils/shift';
import { shortDate, roleLabel, STATUS_LABEL } from '../../utils/staff';
import PageHeader from '../../components/PageHeader';
import Avatar from '../../components/Avatar';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import StaffDetails from '../../components/admin/StaffDetails';
import StaffFormModal from '../../components/admin/StaffFormModal';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateMessage';
import '../../styles/admin.css';

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'inactive', label: 'Deactivated' },
];
const SHIFT_FILTERS = [{ value: '', label: 'All shifts' }, ...SHIFTS.map((s) => ({ value: s.apiValue, label: s.label })), { value: 'none', label: 'Not set' }];

// Waiting for approval first, then active, then deactivated; by name within each
const ORDER = { pending: 0, active: 1, inactive: 2 };
const byStatusThenName = (a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name);

// What each status change is called, for the confirm pop-up and the message after
const STATUS_ACTIONS = {
  approve: { title: 'Approve this account?', button: 'Approve', done: (n) => `${n} is approved and can sign in now.` },
  decline: { title: 'Decline this sign-up?', button: 'Decline', danger: true, done: (n) => `${n}'s sign-up was declined.` },
  deactivate: { title: 'Deactivate this account?', button: 'Deactivate', danger: true, done: (n) => `${n}'s account is deactivated.` },
  reactivate: { title: 'Reactivate this account?', button: 'Reactivate', done: (n) => `${n}'s account is active again.` },
};
const ACTION_TEXT = {
  approve: (n) => `${n} will be able to sign in and will see the tasks and residents assigned to them.`,
  decline: (n) => `${n} won't be able to sign in. You can reactivate the account later if this was a mistake.`,
  deactivate: (n) => `${n} is signed out straight away and can't sign in until you reactivate the account. Their tasks and handovers are kept.`,
  reactivate: (n) => `${n} will be able to sign in again.`,
};

// Add caregivers, approve new sign-ups, set shifts and look after accounts
export default function ManageStaff() {
  const { staff, status, error, reload, pendingCount, setStatus } = useStaff();
  const { user } = useAuth();
  const showToast = useToast();
  const now = useNow();
  const today = isoDay(now);
  const tasksQuery = useApiData(`/tasks?from=${today}&to=${today}`);
  const shiftsQuery = useApiData(`/shifts?from=${today}&to=${today}`);
  const { residents } = useResidents();
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  // { person } for Edit, {} for Add (the Dashboard's "Add staff" opens it straight away)
  const [form, setForm] = useState(() => (location.state?.add ? {} : null));
  const [resetFor, setResetFor] = useState(null);
  const [confirm, setConfirm] = useState(null); // { person, action, status }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const tasks = tasksQuery.data ?? [];
  const todayShifts = shiftsQuery.data ?? [];

  const query = search.trim().toLowerCase();
  const shown = staff
    .filter((u) => !statusFilter || u.status === statusFilter)
    .filter((u) => !shiftFilter || (shiftFilter === 'none' ? !u.assignedShift : u.assignedShift === shiftFilter))
    .filter((u) => !query || u.name.toLowerCase().includes(query) || u.employeeId.toLowerCase().includes(query))
    .sort(byStatusThenName);

  // ?open=<Employee ID> picks a person. Laptops always show someone (the first in the list).
  const openId = searchParams.get('open');
  const selected = staff.find((u) => u.employeeId === openId) ?? (isNarrow ? null : shown[0] ?? null);
  const select = (person) => setSearchParams({ open: person.employeeId });
  const closePopup = () => setSearchParams({}, { replace: true });

  const tasksOf = (person) => tasks.filter((t) => t.assignedTo === person.id);
  const residentsOf = (person) => residents.filter((r) => r.caregivers.some((c) => c.id === person.id));

  // "6 of 9 done", or when today's shift starts, or "–"
  const todayText = (person) => {
    if (person.status !== 'active') return '–';
    const mine = tasksOf(person);
    if (mine.length) return `${mine.filter((t) => t.status === 'completed').length} of ${mine.length} done`;
    const entry = todayShifts.find((s) => s.userId === person.id);
    const shift = SHIFTS.find((s) => s.apiValue === entry?.shift);
    if (!shift) return '–';
    const { start, end } = shiftOnDate(shift, now);
    if (now < start) return `Starts ${shift.start}`;
    return now < end ? 'On shift now' : 'Shift ended';
  };

  const askStatus = (person, newStatus) => {
    const action =
      newStatus === 'active' ? (person.status === 'pending' ? 'approve' : 'reactivate') : person.status === 'pending' ? 'decline' : 'deactivate';
    setConfirmError('');
    setConfirm({ person, action, status: newStatus });
  };

  const doStatus = async () => {
    setConfirmBusy(true);
    setConfirmError('');
    try {
      await setStatus(confirm.person.id, confirm.status);
      showToast(STATUS_ACTIONS[confirm.action].done(confirm.person.name));
      setConfirm(null);
    } catch (err) {
      setConfirmError(err.response ? err.response.data?.message || "Couldn't save. Please try again." : "Can't reach the server. Please try again.");
    } finally {
      setConfirmBusy(false);
    }
  };

  const showPending = () => {
    setStatusFilter('pending');
    const first = staff.filter((u) => u.status === 'pending').sort(byStatusThenName)[0];
    if (first) select(first);
  };

  const details = selected && (
    <StaffDetails
      person={selected}
      isMe={selected.id === user.id}
      todayTasks={tasksOf(selected)}
      residents={residentsOf(selected)}
      onEdit={() => setForm({ person: selected })}
      onReset={() => setResetFor(selected)}
      onStatus={(s) => askStatus(selected, s)}
      showName={!isNarrow}
    />
  );

  return (
    <div>
      <PageHeader title="Manage Staff" subtitle="Add caregivers, approve new sign-ups, and assign shifts.">
        <button type="button" className="btn btn--primary" onClick={() => setForm({})}>
          <UserPlus size={18} aria-hidden="true" /> Add staff
        </button>
      </PageHeader>

      {pendingCount > 0 && (
        <div className="admin-banner" role="status">
          <p>
            <strong>{pendingCount} {pendingCount === 1 ? 'caregiver is' : 'caregivers are'} waiting for approval.</strong>{' '}
            They signed up and can't sign in until you approve them.
          </p>
          <button type="button" className="btn btn--outline" onClick={showPending}>Review sign-ups</button>
        </div>
      )}

      {status === 'loading' && <div className="card"><LoadingState label="Loading staff…" /></div>}
      {status === 'error' && <div className="card"><ErrorState message={error} onRetry={reload} /></div>}

      {status === 'ready' && (
        <div className="admin-layout">
          <section className="card admin-table-card" aria-label="Staff">
            <div className="admin-toolbar">
              <div className="search-box">
                <Search size={18} aria-hidden="true" />
                <label htmlFor="staff-search" className="sr-only">Search name or Employee ID</label>
                <input
                  id="staff-search"
                  type="search"
                  className="field__input"
                  placeholder="Search name or Employee ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label htmlFor="staff-status" className="sr-only">Filter by status</label>
              <select id="staff-status" className="field__input select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <label htmlFor="staff-shift" className="sr-only">Filter by shift</label>
              <select id="staff-shift" className="field__input select" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
                {SHIFT_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {shown.length === 0 ? (
              <EmptyState icon={Users}>No staff match your search.</EmptyState>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Employee ID</th>
                    <th scope="col" className="data-table__wide-only">Shift</th>
                    <th scope="col" className="data-table__wide-only">Today</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((u) => {
                    const st = STATUS_LABEL[u.status];
                    const shift = SHIFTS.find((s) => s.apiValue === u.assignedShift);
                    const isSelected = selected?.id === u.id;
                    return (
                      <tr key={u.id} className={`data-table__row ${isSelected ? 'is-selected' : ''}`}>
                        <td>
                          <div className="cell-person">
                            <Avatar name={u.name} photo={u.photoUrl} size={34} />
                            <span>
                              <strong>{u.name}</strong>
                              <small>{u.status === 'pending' ? `Signed up ${shortDate(u.createdAt)}` : u.title || roleLabel(u)}</small>
                            </span>
                          </div>
                        </td>
                        <td className="data-table__muted data-table__nowrap">{u.employeeId}</td>
                        <td className="data-table__wide-only">{shift ? shift.label : <span className="data-table__muted">Not set</span>}</td>
                        <td className="data-table__wide-only data-table__muted data-table__nowrap">{todayText(u)}</td>
                        <td><span className={`status-pill status-pill--${st.tone}`}>{st.label}</span></td>
                        <td className="data-table__action">
                          <button
                            type="button"
                            className="btn btn--sm btn--outline"
                            onClick={() => select(u)}
                            aria-label={`${u.status === 'pending' ? 'Review' : 'View'} ${u.name}`}
                          >
                            {u.status === 'pending' ? 'Review' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {!isNarrow && (
            <aside className="card admin-panel" aria-label={selected ? `Details of ${selected.name}` : 'Staff details'}>
              {details ?? <EmptyState icon={Users}>No one selected.</EmptyState>}
            </aside>
          )}
        </div>
      )}

      {isNarrow && (
        <Modal open={!!selected} onClose={closePopup} title={selected?.name ?? ''} size="lg">
          {details}
        </Modal>
      )}

      <StaffFormModal
        open={!!form}
        person={form?.person}
        isMe={form?.person?.id === user.id}
        onClose={() => setForm(null)}
      />
      <ResetPasswordModal person={resetFor} onClose={() => setResetFor(null)} />
      <ConfirmModal
        open={!!confirm}
        title={confirm ? STATUS_ACTIONS[confirm.action].title : ''}
        confirmLabel={confirm ? STATUS_ACTIONS[confirm.action].button : ''}
        danger={!!confirm && STATUS_ACTIONS[confirm.action].danger}
        busy={confirmBusy}
        error={confirmError}
        onConfirm={doStatus}
        onClose={() => setConfirm(null)}
      >
        {confirm && <p>{ACTION_TEXT[confirm.action](confirm.person.name)}</p>}
      </ConfirmModal>
    </div>
  );
}
