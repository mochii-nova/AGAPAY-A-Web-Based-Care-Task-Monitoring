import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useApiData from '../../hooks/useApiData';
import useMediaQuery from '../../hooks/useMediaQuery';
import { isoDay } from '../../hooks/useShifts';
import { SHIFTS } from '../../constants';
import { parseHandovers, readersOf } from '../../utils/handover';
import { formatTime } from '../../utils/format';
import { addDays, dayLabel } from '../../utils/adminTasks';
import { MONITOR_STATUS, monitorRows, flaggedText, reminderText, sentAt } from '../../utils/handoverMonitor';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import HandoverDetails from '../../components/admin/HandoverDetails';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateMessage';
import '../../styles/schedule.css';
import '../../styles/handover.css';
import '../../styles/admin.css';

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 3, label: 'Last 3 days' },
  { days: 7, label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
];

// Did every shift hand over on time, and did the next shift read it?
export default function HandoverMonitor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const now = new Date();
  const today = isoDay(now);
  const [days, setDays] = useState(3);
  const [shiftFilter, setShiftFilter] = useState('');
  const [who, setWho] = useState('');
  const [pickedKey, setPickedKey] = useState(null);

  const from = addDays(today, -(days - 1));
  const transform = useMemo(() => (list) => parseHandovers(list, user.id), [user.id]);
  const handoversQuery = useApiData('/handovers?limit=500', { transform, refreshEvery: 60 * 1000 });
  const rosterQuery = useApiData(`/shifts?from=${from}&to=${today}`);

  const loading = handoversQuery.status === 'loading' || rosterQuery.status === 'loading';
  const failed = [handoversQuery, rosterQuery].find((q) => q.status === 'error');
  const all = loading || failed ? [] : monitorRows(handoversQuery.data, rosterQuery.data, from, today, now);
  const people = [...new Map(all.map((r) => [r.userId, r.userName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const rows = all.filter((r) => (!shiftFilter || r.shift.id === shiftFilter) && (!who || String(r.userId) === who));

  const count = (s) => rows.filter((r) => r.status === s).length;
  const totals = [
    { label: 'Submitted', value: rows.filter((r) => r.handover).length, tone: '' },
    { label: 'On time', value: count('onTime'), tone: 'completed' },
    { label: 'Late', value: count('late'), tone: 'pending' },
    { label: 'Missing', value: count('missing'), tone: 'overdue' },
  ];

  // Laptops always show one: the one you picked, or the newest submitted handover
  const selected = rows.find((r) => r.key === pickedKey) ?? (isNarrow ? null : rows.find((r) => r.handover) ?? rows[0] ?? null);

  const remind = (row) => navigate(`/messages?with=${row.userId}&text=${encodeURIComponent(reminderText(row))}`);
  const message = (row) => navigate(`/messages?with=${row.userId}`);

  const details = selected && (
    <HandoverDetails row={selected} onRemind={() => remind(selected)} onMessage={() => message(selected)} showTitle={!isNarrow} />
  );

  return (
    <div className="handover-monitor">
      <PageHeader title="Handover" subtitle="Check that every shift handed over on time, and that the next shift read it.">
        <div className="admin-handover__filters">
          <label htmlFor="ho-range" className="sr-only">Dates</label>
          <select id="ho-range" className="field__input select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
          </select>
          <label htmlFor="ho-shift" className="sr-only">Shift</label>
          <select id="ho-shift" className="field__input select" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
            <option value="">All shifts</option>
            {SHIFTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <label htmlFor="ho-who" className="sr-only">Caregiver</label>
          <select id="ho-who" className="field__input select" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">All caregivers</option>
            {people.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </select>
        </div>
      </PageHeader>

      {loading && <div className="card"><LoadingState label="Loading handovers…" /></div>}
      {failed && <div className="card"><ErrorState message={failed.error} onRetry={() => { handoversQuery.reload(); rosterQuery.reload(); }} /></div>}

      {!loading && !failed && (
        <>
          <ul className="stat-row" aria-label="Totals">
            {totals.map((t) => (
              <li key={t.label} className="card stat-card">
                <span className="small-label">{t.label}</span>
                <strong className={`stat-card__value ${t.tone ? `stat-card__value--${t.tone}` : ''}`}>{t.value}</strong>
              </li>
            ))}
          </ul>

          <div className="admin-layout admin-handover__layout">
            <section className="card admin-table-card admin-handover__list" aria-label="Handovers">
              {rows.length === 0 ? (
                <EmptyState icon={FileText}>No shifts on the roster and no handovers for these days.</EmptyState>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Shift</th>
                      <th scope="col">Caregiver</th>
                      <th scope="col" className="data-table__wide-only">Submitted</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="data-table__wide-only">Flagged</th>
                      <th scope="col" className="data-table__wide-only">Read by</th>
                      <th scope="col"><span className="sr-only">Open</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const st = MONITOR_STATUS[r.status];
                      const reader = r.handover && readersOf(r.handover)[0];
                      const flagged = flaggedText(r.handover);
                      return (
                        <tr key={r.key} className={`data-table__row ${selected?.key === r.key ? 'is-selected' : ''}`}>
                          <td>
                            <div className="cell-person">
                              <span>
                                <strong>{r.shift.label}</strong>
                                <small>{dayLabel(r.shiftDate)}</small>
                              </span>
                            </div>
                          </td>
                          <td>{r.userName}</td>
                          <td className="data-table__wide-only data-table__muted data-table__nowrap">
                            {r.handover ? formatTime(sentAt(r.handover)) : r.status === 'notDue' ? `Due ${formatTime(r.end)}` : 'Not submitted'}
                          </td>
                          <td><span className={`status-pill status-pill--${st.tone}`}>{st.label}</span></td>
                          <td className="data-table__wide-only">
                            {!r.handover ? '–' : flagged ? <span className="status-pill status-pill--pending">{flagged}</span> : <span className="data-table__muted">None</span>}
                          </td>
                          <td className="data-table__wide-only data-table__muted">
                            {!r.handover ? '–' : reader ? `${reader.name.split(' ')[0]} · ${formatTime(reader.readAt)}` : <span className="resident-details__gap">Not read yet</span>}
                          </td>
                          <td className="data-table__action">
                            {r.status === 'missing' ? (
                              <button type="button" className="btn btn--sm btn--soft" onClick={() => remind(r)} aria-label={`Remind ${r.userName} about the ${r.shift.label} handover`}>
                                Remind
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn--sm btn--outline"
                                onClick={() => setPickedKey(r.key)}
                                aria-label={`View ${r.userName}'s ${r.shift.label} handover, ${dayLabel(r.shiftDate)}`}
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>

            {!isNarrow && (
              <aside className="card admin-panel handover-print" aria-label="Handover details">
                {details ?? <EmptyState icon={FileText}>Nothing selected.</EmptyState>}
              </aside>
            )}
          </div>
        </>
      )}

      {isNarrow && (
        <Modal open={!!selected} onClose={() => setPickedKey(null)} title={selected ? `${selected.userName} · ${selected.shift.label}` : ''}>
          <div className="handover-print">{details}</div>
        </Modal>
      )}
    </div>
  );
}
