import { StickyNote, ClipboardList } from 'lucide-react';
import StatusPill from '../StatusPill';
import { EmptyState } from '../StateMessage';
import GoogleCalendarBox from './GoogleCalendarBox';
import { SHIFTS, shiftTime } from '../../constants';
import { dayTitle } from '../../utils/calendar';
import { formatTime } from '../../utils/format';

// Side panel for the selected day: my shift, Google Calendar, and that day's tasks
export default function DayPanel({ date, shift, tasks, shiftFilter, onShiftFilter, roomOf, onOpenTask }) {
  return (
    <aside className="card day-panel" aria-label={`Schedule for ${dayTitle(date)}`}>
      <h2 className="day-panel__title">{dayTitle(date)}</h2>
      <p className="day-panel__shift-line">{shift ? `${shift.label} · ${shiftTime(shift)}` : 'Day off'}</p>

      <div className="day-panel__gcal">
        <GoogleCalendarBox shift={shift} date={date} />
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
              <li key={t._id} className="day-task">
                <span className="day-task__time">{formatTime(t.dueAt)}</span>
                <span className="day-task__main">
                  <strong>{t.task}</strong>
                  <small>{t.resident}{room && ` · Room ${room}`}</small>
                  {t.note && (
                    <small className="day-task__note">
                      <StickyNote size={13} aria-hidden="true" /> Has a note
                    </small>
                  )}
                </span>
                <StatusPill status={t.status} />
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => onOpenTask(t)}
                  aria-label={`View task: ${t.task} for ${t.resident}`}
                >
                  View
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
