import { SHIFTS } from '../../constants';
import { isoDay } from '../../hooks/useShifts';
import { WEEKDAYS, monthGrid, sameDay } from '../../utils/calendar';

// One month of the roster. Each day shows its three shifts (first names, or "None" in red, and the
// number of tasks); phones show a dot per shift instead. Clicking a day opens it: onOpenDay(ymd) picks
// the shift (the one on now, or the first with tasks).
export default function RosterMonth({ month, today, selected, peopleOn, taskCount, onOpenDay }) {
  const days = monthGrid(month);

  return (
    <div className="month roster-month">
      <div className="month__head" aria-hidden="true">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="month__grid">
        {days.map((day) => {
          const ymd = isoDay(day);
          const rows = SHIFTS.map((s) => ({ shift: s, people: peopleOn(ymd, s), count: taskCount(ymd, s) }));
          const outside = day.getMonth() !== month.getMonth();
          const label = `${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. ${rows
            .map((r) => `${r.shift.label}: ${r.people.map((p) => p.userName).join(', ') || 'no caregiver'}${r.count ? `, ${r.count} ${r.count === 1 ? 'task' : 'tasks'}` : ''}`)
            .join('. ')}. Open`;
          return (
            <button
              key={ymd}
              type="button"
              className={`month__day ${outside ? 'is-outside' : ''} ${sameDay(day, today) ? 'is-today' : ''}`}
              aria-pressed={selected?.date === ymd}
              aria-label={label}
              onClick={() => onOpenDay(ymd)}
            >
              <span className="month__date">{day.getDate()}</span>
              <span className="roster-month__lines" aria-hidden="true">
                {rows.map(({ shift: s, people, count }) => (
                  <span key={s.id} className={`roster-month__line ${people.length ? '' : 'is-gap'}`}>
                    <span className={`roster-month__shift roster-month__shift--${s.id}`}>{s.label}</span>
                    <span className="roster-month__names">{people.length ? people.map((p) => p.userName.split(' ')[0]).join(', ') : 'None'}</span>
                    {count > 0 && <span className="roster-month__count" title={`${count} ${count === 1 ? 'task' : 'tasks'}`}>{count}</span>}
                  </span>
                ))}
              </span>
              <span className="roster-month__dots" aria-hidden="true">
                {rows.map(({ shift: s, people }) => (
                  <span key={s.id} className={`roster-month__dot roster-month__dot--${s.id} ${people.length ? '' : 'is-gap'}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
