import { useState } from 'react';
import useTasks from '../hooks/useTasks';
import useShifts from '../hooks/useShifts';
import useResidents from '../hooks/useResidents';
import useNow from '../hooks/useNow';
import { useProfile } from '../context/ProfileContext';
import { useHandovers } from '../context/HandoverContext';
import { useToast } from '../context/ToastContext';
import { findMyShiftHandover, latestUpdate, handoverForMe, isRecentHandover } from '../utils/handover';
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
import PushPrompt from '../components/PushPrompt';
import StartHere from '../components/StartHere';
import { formatTime } from '../utils/format';
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
    return `You have ${count(left)} left before your ${shift.end} handover.`;
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
  // Only the handover for my shift today (from the shift right before it). Never an older one or
  // tomorrow's; on a day off there is none (then the card says there's none yet).
  const latestHandover = current
    ? handoverForMe(handovers, profile.id, [{ shift: current.shift.apiValue, shiftDate: current.shiftDate }])
    : undefined;
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

  // "Start here": the one thing that matters most right now, in this order:
  // an unread handover, then overdue tasks, then the next task, else a friendly line
  const startHere = (() => {
    // (only an unread one from the last 24 hours, so an old one never keeps asking)
    if (latestHandover && !latestHandover.readByMe && isRecentHandover(latestHandover, now)) {
      const first = latestHandover.author?.name?.split(' ')[0];
      const which = `${shiftLabel(latestHandover.shift).toLowerCase()} handover`;
      return {
        // "Ben's night handover is ready."
        text: `${first ? `${first}'s ${which}` : `The ${which}`} is ready. Read it before you start.`,
        action: { label: first ? `Read ${first}'s handover` : 'Read the handover', to: '/handover?tab=received' },
      };
    }
    const overdueCount = overdueToday.length + earlierOverdue;
    if (overdueCount) {
      return {
        text: 'Some tasks are past their time. Do them first, or skip them with a reason.',
        action: { label: `Do your ${overdueCount} overdue ${overdueCount === 1 ? 'task' : 'tasks'}`, to: '/tasks?tab=overdue' },
      };
    }
    const next = todayTasks.filter((t) => t.status === 'pending').sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];
    if (next) {
      return {
        text: 'You’re on track. Here’s what comes next.',
        action: { label: `Next: ${next.task} at ${formatTime(next.dueAt)}`, to: `/tasks?open=${next._id}` },
      };
    }
    if (phase === 'off') return { text: 'You have the day off today. Rest well, nothing needs you right now.', action: null };
    return { text: 'No tasks waiting for you right now. Nice work.', action: null };
  })();

  return (
    <div className="dashboard">
      <header className="page-header dash-greeting">
        <div>
          <h1>{greeting(now)}, {profile.name.split(' ')[0]}.</h1>
          {ready && <p className="page-header__subtitle">{helpfulLine(phase, shift, todayTasks.length, left, earlierOverdue)}</p>}
        </div>
        <p className="dash-greeting__date">{today}</p>
      </header>

      {ready && handoversQuery.status === 'ready' && <StartHere {...startHere} />}

      <PushPrompt />

      {/* On the 12-column grid. Row 1, the stat cards: progress, shift, handover status (4 + 4 + 4) */}
      <div className="dash-grid dash-grid--tiles">
        <div className="span-4">
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
        </div>
        <div className="span-4">
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
        </div>
        <div className="span-4">
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
      </div>

      {/* Row 2: what's next (8) and priority alerts (4), the same height */}
      <div className="dash-grid">
        <div className="span-8">
          {tasksQuery.status === 'ready' ? (
            <NextTasksCard tasks={todayTasks} earlierOverdue={earlierOverdue} />
          ) : (
            <section className="card" aria-hidden="true" />
          )}
        </div>
        <div className="span-4">
          {tasksQuery.status === 'ready' ? (
            <PriorityAlertsCard flagged={flagged} overdueToday={overdueToday} earlierOverdue={earlierOverdue} />
          ) : (
            <section className="card" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Row 3: my residents, full width */}
      {residentsQuery.status === 'ready' && <ResidentsCard residents={residentsQuery.residents} statusOf={statusOf} />}
      {residentsQuery.status === 'error' && (
        <section className="card">
          <ErrorState message={residentsQuery.error} onRetry={residentsQuery.reload} />
        </section>
      )}
    </div>
  );
}
