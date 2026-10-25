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

// My shift today (or a day off), with the handover reminder
export default function ShiftCard({ shift, phase, submitted, minutesLeft }) {
  const note = shift && handoverNote(phase, submitted, shift, minutesLeft);

  return (
    <section className="card shift-card">
      <p className="small-label">Your shift</p>
      <p className="shift-card__name">{shift ? shift.label : 'Day off'}</p>
      <p className="shift-card__time">{shift ? shiftTime(shift) : 'Enjoy your rest day.'}</p>

      {note && (
        <div className={`shift-card__note shift-card__note--${note.tone}`} role={note.tone === 'pending' ? 'status' : undefined}>
          <span>{note.text}</span>
          {note.write && <Link to="/handover">Write</Link>}
        </div>
      )}
    </section>
  );
}
