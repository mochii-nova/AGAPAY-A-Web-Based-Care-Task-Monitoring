import { weekDays, sameDay, dayKey } from '../../utils/calendar';
import { formatTime } from '../../utils/format';

// Seven columns, one per day, listing each task with its time
export default function WeekView({ selected, today, tasksByDay, shiftOn, onSelect, onOpenTask }) {
  return (
    <div className="week">
      {weekDays(selected).map((day) => {
        const list = tasksByDay[dayKey(day)] ?? [];
        const shift = shiftOn(day);
        const isSelected = sameDay(day, selected);

        return (
          <section key={dayKey(day)} className={`week__day ${isSelected ? 'is-selected' : ''}`}>
            <button
              type="button"
              className={`week__head ${sameDay(day, today) ? 'is-today' : ''}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(day)}
            >
              <span className="week__weekday">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="week__date">{day.getDate()}</span>
              {shift ? (
                <span className={`shift-chip shift-chip--${shift.id}`}>
                  <span className="shift-chip__mark" aria-hidden="true" />
                  <span className="shift-chip__text">{shift.label}</span>
                  <span className="sr-only"> shift</span>
                </span>
              ) : (
                <span className="week__off">Day off</span>
              )}
            </button>

            {list.length === 0 ? (
              <p className="week__empty">No tasks</p>
            ) : (
              <ul className="week__tasks">
                {list.map((t) => (
                  <li key={t._id}>
                    <button
                      type="button"
                      className={`week__task week__task--${t.status}`}
                      onClick={() => onOpenTask(t)}
                      aria-label={`${t.task}, ${t.resident}, ${formatTime(t.dueAt)}, ${t.status}`}
                    >
                      <span className={`dot dot--${t.status}`} aria-hidden="true" />
                      <span>
                        <small>{formatTime(t.dueAt)}</small>
                        {t.task}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
