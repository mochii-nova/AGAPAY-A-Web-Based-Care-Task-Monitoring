import { Link } from 'react-router-dom';
import { AlarmClock, HeartHandshake, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useApiData from '../hooks/useApiData';
import useTasks from '../hooks/useTasks';
import useNow from '../hooks/useNow';
import { getProfile, sampleResidents, sampleHandovers } from '../data/sample';
import { SHIFTS } from '../constants';
import { formatLongDate } from '../utils/format';
import { isToday } from '../utils/tasks';
import { shiftWindow, shiftPhase, minutesToText } from '../utils/shift';
import { LoadingState, ErrorState } from '../components/StateMessage';
import CareSummaryCard from '../components/dashboard/CareSummaryCard';
import NextTasksCard from '../components/dashboard/NextTasksCard';
import ShiftCard from '../components/dashboard/ShiftCard';
import RecentHandoverCard from '../components/dashboard/RecentHandoverCard';
import ResidentsCard from '../components/dashboard/ResidentsCard';
import '../styles/dashboard.css';

const QUOTES = [
  'Together, we make better days possible.',
  'Small acts of care make a big difference.',
  'Care is better when it’s shared.',
  'Every shift is a chance to brighten someone’s day.',
];

const REMIND_BEFORE_MIN = 60;

function greeting(now) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// What to show next to "Handover" in the summary card
function handoverStatus(phase, submitted, shift) {
  if (submitted) return { label: 'Submitted', tone: 'completed' };
  if (phase === 'ended') return { label: 'Not submitted', tone: 'overdue' };
  return { label: `Due at ${shift.end}`, tone: phase === 'on' ? 'pending' : 'skipped' };
}

export default function Dashboard() {
  const { user } = useAuth();
  const profile = getProfile(user);
  const now = useNow();
  const tasksQuery = useTasks();
  const handoversQuery = useApiData('/handovers', { sample: sampleHandovers });

  // My shift (sample until the backend stores each caregiver's shift)
  const shift = SHIFTS.find((s) => s.apiValue === profile.shift) ?? SHIFTS[0];
  const shiftTimes = shiftWindow(shift, now);
  const phase = shiftPhase(shiftTimes, now);
  const minutesLeft = (shiftTimes.end - now) / 60000;

  // TODO: only show tasks assigned to me once the backend has an assigned caregiver
  const todayTasks = tasksQuery.tasks.filter((t) => isToday(t.dueAt, now));
  const nextTask = todayTasks
    .filter((t) => t.status === 'pending')
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];

  const handovers = handoversQuery.data ?? [];
  const latestHandover = handovers.find((h) => h.author?._id !== profile.id);
  const submitted = handovers.some((h) => h.author?._id === profile.id && new Date(h.createdAt) >= shiftTimes.start);
  const showReminder = phase === 'on' && minutesLeft <= REMIND_BEFORE_MIN && !submitted;

  const quote = QUOTES[now.getDate() % QUOTES.length];
  const usingSample = tasksQuery.usingSample || handoversQuery.usingSample;

  return (
    <div className="dashboard">
      <header className="dash-greeting">
        <h1>{greeting(now)}, {profile.name.split(' ')[0]}!</h1>
        <p className="dash-greeting__date">{formatLongDate(now)}</p>
      </header>

      {usingSample && (
        <div className="alert alert--info" role="status">
          <Info size={20} aria-hidden="true" />
          <span>Preview mode: the server isn't running, so you're seeing sample tasks and handovers.</span>
        </div>
      )}

      {showReminder && (
        <div className="alert alert--warning dash-reminder" role="status">
          <AlarmClock size={20} aria-hidden="true" />
          <span>
            Your handover is due at <strong>{shift.end}</strong>, in {minutesToText(minutesLeft)}.
          </span>
          <Link to="/handover" className="btn btn--primary btn--sm">Write handover</Link>
        </div>
      )}

      <section className="quote-banner" aria-label="Message of the day">
        <div>
          <p className="quote-banner__quote">“{quote}”</p>
          <p className="quote-banner__sub">Your care makes a difference. Thank you for all that you do!</p>
        </div>
        <HeartHandshake size={40} className="quote-banner__icon" aria-hidden="true" />
      </section>

      <div className="dash-grid">
        <div className="dash-col">
          {tasksQuery.status === 'ready' ? (
            <>
              <CareSummaryCard
                tasks={todayTasks}
                residentCount={sampleResidents.length}
                handover={handoverStatus(phase, submitted, shift)}
              />
              <NextTasksCard tasks={todayTasks} />
            </>
          ) : (
            <section className="card">
              {tasksQuery.status === 'loading' ? (
                <LoadingState label="Loading today's tasks…" />
              ) : (
                <ErrorState message={tasksQuery.error} onRetry={tasksQuery.reload} />
              )}
            </section>
          )}
        </div>

        <div className="dash-col">
          <ShiftCard shift={shift} phase={phase} nextTask={nextTask} />

          {handoversQuery.status === 'ready' ? (
            <RecentHandoverCard handover={latestHandover} />
          ) : (
            <section className="card">
              {handoversQuery.status === 'loading' ? (
                <LoadingState label="Loading handovers…" />
              ) : (
                <ErrorState message={handoversQuery.error} onRetry={handoversQuery.reload} />
              )}
            </section>
          )}

          <ResidentsCard residents={sampleResidents} tasks={todayTasks} />
        </div>
      </div>
    </div>
  );
}
