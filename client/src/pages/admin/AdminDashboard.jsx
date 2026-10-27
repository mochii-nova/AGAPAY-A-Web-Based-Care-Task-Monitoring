import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, UserPlus, CalendarPlus, CircleCheck } from 'lucide-react';
import { useStaff } from '../../context/StaffContext';
import { useHandovers } from '../../context/HandoverContext';
import { useToast } from '../../context/ToastContext';
import useApiData from '../../hooks/useApiData';
import useResidents from '../../hooks/useResidents';
import useNow from '../../hooks/useNow';
import { isoDay } from '../../hooks/useShifts';
import { SHIFTS, shiftTime } from '../../constants';
import { RESIDENT_STATUS, latestUpdate, readersOf } from '../../utils/handover';
import { shiftOnDate, minutesToText } from '../../utils/shift';
import { formatTime } from '../../utils/format';
import { normalizeTasks } from '../../utils/tasks';
import { addDays, dayLabel, dayToDate, shiftOfDue } from '../../utils/adminTasks';
import { MONITOR_STATUS, monitorRows, reminderText, sentAt, handoverDay } from '../../utils/handoverMonitor';
import { useProfile } from '../../context/ProfileContext';
import PageHeader from '../../components/PageHeader';
import CardHeader from '../../components/CardHeader';
import Avatar from '../../components/Avatar';
import TaskFormModal from '../../components/admin/TaskFormModal';
import { LoadingState, ErrorState } from '../../components/StateMessage';
import '../../styles/dashboard.css';
import '../../styles/admin.css';

function greeting(now) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// The shift happening at `now` and the day it started (a Night shift after midnight started yesterday)
function currentShift(now) {
  const { shift, shiftDate } = shiftOfDue(now);
  return { shift, shiftDate, ...shiftOnDate(shift, dayToDate(shiftDate)) };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The administrator's home: today at a glance, and what needs a decision
export default function AdminDashboard() {
  const navigate = useNavigate();
  const showToast = useToast();
  const now = useNow();
  const { staff, pendingCount } = useStaff();
  const { residents, status: residentsStatus } = useResidents();
  const { handovers } = useHandovers();
  const { profile } = useProfile();
  const [creating, setCreating] = useState(false);

  const current = currentShift(now);
  const day = current.shiftDate; // "today" for shifts: until 6:00 AM that's still yesterday's Night shift
  const tasksQuery = useApiData(`/tasks?from=${day}&to=${addDays(day, 1)}`, { transform: normalizeTasks, refreshEvery: 60 * 1000 });
  const rosterQuery = useApiData(`/shifts?from=${addDays(day, -1)}&to=${addDays(day, 6)}`, { refreshEvery: 60 * 1000 });
  const contactQuery = useApiData('/contact');

  const ready = tasksQuery.status === 'ready' && rosterQuery.status === 'ready' && residentsStatus === 'ready';
  const failed = [tasksQuery, rosterQuery].find((q) => q.status === 'error');
  const roster = rosterQuery.data ?? [];
  const caregivers = staff.filter((u) => u.role === 'caregiver');
  const shiftOf = (t) => shiftOfDue(t.dueAt);
  const tasks = (tasksQuery.data ?? []).filter((t) => shiftOf(t).shiftDate === day);
  const pending = tasks.filter((t) => t.status === 'pending');
  const overdue = tasks.filter((t) => t.status === 'overdue').sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

  // Handovers for today's shifts, and yesterday's (for "missing")
  const rows = ready ? monitorRows(handovers, roster, addDays(day, -1), day, now) : [];
  const todayRows = rows.filter((r) => r.shiftDate === day);
  const nextDue = todayRows.filter((r) => r.status === 'notDue').sort((a, b) => a.end - b.end)[0];
  const missing = rows.filter((r) => r.status === 'missing');

  const unassignedResidents = residents.filter((r) => r.caregivers.length === 0).length;
  const activeCaregivers = caregivers.filter((c) => c.status === 'active').length;

  const tiles = [
    { label: 'Residents', value: residents.length, note: unassignedResidents ? `${unassignedResidents} without a caregiver` : 'All have caregivers', to: '/admin/residents' },
    { label: 'Active caregivers', value: activeCaregivers, note: pendingCount ? `${pendingCount} waiting for approval` : 'No one waiting for approval', to: '/admin/staff' },
    { label: 'Pending tasks', value: pending.length, note: 'Still to do on today’s shifts', to: '/admin/tasks' },
    { label: 'Overdue tasks', value: overdue.length, note: overdue.length ? 'Need follow-up' : 'Nothing late', tone: overdue.length ? 'overdue' : '', to: '/admin/tasks' },
    {
      label: 'Handovers today',
      value: todayRows.filter((r) => r.handover).length,
      of: todayRows.length,
      note: nextDue ? `${nextDue.shift.label} due at ${formatTime(nextDue.end)}` : todayRows.length ? 'All of today’s shifts have ended' : 'Nobody on the roster',
      to: '/admin/handover',
    },
  ];

  // Who is working right now, with what they still have to do
  const onShift = roster.filter((e) => e.shiftDate === day && e.shift === current.shift.apiValue);
  const leftFor = (userId) =>
    tasks.filter((t) => t.assignedTo === userId && shiftOf(t).shift.id === current.shift.id && (t.status === 'pending' || t.status === 'overdue')).length;
  const residentsOf = (userId) => residents.filter((r) => r.caregivers.some((c) => c.id === userId)).map((r) => r.name.split(' ')[0]);

  // Needs attention: overdue tasks, residents to watch, missing handovers, gaps in the roster, sign-ups, website messages
  const attention = [];
  overdue.slice(0, 3).forEach((t) =>
    attention.push({
      key: `t${t.id}`,
      tone: 'overdue',
      tag: 'Overdue',
      title: t.task,
      sub: [t.resident, t.room && `Rm ${t.room}`, t.assignedToName ?? 'not assigned', `due ${formatTime(t.dueAt)}`].filter(Boolean).join(' · '),
      action: 'View',
      onClick: () => navigate(`/admin/tasks?open=${t.id}`),
    })
  );
  if (overdue.length > 3) {
    attention.push({ key: 'more-overdue', tone: 'overdue', tag: 'Overdue', title: `${overdue.length - 3} more overdue tasks`, sub: 'On today’s shifts', action: 'Open', onClick: () => navigate('/admin/tasks') });
  }
  residents.forEach((r) => {
    const latest = latestUpdate(handovers, r);
    if (!latest || latest.update.status === 'normal') return;
    const st = RESIDENT_STATUS[latest.update.status];
    attention.push({
      key: `r${r.id}`,
      tone: st.tone,
      tag: st.label === 'Watch closely' ? 'Watch' : st.label,
      title: `${r.name} marked "${st.label}"`,
      sub: `${latest.handover.author?.name ?? 'Handover'} · ${dayLabel(handoverDay(latest.handover))}`,
      action: 'View',
      onClick: () => navigate(`/admin/residents?open=${r.residentCode}`),
    });
  });
  missing.slice(0, 2).forEach((row) =>
    attention.push({
      key: `m${row.key}`,
      tone: 'overdue',
      tag: 'Missing',
      title: `${row.shift.label} handover, ${dayLabel(row.shiftDate)}`,
      sub: `${row.userName} hasn't submitted it`,
      action: 'Remind',
      onClick: () => navigate(`/messages?with=${row.userId}&text=${encodeURIComponent(reminderText(row))}`),
    })
  );
  const gaps = [];
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(day, i);
    SHIFTS.forEach((s) => {
      if (i === 0 && shiftOnDate(s, dayToDate(d)).end < now) return; // already over
      if (!roster.some((e) => e.shiftDate === d && e.shift === s.apiValue)) gaps.push({ d, s });
    });
  }
  if (gaps.length) {
    attention.push({
      key: 'gap',
      tone: 'overdue',
      tag: 'No caregiver',
      title: `${gaps[0].s.label} shift on ${dayLabel(gaps[0].d)}`,
      sub: gaps.length > 1 ? `Nobody is assigned yet, and ${plural(gaps.length - 1, 'more shift')} this week` : 'Nobody is assigned yet',
      action: 'Assign',
      onClick: () => navigate('/admin/schedule'),
    });
  }
  if (pendingCount) {
    attention.push({ key: 'signups', tone: 'pending', tag: 'Sign-up', title: `${plural(pendingCount, 'caregiver')} waiting for approval`, sub: 'They can’t sign in until you approve them', action: 'Review', onClick: () => navigate('/admin/staff') });
  }
  const newContact = (contactQuery.data ?? []).filter((m) => !m.handled).length;
  if (newContact) {
    attention.push({ key: 'contact', tone: 'pending', tag: 'Website', title: `${plural(newContact, 'new message')} from the website`, sub: 'Sent through the contact form', action: 'Open', onClick: () => navigate('/admin/contact') });
  }

  const recent = handovers.slice(0, 3);
  const timingOf = (h) => {
    const s = SHIFTS.find((x) => x.apiValue === h.shift);
    return s && sentAt(h) > shiftOnDate(s, dayToDate(handoverDay(h))).end ? MONITOR_STATUS.late : MONITOR_STATUS.onTime;
  };

  const minutesLeft = (current.end - now) / 60000;
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="admin-dash">
      <PageHeader
        title={`${greeting(now)}, ${profile.name.split(' ')[0]}`}
        subtitle={`${today} · ${current.shift.label} shift is on now (${shiftTime(current.shift)})`}
      >
        <div className="admin-dash__actions">
          <button type="button" className="btn btn--soft" onClick={() => navigate('/admin/residents', { state: { add: true } })}>
            <UserPlus size={18} aria-hidden="true" /> Add resident
          </button>
          <button type="button" className="btn btn--soft" onClick={() => navigate('/admin/staff', { state: { add: true } })}>
            <UserPlus size={18} aria-hidden="true" /> Add staff
          </button>
          <button type="button" className="btn btn--soft" onClick={() => navigate('/admin/schedule', { state: { add: true } })}>
            <CalendarPlus size={18} aria-hidden="true" /> Fill a month
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
            <Plus size={18} aria-hidden="true" /> Create task
          </button>
        </div>
      </PageHeader>

      {failed && <div className="card"><ErrorState message={failed.error} onRetry={() => { tasksQuery.reload(); rosterQuery.reload(); }} /></div>}
      {!ready && !failed && <div className="card"><LoadingState label="Loading today…" /></div>}

      {ready && (
        <>
          <ul className="stat-row stat-row--five" aria-label="Today at a glance">
            {tiles.map((t) => (
              <li key={t.label}>
                <Link to={t.to} className="card stat-card stat-card--link">
                  <span className="small-label">{t.label}</span>
                  <strong className={`stat-card__value ${t.tone ? `stat-card__value--${t.tone}` : ''}`}>
                    {t.value}
                    {t.of != null && <small className="stat-card__of"> of {t.of}</small>}
                  </strong>
                  <small className="stat-card__note">{t.note}</small>
                </Link>
              </li>
            ))}
          </ul>

          <div className="dash-row admin-dash__row">
            <section className="card">
              <CardHeader title="Today's task progress" linkTo="/admin/tasks" linkLabel="Open Tasks & Care" />
              <ul className="shift-progress">
                {SHIFTS.map((s) => {
                  const list = tasks.filter((t) => shiftOf(t).shift.id === s.id);
                  const done = list.filter((t) => t.status === 'completed').length;
                  const late = list.filter((t) => t.status === 'overdue').length;
                  const { start, end } = shiftOnDate(s, dayToDate(day));
                  const right =
                    now < start
                      ? `Starts ${s.start} · ${plural(list.length, 'task')}`
                      : list.length === 0
                        ? `No tasks${now >= end ? ' · ended' : ''}`
                        : `${done} of ${list.length} completed${late ? ` · ${late} overdue` : ''}${now >= end ? ' · ended' : ''}`;
                  const pct = list.length ? Math.round((done / list.length) * 100) : 0;
                  return (
                    <li key={s.id}>
                      <div className="shift-progress__line">
                        <span><strong>{s.label}</strong> · {shiftTime(s)}</span>
                        <span>{right}</span>
                      </div>
                      <div className="shift-progress__track" role="progressbar" aria-label={`${s.label} shift`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={`${done} of ${list.length} completed`}>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="card">
              <CardHeader title="On shift now" linkTo="/admin/schedule" linkLabel="Schedule" />
              <p className="admin-dash__shift-line">
                {current.shift.label} · {shiftTime(current.shift)} · ends in {minutesToText(minutesLeft)}
              </p>
              {onShift.length === 0 ? (
                <p className="resident-details__gap">Nobody is on this shift. Assign someone in Schedule.</p>
              ) : (
                <ul className="slot-panel__list">
                  {onShift.map((e) => {
                    const left = leftFor(e.userId);
                    const person = staff.find((u) => u.id === e.userId);
                    const theirs = residentsOf(e.userId);
                    return (
                      <li key={e.userId}>
                        <Avatar name={e.userName} photo={person?.photoUrl} size={36} />
                        <span className="assign__who">
                          <strong>{e.userName}</strong>
                          <small>{theirs.length ? theirs.join(', ') : 'No residents assigned'}</small>
                        </span>
                        <span className="admin-dash__left">{left ? `${plural(left, 'task')} left` : 'All done'}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <div className="dash-row admin-dash__row admin-dash__row--even">
            <section className="card">
              <CardHeader title="Needs attention" />
              {attention.length === 0 ? (
                <p className="admin-dash__clear"><CircleCheck size={18} aria-hidden="true" /> Nothing needs your attention right now.</p>
              ) : (
                <ul className="attention-list">
                  {attention.slice(0, 7).map((a) => (
                    <li key={a.key}>
                      <span className={`status-pill status-pill--${a.tone}`}>{a.tag}</span>
                      <span className="attention-list__text">
                        <strong>{a.title}</strong>
                        <small>{a.sub}</small>
                      </span>
                      <button type="button" className="btn btn--outline btn--sm" onClick={a.onClick} aria-label={`${a.action}: ${a.title}`}>
                        {a.action}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <CardHeader title="Recent handovers" linkTo="/admin/handover" />
              {recent.length === 0 ? (
                <p className="staff-details__empty">No handovers yet.</p>
              ) : (
                <ul className="attention-list">
                  {recent.map((h) => {
                    const st = timingOf(h);
                    const reader = readersOf(h)[0];
                    return (
                      <li key={h.id}>
                        <span className="attention-list__text">
                          <strong>{SHIFTS.find((s) => s.apiValue === h.shift)?.label ?? h.shift} · {dayLabel(handoverDay(h))}</strong>
                          <small>
                            {h.author?.name} · {formatTime(sentAt(h))} · {reader ? `read by ${reader.name}` : 'not read yet'}
                          </small>
                        </span>
                        <span className={`status-pill status-pill--${st.tone}`}>{st.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <TaskFormModal
        open={creating}
        preset={{ date: isoDay(now) }}
        residents={residents}
        caregivers={caregivers}
        onSaved={(saved, { offDays, partial }) => {
          tasksQuery.reload({ silent: true });
          if (!partial) showToast(saved.length === 1 ? `Created ${saved[0].task}.` : `Created ${saved.length} tasks.${offDays ? ` ${offDays} without a caregiver.` : ''}`);
        }}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}
