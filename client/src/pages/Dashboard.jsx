import { useState } from 'react';
import useTasks from '../hooks/useTasks';
import useShifts from '../hooks/useShifts';
import useResidents from '../hooks/useResidents';
import useNow from '../hooks/useNow';
import { useProfile } from '../context/ProfileContext';
import { useHandovers } from '../context/HandoverContext';
import { useToast } from '../context/ToastContext';
import { findMyShiftHandover, latestUpdate } from '../utils/handover';
import { shiftLabel } from '../constants';
import { isToday } from '../utils/tasks';
import { shiftPhase } from '../utils/shift';
import { addDays } from '../utils/calendar';
import { LoadingState, ErrorState } from '../components/StateMessage';
import ProgressCard from '../components/dashboard/ProgressCard';
import ShiftCard from '../components/dashboard/ShiftCard';
import PriorityAlertsCard from '../components/dashboard/PriorityAlertsCard';
import NextTasksCard from '../components/dashboard/NextTasksCard';
import RecentHandoverCard from '../components/dashboard/RecentHandoverCard';
import ResidentsCard from '../components/dashboard/ResidentsCard';
import '../styles/dashboard.css';

function greeting(now) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// One helpful line under the greeting. "All done" only when there were tasks today and all are
// finished; earlier days' overdue tasks are mentioned too, the same as in Today's progress.
function helpfulLine(phase, shift, total, left, earlier) {
  const count = (n) => `${n} ${n === 1 ? 'task' : 'tasks'}`;
  const line = (() => {
    if (phase === 'off') return 'You have the day off today. Rest well.';
    if (total === 0) return 'No tasks scheduled for today.';
    if (phase === 'ended') return left ? `Your shift has ended. ${count(left)} still open today.` : 'Your shift has ended. Thank you for today.';
    if (!left) return 'All of today’s tasks are done. Great work.';
    return `You have ${count(left)} left before your handover at ${shift.end}.`;
  })();
  return earlier ? `${line} ${earlier} overdue from earlier days.` : line;
}

export default function Dashboard() {
  const { profile } = useProfile();
  const now = useNow();
  const showToast = useToast();
  const tasksQuery = useTasks();
  const shiftsQuery = useShifts(addDays(now, -1), now);
  const residentsQuery = useResidents();
  const handoversQuery = useHandovers();
  const [marking, setMarking] = useState(false);

  // My shift now, from the roster (last night's Night shift counts until it ends). null = day off.
  const current = shiftsQuery.currentShift(now);
  const shift = current?.shift ?? null;
  const shiftTimes = current?.times ?? { start: now, end: now };
  const phase = shift ? shiftPhase(shiftTimes, now) : 'off';
  const minutesLeft = (shiftTimes.end - now) / 60000;

  const todayTasks = tasksQuery.tasks.filter((t) => isToday(t.dueAt, now));
  const left = todayTasks.filter((t) => t.status === 'pending' || t.status === 'overdue').length;

  const { handovers, acknowledge } = handoversQuery;
  const latestHandover = handovers.find((h) => h.author?._id !== profile.id);
  const submitted = !!shift && !!findMyShiftHandover(handovers, profile.id, shift, shiftTimes, current.shiftDate);


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

  // Resident status from the latest handover someone else wrote that mentions them ("Watch", "Urgent").
  // Priority alerts and the resident tiles use the same answer.
  const fromOthers = handovers.filter((h) => h.author?._id !== profile.id);
  const statusOf = (resident) => latestUpdate(fromOthers, resident)?.update.status;
  const flagged = residentsQuery.residents
    .map((resident) => ({ resident, update: latestUpdate(fromOthers, resident)?.update }))
    .filter(({ update }) => update && update.status !== 'normal')
    .map(({ resident, update }) => ({ resident, status: update.status, note: update.note }))
    .sort((a, b) => (b.status === 'urgent') - (a.status === 'urgent'));

  // Overdue: today's ones one by one, earlier days' as one count. Today's progress and
  // Priority alerts both show this same count.
  const overdueToday = todayTasks.filter((t) => t.status === 'overdue').sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const earlierOverdue = tasksQuery.tasks.filter((t) => t.status === 'overdue' && !isToday(t.dueAt, now)).length;

  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const ready = tasksQuery.status === 'ready' && shiftsQuery.status === 'ready';

  return (
    <div className="dashboard">
      <header className="page-header dash-greeting">
        <div>
          <h1>{greeting(now)}, {profile.name.split(' ')[0]}.</h1>
          {ready && <p className="page-header__subtitle">{helpfulLine(phase, shift, todayTasks.length, left, earlierOverdue)}</p>}
        </div>
        <p className="dash-greeting__date">{today}</p>
      </header>

      {/* Row 1: three compact cards of the same height: progress, shift, handover status */}
      <div className="dash-row dash-row--three">
        {tasksQuery.status === 'ready' ? (
          <ProgressCard tasks={todayTasks} earlierOverdue={earlierOverdue} />
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
        {handoversQuery.status === 'ready' ? (
          <RecentHandoverCard handover={latestHandover} myId={profile.id} onMarkRead={markRead} busy={marking} />
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

      {/* Row 2: what's next (2/3) and priority alerts (1/3), lined up at the top */}
      <div className="dash-row dash-row--main">
        {tasksQuery.status === 'ready' ? (
          <NextTasksCard tasks={todayTasks} earlierOverdue={earlierOverdue} />
        ) : (
          <section className="card" aria-hidden="true" />
        )}
        {tasksQuery.status === 'ready' ? (
          <PriorityAlertsCard flagged={flagged} overdueToday={overdueToday} earlierOverdue={earlierOverdue} />
        ) : (
          <section className="card" aria-hidden="true" />
        )}
      </div>

      {/* Row 3 */}

      {residentsQuery.status === 'ready' && <ResidentsCard residents={residentsQuery.residents} statusOf={statusOf} />}
      {residentsQuery.status === 'error' && (
        <section className="card">
          <ErrorState message={residentsQuery.error} onRetry={residentsQuery.reload} />
        </section>
      )}
    </div>
  );
}
