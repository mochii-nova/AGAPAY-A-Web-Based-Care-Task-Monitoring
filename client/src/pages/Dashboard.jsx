import { useState } from 'react';
import { Info } from 'lucide-react';
import useTasks from '../hooks/useTasks';
import useShifts from '../hooks/useShifts';
import useResidents from '../hooks/useResidents';
import useNow from '../hooks/useNow';
import { useProfile } from '../context/ProfileContext';
import { useHandovers } from '../context/HandoverContext';
import { useToast } from '../context/ToastContext';
import { findMyShiftHandover } from '../utils/handover';
import { shiftLabel } from '../constants';
import { isToday } from '../utils/tasks';
import { shiftWindow, shiftPhase } from '../utils/shift';
import { LoadingState, ErrorState } from '../components/StateMessage';
import ProgressCard from '../components/dashboard/ProgressCard';
import ShiftCard from '../components/dashboard/ShiftCard';
import QuoteCard from '../components/dashboard/QuoteCard';
import NextTasksCard from '../components/dashboard/NextTasksCard';
import RecentHandoverCard from '../components/dashboard/RecentHandoverCard';
import ResidentsCard from '../components/dashboard/ResidentsCard';
import '../styles/dashboard.css';

const QUOTES = [
  'Every small act of care adds up to a good day.',
  'Care is better when it’s shared.',
  'A kind word is part of good care, too.',
  'You make someone’s day a little easier.',
];

function greeting(now) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// One helpful line under the greeting
function helpfulLine(phase, shift, left) {
  const tasks = `${left} ${left === 1 ? 'task' : 'tasks'}`;
  if (phase === 'off') return 'You have the day off today. Rest well.';
  if (phase === 'ended') return left ? `Your shift has ended. ${tasks} still open today.` : 'Your shift has ended. Thank you for today.';
  if (!left) return 'All of today’s tasks are done. Great work.';
  return `You have ${tasks} left before your handover at ${shift.end}.`;
}

export default function Dashboard() {
  const { profile } = useProfile();
  const now = useNow();
  const showToast = useToast();
  const tasksQuery = useTasks();
  const shiftsQuery = useShifts(now, now);
  const residentsQuery = useResidents();
  const handoversQuery = useHandovers();
  const [marking, setMarking] = useState(false);

  // My shift today, from the roster. null = day off.
  const shift = shiftsQuery.shiftOn(now);
  const shiftTimes = shift ? shiftWindow(shift, now) : { start: now, end: now };
  const phase = shift ? shiftPhase(shiftTimes, now) : 'off';
  const minutesLeft = (shiftTimes.end - now) / 60000;

  const todayTasks = tasksQuery.tasks.filter((t) => isToday(t.dueAt, now));
  const left = todayTasks.filter((t) => t.status === 'pending' || t.status === 'overdue').length;

  const { handovers, acknowledge } = handoversQuery;
  const latestHandover = handovers.find((h) => h.author?._id !== profile.id);
  const submitted = !!shift && !!findMyShiftHandover(handovers, profile.id, shift, shiftTimes);

  // Resident status from the latest handover someone else wrote ("Watch", "Urgent")
  const statusOf = (name) => latestHandover?.data?.residents.find((r) => r.name === name)?.status;

  const markRead = async () => {
    setMarking(true);
    try {
      await acknowledge(latestHandover._id);
      showToast(`Marked the ${shiftLabel(latestHandover.shift)} shift handover as read.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't mark it as read. Please try again.", 'error');
    } finally {
      setMarking(false);
    }
  };

  const quote = QUOTES[now.getDate() % QUOTES.length];
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const ready = tasksQuery.status === 'ready' && shiftsQuery.status === 'ready';

  return (
    <div className="dashboard">
      <header className="page-header dash-greeting">
        <div>
          <h1>{greeting(now)}, {profile.name.split(' ')[0]}.</h1>
          {ready && <p className="page-header__subtitle">{helpfulLine(phase, shift, left)}</p>}
        </div>
        <p className="dash-greeting__date">{today}</p>
      </header>

      {/* TODO (phase 4): handovers still fall back to samples when the server is off */}
      {handoversQuery.usingSample && (
        <div className="alert alert--info" role="status">
          <Info size={18} aria-hidden="true" />
          <span>Preview mode: the server isn't running, so you're seeing sample handovers.</span>
        </div>
      )}

      {/* Row 1: progress, shift, a warm note */}
      <div className="dash-row dash-row--three">
        {tasksQuery.status === 'ready' ? (
          <ProgressCard tasks={todayTasks} />
        ) : (
          <section className="card">
            {tasksQuery.status === 'loading' ? (
              <LoadingState label="Loading today's tasks…" />
            ) : (
              <ErrorState message={tasksQuery.error} onRetry={tasksQuery.reload} />
            )}
          </section>
        )}
        {shiftsQuery.status === 'ready' ? (
          <ShiftCard shift={shift} phase={phase} submitted={submitted} minutesLeft={minutesLeft} />
        ) : (
          <section className="card">
            {shiftsQuery.status === 'loading' ? (
              <LoadingState label="Loading your shift…" />
            ) : (
              <ErrorState message={shiftsQuery.error} onRetry={shiftsQuery.reload} />
            )}
          </section>
        )}
        <QuoteCard quote={quote} />
      </div>

      {/* Row 2: what's next, and the last shift's note */}
      <div className="dash-row dash-row--main">
        {tasksQuery.status === 'ready' ? (
          <NextTasksCard tasks={todayTasks} />
        ) : (
          <section className="card" aria-hidden="true" />
        )}

        {handoversQuery.status === 'ready' ? (
          <RecentHandoverCard handover={latestHandover} onMarkRead={markRead} busy={marking} />
        ) : (
          <section className="card">
            {handoversQuery.status === 'loading' ? (
              <LoadingState label="Loading handovers…" />
            ) : (
              <ErrorState message={handoversQuery.error} onRetry={handoversQuery.reload} />
            )}
          </section>
        )}
      </div>

      {residentsQuery.status === 'ready' && <ResidentsCard residents={residentsQuery.residents} statusOf={statusOf} />}
      {residentsQuery.status === 'error' && (
        <section className="card">
          <ErrorState message={residentsQuery.error} onRetry={residentsQuery.reload} />
        </section>
      )}
    </div>
  );
}
