import { Link } from 'react-router-dom';
import { shiftTime } from '../../constants';
import { minutesToText } from '../../utils/shift';
import { listNames } from '../../utils/handoverMonitor';

// What to say about today's handover, depending on where we are in the shift.
// During the shift: the clock time ("due at 2:00 PM"), and a countdown in the last hour ("due in 45 min").
function handoverNote(phase, submitted, shift, minutesLeft) {
  if (submitted) return { text: 'Handover submitted', tone: 'completed' };
  if (phase === 'on') {
    const text = minutesLeft <= 60 ? `Handover due in ${minutesToText(minutesLeft)}` : `Handover due at ${shift.end}`;
    return { text, tone: 'pending', write: true };
  }
  if (phase === 'ended') return { text: 'Handover not submitted yet', tone: 'overdue', write: true };
  return { text: `Handover due at ${shift.end}`, tone: 'neutral' };
}

// My shift today, with the handover reminder. No shift in the roster today = a day off,
// and then there is no handover to remind about.
// `nextUp`: { shift, names } of the next shift, or null when the server can't tell us (no line then).
export default function ShiftCard({ shift, phase, submitted, minutesLeft, nextUp }) {
  const note = shift && handoverNote(phase, submitted, shift, minutesLeft);

  return (
    <section className="card dash-card shift-card">
      <p className="small-label">Your shift</p>
      <p className="dash-card__big">{shift ? shift.label : 'Day off today'}</p>
      <p className="dash-card__sub">{shift ? shiftTime(shift) : 'No shift in the roster today. Rest well.'}</p>
      {shift && nextUp && (
        <p className="dash-card__sub shift-card__next">
          {nextUp.names.length ? `Next shift: ${listNames(nextUp.names)}, from ${nextUp.shift.start}` : 'Next shift: no one scheduled yet'}
        </p>
      )}

      {note ? (
        <div className={`dash-card__foot shift-card__note shift-card__note--${note.tone}`} role={note.tone === 'pending' ? 'status' : undefined}>
          <span>{note.text}</span>
          {note.write && <Link to="/handover">Write</Link>}
        </div>
      ) : (
        // Day off: no handover to remind about, just the way to the schedule
        <div className="dash-card__foot">
          <span className="dash-card__sub">No handover due today</span>
          <Link to="/schedule" className="card__link">My schedule</Link>
        </div>
      )}
    </section>
  );
}
