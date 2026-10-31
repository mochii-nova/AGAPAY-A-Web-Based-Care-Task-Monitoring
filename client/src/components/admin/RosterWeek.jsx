import { SHIFTS, shiftTime } from '../../constants';
import { isoDay } from '../../hooks/useShifts';
import { sameDay } from '../../utils/calendar';

const dayName = (d) => d.toLocaleDateString('en-US', { weekday: 'short' });
const longDay = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// The people in one slot as small first-name chips, or "No caregiver" when nobody is on it
function SlotPeople({ people }) {
  if (people.length === 0) return <span className="roster-gap">No caregiver</span>;
  return (
    <ul className="roster-people">
      {people.map((p) => (
        <li key={p.userId} className="roster-chip">{p.userName.split(' ')[0]}</li>
      ))}
    </ul>
  );
}

const tasksText = (n) => `${n} ${n === 1 ? 'task' : 'tasks'}`;

// One week of the roster: Morning / Noon / Night by 7 days. Each slot is a button; under the names,
// how many tasks that shift has (the side panel lists them).
// `transposed` (phones): one row per day, the three shifts across, so it fits the width.
// peopleOn(ymd, shift) -> roster entries shown in that slot; taskCount(ymd, shift) -> a number.
export default function RosterWeek({ days, today, selected, peopleOn, taskCount, onSelect, transposed }) {
  const slot = (day, shift) => {
    const ymd = isoDay(day);
    const people = peopleOn(ymd, shift);
    const count = taskCount(ymd, shift);
    const isSelected = selected?.date === ymd && selected?.shift.id === shift.id;
    const names = people.map((p) => p.userName).join(', ') || 'no caregiver';
    return (
      <button
        key={`${ymd}-${shift.id}`}
        type="button"
        className={`roster-slot ${people.length === 0 ? 'is-gap' : ''}`}
        aria-pressed={isSelected}
        aria-label={`${longDay(day)}, ${shift.label} shift: ${names}${count ? `, ${tasksText(count)}` : ''}. Open`}
        onClick={() => onSelect({ date: ymd, shift })}
      >
        <SlotPeople people={people} />
        {count > 0 && <span className="roster-count" aria-hidden="true">{tasksText(count)}</span>}
      </button>
    );
  };

  const dayHead = (day) => (
    <div key={isoDay(day)} className={`roster-head ${sameDay(day, today) ? 'is-today' : ''}`}>
      <span className="roster-head__weekday">{dayName(day)}</span>
      <span className="roster-head__date">{day.getDate()}</span>
    </div>
  );
  const shiftHead = (shift) => (
    <div key={shift.id} className={`roster-shift roster-shift--${shift.id}`}>
      <strong>{shift.label}</strong>
      {!transposed && <small>{shiftTime(shift)}</small>}
    </div>
  );

  if (transposed) {
    return (
      <div className="roster roster--days" role="group" aria-label="Roster for this week">
        <div className="roster-corner" />
        {SHIFTS.map(shiftHead)}
        {days.map((day) => [dayHead(day), ...SHIFTS.map((shift) => slot(day, shift))])}
      </div>
    );
  }

  return (
    <div className="roster roster--week" role="group" aria-label="Roster for this week">
      <div className="roster-corner" />
      {days.map(dayHead)}
      {SHIFTS.map((shift) => [shiftHead(shift), ...days.map((day) => slot(day, shift))])}
    </div>
  );
}
