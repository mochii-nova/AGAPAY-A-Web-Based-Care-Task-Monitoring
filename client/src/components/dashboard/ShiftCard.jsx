import { CalendarDays } from 'lucide-react';
import CardHeader from '../CardHeader';
import TaskCategoryIcon from '../TaskCategoryIcon';
import { shiftTime } from '../../constants';
import { formatTime } from '../../utils/format';

const PHASE_TEXT = {
  upcoming: { label: 'Starts soon', tone: 'skipped' },
  on: { label: 'On shift now', tone: 'completed' },
  ended: { label: 'Shift ended', tone: 'skipped' },
  off: { label: 'Day off', tone: 'skipped' },
};

// My shift for today (or a day off) and the next task coming up
export default function ShiftCard({ shift, phase, nextTask }) {
  const { label, tone } = PHASE_TEXT[phase];

  return (
    <section className="card">
      <CardHeader icon={CalendarDays} title="Today's Shift" linkTo="/schedule" />

      <div className="shift-box">
        <div>
          <p className="small-label">{shift ? `${shift.label} Shift` : 'No shift today'}</p>
          <p className="shift-box__time">{shift ? shiftTime(shift) : 'Enjoy your rest day'}</p>
        </div>
        <span className={`status-pill status-pill--${tone}`}>{label}</span>
      </div>

      <div className="upcoming-box">
        <p className="small-label">Coming up</p>
        {nextTask ? (
          <p className="upcoming-box__task">
            <TaskCategoryIcon category={nextTask.category} size={16} />
            <span>
              <strong>{nextTask.task}</strong> at {formatTime(nextTask.dueAt)}
              <small>{nextTask.resident}</small>
            </span>
          </p>
        ) : (
          <p className="upcoming-box__none">No more tasks scheduled today.</p>
        )}
      </div>
    </section>
  );
}
