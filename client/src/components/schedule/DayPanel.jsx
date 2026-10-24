import { CalendarOff, StickyNote, ClipboardList } from 'lucide-react';
import TaskCategoryIcon from '../TaskCategoryIcon';
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

      <div className="day-panel__shift">
        {shift ? (
          <>
            <div>
              <p className="small-label">Your shift</p>
              <p className="day-panel__shift-time">
                {shift.label} · {shiftTime(shift)}
              </p>
            </div>
          </>
        ) : (
          <p className="day-panel__off">
            <CalendarOff size={18} aria-hidden="true" /> Day off
          </p>
        )}
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
    </aside>
  );
}
