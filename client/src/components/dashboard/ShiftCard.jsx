import { Link } from 'react-router-dom';
import { shiftTime } from '../../constants';
import { minutesToText } from '../../utils/shift';

// What to say about today's handover, depending on where we are in the shift
function handoverNote(phase, submitted, shift, minutesLeft) {
  if (submitted) return { text: 'Handover submitted', tone: 'completed' };
  if (phase === 'on') return { text: `Handover due in ${minutesToText(minutesLeft)}`, tone: 'pending', write: true };
  if (phase === 'ended') return { text: 'Handover not submitted yet', tone: 'overdue', write: true };
  return { text: `Handover due at ${shift.end}`, tone: 'neutral' };
}

// My shift today, with the handover reminder. No shift in the roster today = a day off,
// and then there is no handover to remind about.
export default function ShiftCard({ shift, phase, submitted, minutesLeft }) {
  const note = shift && handoverNote(phase, submitted, shift, minutesLeft);

  return (
    <section className="card dash-card shift-card">
      <p className="small-label">Your shift</p>
      <p className="dash-card__big">{shift ? shift.label : 'Day off today'}</p>
      <p className="dash-card__sub">{shift ? shiftTime(shift) : 'No shift in the roster today. Rest well.'}</p>

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
