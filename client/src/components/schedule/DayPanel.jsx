import { CalendarPlus, CalendarOff, StickyNote, ClipboardList } from 'lucide-react';
import TaskCategoryIcon from '../TaskCategoryIcon';
import StatusPill from '../StatusPill';
import { EmptyState } from '../StateMessage';
import { SHIFTS, shiftTime } from '../../constants';
import { dayTitle } from '../../utils/calendar';
import { formatTime } from '../../utils/format';
import { googleCalendarLink } from '../../utils/shift';

// Side panel for the selected day: my shift, Google Calendar button, and that day's tasks
export default function DayPanel({ date, shift, tasks, shiftFilter, onShiftFilter, roomOf, onOpenTask }) {
  return (
    <aside className="card day-panel" aria-label={`Schedule for ${dayTitle(date)}`}>
      <h2 className="day-panel__title">{dayTitle(date)}</h2>

      <div className="day-panel__shift">
        {shift ? (
          <>
            <div>
              <p className="small-label">Your shift</p>
              <p className="day-panel__shift-time">
                {shift.label} · {shiftTime(shift)}
              </p>
            </div>
            <a
              className="btn btn--outline day-panel__gcal"
              href={googleCalendarLink(shift, date)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarPlus size={16} aria-hidden="true" /> Add to Google Calendar
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </>
        ) : (
          <p className="day-panel__off">
            <CalendarOff size={18} aria-hidden="true" /> Day off
          </p>
        )}
      </div>

      <div className="segmented segmented--fill day-panel__filter" role="group" aria-label="Show tasks for which shift">
        {[{ id: '', label: 'All day' }, ...SHIFTS].map((s) => (
          <button
            key={s.id}
            type="button"
            className="segmented__btn"
            aria-pressed={shiftFilter === s.id}
            onClick={() => onShiftFilter(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={ClipboardList}>No tasks to show for this day.</EmptyState>
      ) : (
        <ul className="day-panel__list">
          {tasks.map((t) => {
            const room = roomOf(t.resident);
            return (
              <li key={t._id}>
                <button type="button" className="day-task" onClick={() => onOpenTask(t)}>
                  <TaskCategoryIcon category={t.category} />
                  <span className="day-task__main">
                    <strong>{t.task}</strong>
                    <small>
                      {formatTime(t.dueAt)} · {t.resident}
                      {room && ` · Room ${room}`}
                    </small>
                    {t.note && (
                      <small className="day-task__note">
                        <StickyNote size={14} aria-hidden="true" /> Has a note
                      </small>
                    )}
                  </span>
                  <StatusPill status={t.status} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="local-note day-panel__hint">
        The button opens Google Calendar with your shift filled in. Automatic syncing needs the backend.
      </p>
    </aside>
  );
}
