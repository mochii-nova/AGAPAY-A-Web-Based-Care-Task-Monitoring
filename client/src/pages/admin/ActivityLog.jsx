import { useState } from 'react';
import { Search, ScrollText } from 'lucide-react';
import { useStaff } from '../../context/StaffContext';
import useApiData from '../../hooks/useApiData';
import { formatTime } from '../../utils/format';
import { searchTerm, matchesSearch } from '../../utils/search';
import PageHeader from '../../components/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateMessage';
import '../../styles/admin.css';

// What each action is called on screen, and its pill color
const ACTIONS = {
  create: { label: 'Added', tone: 'completed' },
  update: { label: 'Edited', tone: 'new' },
  delete: { label: 'Deleted', tone: 'overdue' },
  approve: { label: 'Approved', tone: 'completed' },
  reject: { label: 'Rejected', tone: 'overdue' },
  deactivate: { label: 'Deactivated', tone: 'pending' },
  reactivate: { label: 'Reactivated', tone: 'completed' },
  reset_password: { label: 'Reset password', tone: 'pending' },
  assign: { label: 'Assigned', tone: 'new' },
  schedule: { label: 'Scheduled', tone: 'new' },
  bulk_schedule: { label: 'Filled schedule', tone: 'new' },
  day_off: { label: 'Day off', tone: 'skipped' },
  handled: { label: 'Handled', tone: 'completed' },
};

const TYPE_OPTIONS = [
  { value: '', label: 'Everything' },
  { value: 'staff', label: 'Staff' },
  { value: 'resident', label: 'Residents' },
  { value: 'room', label: 'Rooms' },
  { value: 'bed', label: 'Beds' },
  { value: 'shift', label: 'Schedule' },
  { value: 'task', label: 'Tasks' },
  { value: 'contact', label: 'Contact messages' },
];
const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]));

const when = (date) =>
  `${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}, ${formatTime(date)}`;

// Admin activity log: which administrator changed what, and when (newest first, last 300)
export default function ActivityLog() {
  const { staff } = useStaff();
  const [adminId, setAdminId] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const params = new URLSearchParams();
  if (adminId) params.set('adminId', adminId);
  if (type) params.set('targetType', type);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = useApiData(`/admin-logs${params.size ? `?${params}` : ''}`, { live: true });
  const logs = query.data ?? [];

  const admins = staff.filter((u) => u.role === 'admin').sort((a, b) => a.name.localeCompare(b.name));
  const term = searchTerm(search);
  const shown = logs.filter((l) => matchesSearch(term, l.adminName, l.details ?? ''));

  return (
    <div>
      <PageHeader title="Activity log" subtitle="Every change an administrator made, so it's clear who did what and when." />

      <section className="card admin-table-card" aria-label="Activity log">
        <div className="admin-toolbar">
          <div className="search-box">
            <Search size={18} aria-hidden="true" />
            <label htmlFor="log-search" className="sr-only">Search the log</label>
            <input
              id="log-search"
              type="search"
              className="field__input"
              placeholder="Search names or details"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label htmlFor="log-admin" className="sr-only">Administrator</label>
          <select id="log-admin" className="field__input select log-admin" value={adminId} onChange={(e) => setAdminId(e.target.value)}>
            <option value="">All administrators</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <label htmlFor="log-type" className="sr-only">What was changed</label>
          <select id="log-type" className="field__input select" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <div className="log-dates">
            <label htmlFor="log-from" className="sr-only">From</label>
            <input id="log-from" type="date" className="field__input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            <span aria-hidden="true">to</span>
            <label htmlFor="log-to" className="sr-only">To</label>
            <input id="log-to" type="date" className="field__input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {query.status === 'loading' && <LoadingState label="Loading the activity log…" />}
        {query.status === 'error' && <ErrorState message={query.error} onRetry={query.reload} />}
        {query.status === 'ready' && shown.length === 0 && (
          <EmptyState icon={ScrollText}>{logs.length ? 'Nothing matches your search.' : 'No admin activity yet.'}</EmptyState>
        )}
        {query.status === 'ready' && shown.length > 0 && (
          <ul className="log-list">
            {shown.map((l) => {
              const action = ACTIONS[l.action] ?? { label: l.action, tone: 'new' };
              return (
                <li key={l.id} className="log-item">
                  <div className="log-item__head">
                    <strong>{l.adminName}</strong>
                    <span className={`status-pill status-pill--${action.tone}`}>{action.label}</span>
                    <span className="log-item__type">{TYPE_LABEL[l.targetType] ?? l.targetType}</span>
                    <time className="log-item__time" dateTime={l.createdAt}>{when(l.createdAt)}</time>
                  </div>
                  {l.details && <p className="log-item__details">{l.details}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}