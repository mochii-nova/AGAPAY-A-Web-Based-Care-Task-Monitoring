import { WEEKDAYS, monthGrid, sameDay, dayKey } from '../../utils/calendar';

const STATUS_WORD = { pending: 'pending', completed: 'completed', overdue: 'overdue', skipped: 'skipped' };

// "3 tasks: 1 completed, 2 pending" for screen readers
function describe(list) {
  if (list.length === 0) return 'no tasks';
  const parts = Object.keys(STATUS_WORD)
    .map((s) => [s, list.filter((t) => t.status === s).length])
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${STATUS_WORD[s]}`);
  return `${list.length} ${list.length === 1 ? 'task' : 'tasks'}: ${parts.join(', ')}`;
}

// Month grid. Days with a shift get a small coloured bar (one colour per shift, see the legend);
// tasks show as coloured dots. The full details are read out to screen readers.
export default function MonthView({ selected, today, tasksByDay, shiftOn, onSelect }) {
  const days = monthGrid(selected);

  return (
    <div className="month">
      <div className="month__head" aria-hidden="true">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="month__grid">
        {days.map((day) => {
          const list = tasksByDay[dayKey(day)] ?? [];
          const shift = shiftOn(day);
          const outside = day.getMonth() !== selected.getMonth();
          const isSelected = sameDay(day, selected);
          const isToday = sameDay(day, today);
          const label = `${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${
            isToday ? ' (today)' : ''
          }. ${shift ? `${shift.label} shift` : 'Day off'}. ${describe(list)}.`;

          return (
            <button
              key={dayKey(day)}
              type="button"
              className={`month__day ${outside ? 'is-outside' : ''} ${isToday ? 'is-today' : ''}`}
              aria-pressed={isSelected}
              aria-label={label}
              onClick={() => onSelect(day)}
            >
              <span className="month__date">{day.getDate()}</span>
              {shift && <span className={`shift-bar shift-bar--${shift.id}`} aria-hidden="true" />}
              {list.length > 0 && (
                <span className="dots" aria-hidden="true">
                  {list.slice(0, 5).map((t) => <span key={t._id} className={`dot dot--${t.status}`} />)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
