import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert, TriangleAlert } from 'lucide-react';
import Avatar from '../Avatar';
import { SHIFTS, shiftTime, shiftLabel } from '../../constants';
import { addDays, dayLabel } from '../../utils/adminTasks';
import { formatTime } from '../../utils/format';
import { isoDay } from '../../hooks/useShifts';

const STATUS_WORD = { pending: 'Pending', completed: 'Completed', skipped: 'Skipped', overdue: 'Overdue' };
const MAX_TASKS = 3;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Everything about one shift on one day, kept short: who is on it, its tasks, and one row to add
// someone. `entries`: the roster around this day. `caregivers`: the active caregivers. `tasks`: this
// shift's tasks, by time. onAssign(caregiver) puts them on this shift (moving them if they had another
// shift that day); onDayOff(entry) gives that person the day off. `busyId`: the person being saved.
export default function SlotPanel({ slot, entries, caregivers, tasks, tasksLoading, busyId, onAssign, onDayOff, onSelectShift, showTitle = true }) {
  const { date, shift } = slot;
  const [allTasks, setAllTasks] = useState(false);
  const entryOf = (userId, ymd) => entries.find((e) => e.userId === userId && e.shiftDate === ymd);
  const onIt = entries.filter((e) => e.shiftDate === date && e.shift === shift.apiValue);
  const taskCount = tasks.length;

  // Open tasks given to someone who isn't on this shift, per person: one banner each
  const offShift = [];
  tasks
    .filter((t) => t.assignedTo && (t.status === 'pending' || t.status === 'overdue') && !onIt.some((e) => e.userId === t.assignedTo))
    .forEach((t) => {
      const group = offShift.find((g) => g.userId === t.assignedTo);
      if (group) group.count += 1;
      else offShift.push({ userId: t.assignedTo, name: t.assignedToName ?? 'Someone', count: 1 });
    });

  // Everyone active who isn't on this shift yet, free people first, with a short note
  const available = caregivers
    .filter((c) => c.status === 'active' && !onIt.some((e) => e.userId === c.id))
    .map((c) => {
      const today = entryOf(c.id, date);
      const notes = [today ? `On ${shiftLabel(today.shift)}, will be moved` : 'Free that day'];
      // Back-to-back: a Night shift ends at 6:00 AM, when the Morning shift starts
      if (shift.id === 'morning' && entryOf(c.id, addDays(date, -1))?.shift === 'Night') notes.push('works Night before');
      if (shift.id === 'night' && entryOf(c.id, addDays(date, 1))?.shift === 'Morning') notes.push('works Morning after');
      return { caregiver: c, busy: !!today, note: notes.join(', ') };
    })
    .sort((a, b) => a.busy - b.busy || a.caregiver.name.localeCompare(b.caregiver.name));
  const [chosenId, setChosenId] = useState('');
  // The dropdown starts on the first free person (and follows the list when the shift changes)
  const chosen = available.find((a) => String(a.caregiver.id) === chosenId) ?? available[0];

  const shownTasks = allTasks ? tasks : tasks.slice(0, MAX_TASKS);

  return (
    <div className="slot-panel">
      <p className="small-label">Selected shift</p>
      {showTitle && <h2 className="day-panel__title">{dayLabel(date)} · {shift.label}</h2>}
      <p className="day-panel__shift-line">
        {shiftTime(shift)} · {plural(taskCount, 'task')} planned
      </p>

      <div className="segmented slot-panel__shifts" role="group" aria-label="Shift">
        {SHIFTS.map((s) => (
          <button key={s.id} type="button" className="segmented__btn" aria-pressed={s.id === shift.id} onClick={() => onSelectShift(s)}>
            {s.label}
          </button>
        ))}
      </div>

      {onIt.length === 0 ? (
        <div className="alert alert--error" role="status">
          <CircleAlert size={18} aria-hidden="true" />
          <span>No caregiver is on this shift yet.</span>
        </div>
      ) : (
        <section className="slot-panel__section">
          <h3 className="small-label">On this shift</h3>
          <ul className="slot-panel__list">
            {onIt.map((e) => (
              <li key={e.userId}>
                <Avatar name={e.userName} photo={caregivers.find((c) => c.id === e.userId)?.photoUrl} size={34} />
                <span className="assign__who"><strong>{e.userName}</strong></span>
                <button
                  type="button"
                  className="btn btn--outline btn--sm btn--compact"
                  disabled={busyId === e.userId}
                  onClick={() => onDayOff(e)}
                  aria-label={`Give ${e.userName} the day off`}
                >
                  {busyId === e.userId ? 'Saving…' : 'Day off'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="slot-panel__section">
        <h3 className="small-label">Tasks on this shift</h3>
        {tasksLoading ? (
          <p className="staff-details__empty">Loading tasks…</p>
        ) : taskCount === 0 ? (
          <p className="staff-details__empty">No tasks on this shift.</p>
        ) : (
          <>
            {offShift.map((g) => {
              const person = caregivers.find((c) => c.id === g.userId);
              const first = g.name.split(' ')[0];
              return (
                <div key={g.userId} className="slot-warn" role="status">
                  <p className="slot-warn__text">
                    <TriangleAlert size={16} aria-hidden="true" />
                    <span>{first} isn’t on this shift · {plural(g.count, 'task')}</span>
                  </p>
                  <div className="slot-warn__actions">
                    {person && (
                      <button
                        type="button"
                        className="btn btn--primary btn--sm btn--compact"
                        disabled={busyId === person.id}
                        onClick={() => onAssign(person)}
                        aria-label={`Add ${g.name} to the ${shift.label} shift`}
                      >
                        {busyId === person.id ? 'Saving…' : 'Add to shift'}
                      </button>
                    )}
                    <Link to={`/admin/tasks?date=${date}&problem=offshift`} className="slot-warn__link" aria-label={`View ${first}'s tasks in Tasks & Care`}>
                      View tasks
                    </Link>
                  </div>
                </div>
              );
            })}
            <ul className="slot-tasks" id="slot-tasks">
              {shownTasks.map((t) => (
                <li key={t.id}>
                  <Link to={`/admin/tasks?date=${isoDay(t.dueAt)}&open=${t.id}`} className="slot-tasks__row">
                    <span className="slot-tasks__line">
                      <span className="slot-tasks__time">{formatTime(t.dueAt)}</span>
                      <strong className="slot-tasks__name">{t.task}</strong>
                      <span className={`slot-tasks__dot slot-tasks__dot--${t.status}`} title={STATUS_WORD[t.status]} />
                      <span className="sr-only">, {STATUS_WORD[t.status]}</span>
                    </span>
                    {t.resident && <small className="slot-tasks__resident">{t.resident}</small>}
                  </Link>
                </li>
              ))}
            </ul>
            {taskCount > MAX_TASKS && (
              <button type="button" className="link-btn card-more" aria-expanded={allTasks} aria-controls="slot-tasks" onClick={() => setAllTasks(!allTasks)}>
                {allTasks ? 'Show fewer' : `Show all ${taskCount} tasks`}
              </button>
            )}
          </>
        )}
      </section>

      {/* Add someone: one dropdown instead of a long list */}
      <section className="slot-panel__section">
        <label htmlFor="slot-add" className="small-label">Add a caregiver</label>
        {available.length === 0 ? (
          <p className="staff-details__empty">Every active caregiver is already on this shift.</p>
        ) : (
          <div className="slot-add">
            <select id="slot-add" className="field__input select" value={String(chosen.caregiver.id)} onChange={(e) => setChosenId(e.target.value)}>
              {available.map(({ caregiver: c, note }) => (
                <option key={c.id} value={String(c.id)}>{c.name} · {note}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--primary slot-add__btn"
              disabled={busyId === chosen.caregiver.id}
              onClick={() => onAssign(chosen.caregiver)}
              aria-label={`Assign ${chosen.caregiver.name} to the ${shift.label} shift`}
            >
              {busyId === chosen.caregiver.id ? 'Saving…' : 'Assign'}
            </button>
          </div>
        )}
        <p className="field__hint slot-panel__hint">The caregiver gets a notification when their shift changes.</p>
      </section>
    </div>
  );
}
