import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStaff } from '../../context/StaffContext';
import useApiData from '../../hooks/useApiData';
import useResidents from '../../hooks/useResidents';
import { isoDay } from '../../hooks/useShifts';
import { parseHandovers } from '../../utils/handover';
import { normalizeTasks } from '../../utils/tasks';
import { addDays, dayLabel, dayToDate } from '../../utils/adminTasks';
import { monitorRows } from '../../utils/handoverMonitor';
import { taskStats, handoverStats, percent } from '../../utils/reports';
import PageHeader from '../../components/PageHeader';
import CompletionChart from '../../components/admin/CompletionChart';
import { LoadingState, ErrorState } from '../../components/StateMessage';
import '../../styles/tasks.css';
import '../../styles/admin.css';

const TABS = [
  { id: 'tasks', label: 'Task completion' },
  { id: 'caregivers', label: 'By caregiver' },
  { id: 'residents', label: 'By resident' },
  { id: 'handovers', label: 'Handovers' },
];

// "Last 7 days" etc. -> the first day (the last day is always today)
const RANGES = [
  { id: '7', label: 'Last 7 days', from: (today) => addDays(today, -6) },
  { id: '14', label: 'Last 14 days', from: (today) => addDays(today, -13) },
  { id: '30', label: 'Last 30 days', from: (today) => addDays(today, -29) },
  { id: 'month', label: 'This month', from: (today) => `${today.slice(0, 8)}01` },
];

const rangeText = (from, to) => {
  const a = dayToDate(from);
  const b = dayToDate(to);
  const md = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${md(a)} – ${a.getMonth() === b.getMonth() ? b.getDate() : md(b)}, ${b.getFullYear()}`;
};

// A table row of task numbers: total | completed | skipped | not done | completion
function TaskCells({ s }) {
  return (
    <>
      <td className="num">{s.total}</td>
      <td className="num">{s.completed}</td>
      <td className="num">{s.skipped}</td>
      <td className="num">{s.notDone}</td>
      <td className="num"><strong>{percent(s.rate)}</strong></td>
    </>
  );
}
const TASK_HEADS = ['Tasks', 'Completed', 'Skipped', 'Not done', 'Completion'];

// Summaries made from saved AGAPAY records, ready to print or save as a PDF
export default function Reports() {
  const { user } = useAuth();
  const { staff } = useStaff();
  const { residents } = useResidents();
  const now = new Date();
  const today = isoDay(now);
  const [tab, setTab] = useState('tasks');
  const [rangeId, setRangeId] = useState('7');
  const range = RANGES.find((r) => r.id === rangeId);
  const from = range.from(today);

  // Tasks are counted by the calendar day they were due
  const tasksQuery = useApiData(`/tasks?from=${from}&to=${today}`, { transform: normalizeTasks });
  const rosterQuery = useApiData(`/shifts?from=${from}&to=${today}`);
  const transform = useMemo(() => (list) => parseHandovers(list, user.id), [user.id]);
  const handoversQuery = useApiData('/handovers?limit=500', { transform });
  const queries = [tasksQuery, rosterQuery, handoversQuery];
  const loading = queries.some((q) => q.status === 'loading');
  const failed = queries.find((q) => q.status === 'error');

  const tasks = tasksQuery.data ?? [];
  const rows = loading || failed ? [] : monitorRows(handoversQuery.data, rosterQuery.data, from, today, now);
  const all = taskStats(tasks);
  const ho = handoverStats(rows);

  const days = [];
  for (let d = from; d <= today; d = addDays(d, 1)) days.push(d);
  const perDay = days.map((ymd) => {
    const date = dayToDate(ymd);
    return {
      ymd,
      short: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      long: dayLabel(ymd),
      stats: taskStats(tasks.filter((t) => isoDay(t.dueAt) === ymd)),
    };
  });
  // Label every bar for a week; for longer ranges only the lowest and highest day
  const rated = perDay.filter((d) => d.stats.rate != null);
  const low = rated.reduce((a, b) => (b.stats.rate < a.stats.rate ? b : a), rated[0]);
  const high = rated.reduce((a, b) => (b.stats.rate > a.stats.rate ? b : a), rated[0]);
  const chartDays = perDay.map((d) => ({ ...d, labelled: perDay.length <= 7 || d === low || d === high }));
  const chartTitle = !rated.length
    ? 'No tasks were due in these days'
    : low === high || low.stats.rate === high.stats.rate
      ? `Completion was ${percent(low.stats.rate)} on every day with tasks`
      : `Completion ranged from ${percent(low.stats.rate)} to ${percent(high.stats.rate)}`;

  const caregivers = staff
    .filter((u) => u.role === 'caregiver' && (u.status === 'active' || tasks.some((t) => t.assignedTo === u.id)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const unassigned = tasks.filter((t) => !t.assignedTo);

  // How often each resident was flagged in handovers from these days
  const flagsFor = (r) => {
    const updates = rows.flatMap((row) => row.handover?.data?.residents ?? []).filter((u) => u.residentId === r.id);
    return { watch: updates.filter((u) => u.status === 'watch').length, urgent: updates.filter((u) => u.status === 'urgent').length };
  };

  const tiles = {
    tasks: [
      { label: 'Completion rate', value: percent(all.rate), note: `${all.completed} of ${all.due} due tasks` },
      { label: 'Skipped', value: all.skipped, note: all.skipped ? 'each with a reason' : 'none skipped' },
      { label: 'Not done', value: all.notDone, note: 'past due and still open', tone: all.notDone ? 'overdue' : '' },
      { label: 'Tasks per day', value: days.length ? Math.round((all.total / days.length) * 10) / 10 : 0, note: `${all.total} tasks in ${days.length} days` },
    ],
    handovers: [
      { label: 'Submitted', value: ho.submitted, note: `of ${ho.owed} shifts that ended` },
      { label: 'On time', value: ho.onTime, note: 'before the shift ended', tone: 'completed' },
      { label: 'Late', value: ho.late, note: 'after the shift ended', tone: ho.late ? 'pending' : '' },
      { label: 'Missing', value: ho.missing, note: 'never submitted', tone: ho.missing ? 'overdue' : '' },
    ],
  };
  const shownTiles = tab === 'handovers' ? tiles.handovers : tiles.tasks;
  const tabLabel = TABS.find((t) => t.id === tab).label;

  return (
    <div className="reports">
      <PageHeader title="Reports" subtitle="Summaries made from saved AGAPAY records.">
        <div className="reports__actions no-print">
          <label htmlFor="report-range" className="sr-only">Dates</label>
          <select id="report-range" className="field__input select" value={rangeId} onChange={(e) => setRangeId(e.target.value)}>
            {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button type="button" className="btn btn--primary" onClick={() => window.print()} aria-describedby="report-print-hint">
            <Printer size={18} aria-hidden="true" /> Print / Save as PDF
          </button>
          <p id="report-print-hint" className="reports__hint">To save a PDF, choose "Save as PDF" in the print window.</p>
        </div>
      </PageHeader>

      {/* Only on paper: what this report is */}
      <div className="print-only reports__print-head">
        <strong>AGAPAY · Orchid Carehome Inc.</strong>
        <span>{tabLabel} report · {rangeText(from, today)}</span>
        <span>Printed {now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} by {user.name}</span>
      </div>

      <div className="card reports__tabs no-print">
        <div className="tabs tabs--flat" role="tablist" aria-label="Report">
          {TABS.map(({ id, label }) => (
            <button key={id} type="button" role="tab" id={`rtab-${id}`} aria-selected={tab === id} aria-controls="report-panel" className="tab" onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <span className="reports__range">{rangeText(from, today)}</span>
      </div>

      {loading && <div className="card"><LoadingState label="Making the report…" /></div>}
      {failed && <div className="card"><ErrorState message={failed.error} onRetry={() => queries.forEach((q) => q.reload())} /></div>}

      {!loading && !failed && (
        <section id="report-panel" role="tabpanel" aria-labelledby={`rtab-${tab}`}>
          <ul className="stat-row" aria-label="Totals">
            {shownTiles.map((t) => (
              <li key={t.label} className="card stat-card">
                <span className="small-label">{t.label}</span>
                <strong className={`stat-card__value ${t.tone ? `stat-card__value--${t.tone}` : ''}`}>{t.value}</strong>
                <small className="stat-card__note">{t.note}</small>
              </li>
            ))}
          </ul>

          {tab === 'tasks' && (
            <>
              <div className="card reports__chart">
                <h2 className="card__title">{chartTitle}</h2>
                <p className="reports__chart-sub">Share of each day's due tasks marked Completed. Tasks still waiting for their time aren't counted.</p>
                <CompletionChart days={chartDays} />
              </div>
              <div className="card admin-table-card">
                <table className="data-table report-table">
                  <thead>
                    <tr><th scope="col">Date</th>{TASK_HEADS.map((h) => <th key={h} scope="col" className="num">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {[...perDay].reverse().map((d) => (
                      <tr key={d.ymd}><th scope="row">{d.long}</th><TaskCells s={d.stats} /></tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><th scope="row">Total</th><TaskCells s={all} /></tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {tab === 'caregivers' && (
            <div className="card admin-table-card">
              <table className="data-table report-table">
                <thead>
                  <tr>
                    <th scope="col">Caregiver</th>
                    {TASK_HEADS.map((h) => <th key={h} scope="col" className="num">{h}</th>)}
                    <th scope="col" className="num">Handovers</th>
                    <th scope="col" className="num">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {caregivers.map((c) => {
                    const h = handoverStats(rows.filter((r) => r.userId === c.id));
                    return (
                      <tr key={c.id}>
                        <th scope="row">{c.name}</th>
                        <TaskCells s={taskStats(tasks.filter((t) => t.assignedTo === c.id))} />
                        <td className="num">{h.submitted} of {h.owed}</td>
                        <td className="num">{h.missing}</td>
                      </tr>
                    );
                  })}
                  {unassigned.length > 0 && (
                    <tr>
                      <th scope="row" className="data-table__muted">Not assigned</th>
                      <TaskCells s={taskStats(unassigned)} />
                      <td className="num">–</td>
                      <td className="num">–</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'residents' && (
            <div className="card admin-table-card">
              <table className="data-table report-table">
                <thead>
                  <tr>
                    <th scope="col">Resident</th>
                    {TASK_HEADS.map((h) => <th key={h} scope="col" className="num">{h}</th>)}
                    <th scope="col" className="num">Flagged</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((r) => {
                    const f = flagsFor(r);
                    return (
                      <tr key={r.id}>
                        <th scope="row">{r.name} <small className="data-table__muted">· Room {r.room}</small></th>
                        <TaskCells s={taskStats(tasks.filter((t) => t.residentId === r.id))} />
                        <td className="num">{[f.urgent && `${f.urgent} urgent`, f.watch && `${f.watch} watch`].filter(Boolean).join(', ') || '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'handovers' && (
            <div className="card admin-table-card">
              <table className="data-table report-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    {['Shifts ended', 'Submitted', 'On time', 'Late', 'Missing', 'Read'].map((h) => <th key={h} scope="col" className="num">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...days].reverse().map((ymd) => {
                    const h = handoverStats(rows.filter((r) => r.shiftDate === ymd));
                    return (
                      <tr key={ymd}>
                        <th scope="row">{dayLabel(ymd)}</th>
                        <td className="num">{h.owed}</td>
                        <td className="num">{h.submitted}</td>
                        <td className="num">{h.onTime}</td>
                        <td className="num">{h.late}</td>
                        <td className="num">{h.missing}</td>
                        <td className="num">{h.read}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    {[ho.owed, ho.submitted, ho.onTime, ho.late, ho.missing, ho.read].map((v, i) => <td key={i} className="num"><strong>{v}</strong></td>)}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
