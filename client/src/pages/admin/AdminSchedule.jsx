import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarPlus, CalendarDays } from 'lucide-react';
import api from '../../api';
import { useStaff } from '../../context/StaffContext';
import { useToast } from '../../context/ToastContext';
import useApiData from '../../hooks/useApiData';
import useMediaQuery from '../../hooks/useMediaQuery';
import { isoDay } from '../../hooks/useShifts';
import { SHIFTS } from '../../constants';
import { weekDays, monthGrid, addMonths, monthTitle, weekTitle, addDays as addDaysTo } from '../../utils/calendar';
import { addDays, dayLabel, dayToDate, shiftOfDue } from '../../utils/adminTasks';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import RosterWeek from '../../components/admin/RosterWeek';
import RosterMonth from '../../components/admin/RosterMonth';
import SlotPanel from '../../components/admin/SlotPanel';
import FillMonthModal from '../../components/admin/FillMonthModal';
import { LoadingState, ErrorState } from '../../components/StateMessage';
import '../../styles/schedule.css';
import '../../styles/admin.css';

// Who works which shift on which day: a week or a month of Morning / Noon / Night.
// Click a shift to assign someone or give someone the day off.
export default function AdminSchedule() {
  const { staff } = useStaff();
  const showToast = useToast();
  const location = useLocation();
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const isPhone = useMediaQuery('(max-width: 760px)');
  const now = new Date();
  const today = isoDay(now);
  const [view, setView] = useState('week');
  const [focus, setFocus] = useState(today); // a day in the week / month shown
  const [who, setWho] = useState('');
  const [picked, setPicked] = useState(null);
  const [busyId, setBusyId] = useState(null);
  // The Dashboard's "Fill a month" opens it straight away
  const [filling, setFilling] = useState(() => !!location.state?.add);

  const focusDate = dayToDate(focus);
  const days = view === 'week' ? weekDays(focusDate) : monthGrid(focusDate);
  const from = isoDay(days[0]);
  const to = isoDay(days[days.length - 1]);
  // The panel only knows the roster of the days on screen, so a pick from another week or month is
  // dropped. Laptops always show a shift: today's Morning, or the first day shown.
  const firstShown = view === 'week' ? from : isoDay(new Date(focusDate.getFullYear(), focusDate.getMonth(), 1));
  const onScreen = (ymd) => ymd >= from && ymd <= to;
  const selected =
    picked && onScreen(picked.date) ? picked : isNarrow ? null : { date: onScreen(today) ? today : firstShown, shift: picked?.shift ?? SHIFTS[0] };
  // One day more each side: the panel checks for back-to-back shifts
  const rosterQuery = useApiData(`/shifts?from=${addDays(from, -1)}&to=${addDays(to, 1)}`);
  const tasksQuery = useApiData(`/tasks?from=${from}&to=${addDays(to, 1)}`);
  const entries = rosterQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const caregivers = staff.filter((u) => u.role === 'caregiver');

  const peopleOn = (ymd, shift) =>
    entries.filter((e) => e.shiftDate === ymd && e.shift === shift.apiValue && (!who || String(e.userId) === who));
  const gapsShown = days
    .filter((d) => view === 'week' || d.getMonth() === focusDate.getMonth())
    .reduce((n, d) => n + SHIFTS.filter((s) => !entries.some((e) => e.shiftDate === isoDay(d) && e.shift === s.apiValue)).length, 0);

  const move = (n) => setFocus(isoDay(view === 'week' ? addDaysTo(focusDate, 7 * n) : addMonths(focusDate, n)));

  // Saves one person's shift on one day (shift null = day off), then refreshes the roster
  const save = async (person, date, shift) => {
    setBusyId(person.id);
    try {
      await api.put('/shifts', { userId: person.id, shiftDate: date, shift: shift?.apiValue ?? null });
      rosterQuery.reload({ silent: true });
      showToast(
        shift
          ? `${person.name} is on the ${shift.label} shift on ${dayLabel(date)}.`
          : `${person.name} has ${dayLabel(date)} off.`
      );
    } catch (err) {
      showToast(err.response ? err.response.data?.message || "Couldn't save. Please try again." : "Can't reach the server. Please try again.", 'error');
    } finally {
      setBusyId(null);
    }
  };

  const panel = selected && (
    <SlotPanel
      slot={selected}
      entries={entries}
      caregivers={caregivers}
      taskCount={tasks.filter((t) => {
        const s = shiftOfDue(t.dueAt);
        return s.shiftDate === selected.date && s.shift.id === selected.shift.id;
      }).length}
      busyId={busyId}
      onAssign={(c) => save(c, selected.date, selected.shift)}
      onDayOff={(e) => save({ id: e.userId, name: e.userName }, selected.date, null)}
      onSelectShift={(shift) => setPicked({ date: selected.date, shift })}
      showTitle={!isNarrow}
    />
  );

  const ready = rosterQuery.status === 'ready';

  return (
    <div>
      <PageHeader title="Schedule" subtitle="Assign caregivers to the Morning, Noon and Night shifts.">
        <button type="button" className="btn btn--primary" onClick={() => setFilling(true)}>
          <CalendarPlus size={18} aria-hidden="true" /> Fill a month
        </button>
      </PageHeader>

      <div className="card schedule-toolbar admin-schedule__toolbar">
        <div className="date-nav">
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => move(-1)} aria-label={view === 'week' ? 'Previous week' : 'Previous month'}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setFocus(today)}>Today</button>
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => move(1)} aria-label={view === 'week' ? 'Next week' : 'Next month'}>
            <ChevronRight size={18} />
          </button>
          <h2 className="admin-schedule__title" aria-live="polite">{view === 'week' ? weekTitle(focusDate) : monthTitle(focusDate)}</h2>
        </div>

        <div className="segmented" role="group" aria-label="View">
          <button type="button" className="segmented__btn" aria-pressed={view === 'week'} onClick={() => setView('week')}>Week</button>
          <button type="button" className="segmented__btn" aria-pressed={view === 'month'} onClick={() => setView('month')}>Month</button>
        </div>

        <label htmlFor="schedule-who" className="sr-only">Show caregiver</label>
        <select id="schedule-who" className="field__input select" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">All caregivers</option>
          {caregivers.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>

        <p className="admin-schedule__gcal">
          <CalendarDays size={16} aria-hidden="true" />
          Caregivers add their shifts to Google Calendar from their own schedule.
        </p>
      </div>

      <div className="schedule-layout admin-schedule__layout">
        <div className="card schedule-calendar">
          {rosterQuery.status === 'loading' && <LoadingState label="Loading the roster…" />}
          {rosterQuery.status === 'error' && <ErrorState message={rosterQuery.error} onRetry={rosterQuery.reload} />}
          {ready && (
            <>
              {view === 'week' ? (
                <RosterWeek days={days} today={now} selected={selected} peopleOn={peopleOn} onSelect={setPicked} transposed={isPhone} />
              ) : (
                <RosterMonth month={focusDate} today={now} selected={selected} peopleOn={peopleOn} onSelect={setPicked} />
              )}
              <p className="admin-schedule__gaps" role="status">
                {gapsShown === 0
                  ? `Every shift ${view === 'week' ? 'this week' : 'this month'} has a caregiver.`
                  : `${gapsShown} ${gapsShown === 1 ? 'shift has' : 'shifts have'} no caregiver ${view === 'week' ? 'this week' : 'this month'}.`}
                {who && ' (Showing one caregiver; gaps count everyone.)'}
              </p>
            </>
          )}
        </div>

        {!isNarrow && <aside className="card day-panel" aria-label="Selected shift">{panel}</aside>}
      </div>

      {isNarrow && (
        <Modal open={!!selected} onClose={() => setPicked(null)} title={selected ? `${dayLabel(selected.date)} · ${selected.shift.label}` : ''}>
          {panel}
        </Modal>
      )}

      <FillMonthModal
        open={filling}
        caregivers={caregivers}
        startMonth={new Date(now.getFullYear(), now.getMonth(), 1)}
        onDone={({ person, shift, month, count, cleared }) => {
          rosterQuery.reload({ silent: true });
          showToast(`${person.name}: ${shift.label} shift on ${count} days in ${month}.${cleared ? ` ${cleared} removed on days off.` : ''}`);
        }}
        onClose={() => setFilling(false)}
      />
    </div>
  );
}
