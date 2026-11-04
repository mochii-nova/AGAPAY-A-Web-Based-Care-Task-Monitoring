import { StickyNote, ClipboardList, TriangleAlert } from 'lucide-react';
import StatusPill from '../StatusPill';
import { EmptyState } from '../StateMessage';
import GoogleCalendarBox from './GoogleCalendarBox';
import { SHIFTS, shiftTime } from '../../constants';
import { dayTitle } from '../../utils/calendar';
import { formatTime } from '../../utils/format';
import { taskTextsLabel } from '../../utils/tasks';

// Side panel for the selected day: my shift, Google Calendar, and that day's tasks.
// hiddenCount: that day's tasks the shift buttons hide; noShiftWarning: tasks but no shift that day.
export default function DayPanel({ date, shift, tasks, hiddenCount = 0, noShiftWarning, shiftFilter, onShiftFilter, onOpenTask }) {
  const picked = SHIFTS.find((s) => s.id === shiftFilter);
  return (
    <aside className="card day-panel" aria-label={`Schedule for ${dayTitle(date)}`}>
      <h2 className="day-panel__title">{dayTitle(date)}</h2>
      <p className="day-panel__shift-line">{shift ? `${shift.label} · ${shiftTime(shift)}` : 'Day off'}</p>

      {noShiftWarning && (
        <p className="day-panel__warning" role="note">
          <TriangleAlert size={16} aria-hidden="true" /> You have tasks but no shift this day.
        </p>
      )}

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
        <EmptyState icon={ClipboardList}>
          {picked && hiddenCount > 0 ? `No tasks in the ${picked.label.toLowerCase()} shift.` : 'No tasks to show for this day.'}
        </EmptyState>
      ) : (
        <ul className="day-panel__list">
          {tasks.map((t) => {
            const { room } = t;
            return (
              <li key={t._id} className="day-task">
                <span className="day-task__time">{formatTime(t.dueAt)}</span>
                <span className="day-task__main">
                  <strong>{t.task}</strong>
                  <small>{t.resident}{room && ` · Room ${room}`}</small>
                  {taskTextsLabel(t) && (
                    <small className="day-task__note">
                      <StickyNote size={13} aria-hidden="true" /> {taskTextsLabel(t)}
                    </small>
                  )}
                </span>
                <StatusPill status={t.status} />
                <button
                  type="button"
                  className="btn btn--outline btn--sm btn--row"
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

      {picked && hiddenCount > 0 && (
        <p className="day-panel__more">
          {hiddenCount} more {hiddenCount === 1 ? 'task' : 'tasks'} outside the {picked.label.toLowerCase()} shift.{' '}
          <button type="button" className="link-btn" onClick={() => onShiftFilter('')}>Show all day</button>
        </p>
      )}
    </aside>
  );
}
