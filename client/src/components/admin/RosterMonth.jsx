import { SHIFTS } from '../../constants';
import { isoDay } from '../../hooks/useShifts';
import { WEEKDAYS, monthGrid, sameDay } from '../../utils/calendar';

// One month of the roster. Each day shows its three shifts (first names, or "No one" in red);
// phones show a dot per shift instead. Clicking a day opens it, keeping the shift you were on.
export default function RosterMonth({ month, today, selected, peopleOn, onSelect }) {
  const days = monthGrid(month);
  const shift = selected?.shift ?? SHIFTS[0];

  return (
    <div className="month roster-month">
      <div className="month__head" aria-hidden="true">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="month__grid">
        {days.map((day) => {
          const ymd = isoDay(day);
          const rows = SHIFTS.map((s) => ({ shift: s, people: peopleOn(ymd, s) }));
          const outside = day.getMonth() !== month.getMonth();
          const label = `${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. ${rows
            .map((r) => `${r.shift.label}: ${r.people.map((p) => p.userName).join(', ') || 'no caregiver'}`)
            .join('. ')}. Open`;
          return (
            <button
              key={ymd}
              type="button"
              className={`month__day ${outside ? 'is-outside' : ''} ${sameDay(day, today) ? 'is-today' : ''}`}
              aria-pressed={selected?.date === ymd}
              aria-label={label}
              onClick={() => onSelect({ date: ymd, shift })}
            >
              <span className="month__date">{day.getDate()}</span>
              <span className="roster-month__lines" aria-hidden="true">
                {rows.map(({ shift: s, people }) => (
                  <span key={s.id} className={`roster-month__line ${people.length ? '' : 'is-gap'}`}>
                    <span className="roster-month__shift">{s.label}</span>
                    <span className="roster-month__names">{people.length ? people.map((p) => p.userName.split(' ')[0]).join(', ') : 'None'}</span>
                  </span>
                ))}
              </span>
              <span className="roster-month__dots" aria-hidden="true">
                {rows.map(({ shift: s, people }) => (
                  <span key={s.id} className={`roster-month__dot ${people.length ? '' : 'is-gap'}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
