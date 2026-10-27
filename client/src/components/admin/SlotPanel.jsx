import { CircleAlert } from 'lucide-react';
import Avatar from '../Avatar';
import { SHIFTS, shiftTime, shiftLabel } from '../../constants';
import { addDays, dayLabel } from '../../utils/adminTasks';

// Everything about one shift on one day: who is on it, and who could be.
// `entries`: the roster around this day. `caregivers`: every caregiver account.
// onAssign(caregiver) puts them on this shift (moving them if they had another shift that day);
// onDayOff(entry) gives that person the day off. `busyId`: the person being saved right now.
export default function SlotPanel({ slot, entries, caregivers, taskCount, busyId, onAssign, onDayOff, onSelectShift, showTitle = true }) {
  const { date, shift } = slot;
  const entryOf = (userId, ymd) => entries.find((e) => e.userId === userId && e.shiftDate === ymd);
  const onIt = entries.filter((e) => e.shiftDate === date && e.shift === shift.apiValue);

  // Everyone active who isn't on this shift yet, free people first
  const available = caregivers
    .filter((c) => c.status === 'active' && !onIt.some((e) => e.userId === c.id))
    .map((c) => {
      const today = entryOf(c.id, date);
      const notes = [today ? `On ${shiftLabel(today.shift)} that day, will be moved` : 'Free that day'];
      // Back-to-back: a Night shift ends at 6:00 AM, when the Morning shift starts
      if (shift.id === 'morning' && entryOf(c.id, addDays(date, -1))?.shift === 'Night') notes.push('works the Night shift before');
      if (shift.id === 'night' && entryOf(c.id, addDays(date, 1))?.shift === 'Morning') notes.push('works Morning right after');
      return { caregiver: c, busy: !!today, note: notes.join(' · ') };
    })
    .sort((a, b) => a.busy - b.busy || a.caregiver.name.localeCompare(b.caregiver.name));

  return (
    <div className="slot-panel">
      <p className="small-label">Selected shift</p>
      {showTitle && <h2 className="day-panel__title">{dayLabel(date)} · {shift.label}</h2>}
      <p className="day-panel__shift-line">
        {shiftTime(shift)} · {taskCount} {taskCount === 1 ? 'task' : 'tasks'} planned
      </p>

      <div className="segmented slot-panel__shifts" role="group" aria-label="Shift">
        {SHIFTS.map((s) => (
          <button key={s.id} type="button" className="segmented__btn" aria-pressed={s.id === shift.id} onClick={() => onSelectShift(s)}>
            {s.label}
          </button>
        ))}
      </div>

      {onIt.length === 0 && (
        <div className="alert alert--error" role="status">
          <CircleAlert size={18} aria-hidden="true" />
          <span>No caregiver is on this shift yet.</span>
        </div>
      )}

      {onIt.length > 0 && (
        <section className="slot-panel__section">
          <h3 className="small-label">On this shift</h3>
          <ul className="slot-panel__list">
            {onIt.map((e) => (
              <li key={e.userId}>
                <Avatar name={e.userName} size={34} />
                <span className="assign__who"><strong>{e.userName}</strong></span>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
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
        <h3 className="small-label">Available caregivers</h3>
        {available.length === 0 ? (
          <p className="staff-details__empty">Every active caregiver is already on this shift.</p>
        ) : (
          <ul className="slot-panel__list">
            {available.map(({ caregiver: c, note }) => (
              <li key={c.id}>
                <Avatar name={c.name} photo={c.photoUrl} size={34} />
                <span className="assign__who">
                  <strong>{c.name}</strong>
                  <small>{note}</small>
                </span>
                <button
                  type="button"
                  className="btn btn--soft btn--sm"
                  disabled={busyId === c.id}
                  onClick={() => onAssign(c)}
                  aria-label={`Assign ${c.name} to the ${shift.label} shift`}
                >
                  {busyId === c.id ? 'Saving…' : 'Assign'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="field__hint slot-panel__hint">The caregiver gets a notification when their shift changes.</p>
      </section>
    </div>
  );
}
