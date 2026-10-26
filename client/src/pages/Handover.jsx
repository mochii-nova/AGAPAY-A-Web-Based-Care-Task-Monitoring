import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarOff, Inbox, History, CircleCheck } from 'lucide-react';
import { useHandovers } from '../context/HandoverContext';
import { useToast } from '../context/ToastContext';
import useTasks from '../hooks/useTasks';
import useShifts from '../hooks/useShifts';
import useResidents from '../hooks/useResidents';
import useApiData from '../hooks/useApiData';
import useNow from '../hooks/useNow';
import { useProfile } from '../context/ProfileContext';
import { shiftLabel, shiftTime } from '../constants';
import { shiftPhase } from '../utils/shift';
import { formatTime } from '../utils/format';
import { addDays } from '../utils/calendar';
import { savedText } from '../utils/tasks';
import { handoverTiming, findMyShiftHandover, nextShift, readersOf } from '../utils/handover';
import PageHeader from '../components/PageHeader';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import WriteHandover from '../components/handover/WriteHandover';
import HandoverView from '../components/handover/HandoverView';
import LastShiftCard from '../components/handover/LastShiftCard';
import RecentHandovers from '../components/handover/RecentHandovers';
import { LoadingState, ErrorState, EmptyState } from '../components/StateMessage';
import '../styles/handover.css';

const longDate = (date) =>
  date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
const when = (date) =>
  `${formatTime(date)}, ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

const firstNames = (people) => people.map((p) => p.name.split(' ')[0]).join(', ');

// Header of a submitted handover (Received, History and "submitted" views).
// My own handovers show who has read them; others show whether I have.
function HandoverHead({ handover, isMine }) {
  const timing = handoverTiming(handover);
  const readers = readersOf(handover);
  const read = isMine ? readers.length > 0 : handover.readByMe;
  return (
    <div className="received__head">
      <div>
        <h3>From the {shiftLabel(handover.shift).toLowerCase()} shift{isMine && ' (you)'}</h3>
        <p className="received__meta">
          {handover.author?.name} · submitted {when(handover.createdAt)}
          {timing && <> · <span className={`timing ${timing.late ? 'timing--late' : ''}`}>{timing.label}</span></>}
        </p>
      </div>
      <span className={`status-pill status-pill--${read ? 'completed' : 'new'}`}>
        {isMine ? (read ? `Read by ${firstNames(readers)}` : 'Not yet read') : read ? 'Read' : 'Not yet read'}
      </span>
    </div>
  );
}

export default function Handover() {
  const { profile } = useProfile();
  const now = useNow();
  const showToast = useToast();
  const { tasks, status: tasksStatus, error: tasksError, reload: reloadTasks, updateTask } = useTasks();
  const { handovers, status, error, reload, acknowledge } = useHandovers();
  const { residents: assigned, status: residentsStatus } = useResidents();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openTaskId, setOpenTaskId] = useState(null);

  const tab = ['received', 'history'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'write';
  const setTab = (id) => setSearchParams(id === 'write' ? {} : { tab: id }, { replace: true });

  // My shift now, from the roster (last night's Night shift counts until it ends). null = day off.
  const shiftsQuery = useShifts(addDays(now, -1), now);
  const current = shiftsQuery.currentShift(now);
  const shift = current?.shift ?? null;
  const shiftTimes = current?.times ?? null;
  const shiftDate = current?.shiftDate ?? null;
  const next = shift ? nextShift(shift) : null;

  // My tasks in this shift's hours, and the residents they are for
  const shiftTasks = shiftTimes
    ? tasks
        .filter((t) => new Date(t.dueAt) >= shiftTimes.start && new Date(t.dueAt) < shiftTimes.end)
        .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    : [];
  // Residents to update: everyone assigned to me, plus anyone else I had a task for
  const residentsCared = [
    ...new Map([
      ...assigned.map((r) => [r.id, { id: r.id, name: r.name, room: r.room }]),
      ...shiftTasks.filter((t) => t.residentId).map((t) => [t.residentId, { id: t.residentId, name: t.resident, room: t.room }]),
    ]).values(),
  ].sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));

  const myHandover = shiftTimes ? findMyShiftHandover(handovers, profile.id, shift, shiftTimes, shiftDate) : null;
  const received = handovers.filter((h) => h.author?._id !== profile.id);
  const unread = received.filter((h) => !h.readByMe);

  // My unfinished handover, saved in the database (null if there is none)
  const draftQuery = useApiData('/handovers/draft');
  const savedDraft = draftQuery.data;
  const draftForThisShift = !!savedDraft && savedDraft.shift === shift?.apiValue && savedDraft.shiftDate === shiftDate;
  const [draftSavedNow, setDraftSavedNow] = useState(false);
  const hasDraft = draftSavedNow || draftForThisShift;

  const statusPill = (() => {
    if (!shift) return { label: 'Day off', tone: 'skipped' };
    if (myHandover) return { label: `Submitted · ${formatTime(myHandover.createdAt)}`, tone: 'completed' };
    if (shiftPhase(shiftTimes, now) === 'ended') return { label: `Late · was due ${shift.end}`, tone: 'overdue' };
    if (hasDraft) return { label: `Draft · due by ${shift.end}`, tone: 'pending' };
    return { label: `Not started · due by ${shift.end}`, tone: 'skipped' };
  })();

  const handleAcknowledge = async (h) => {
    try {
      await acknowledge(h._id);
      showToast(`Marked the ${shiftLabel(h.shift)} shift handover as read.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't mark it as read. Please try again.", 'error');
    }
  };

  const openTask = tasks.find((t) => t._id === openTaskId) ?? null;
  const handleSaveTask = async (task, changes) => {
    await updateTask(task, changes);
    setOpenTaskId(null);
    showToast(savedText(task, changes));
  };

  const TABS = [
    { id: 'write', label: 'Write' },
    { id: 'received', label: 'Received', count: unread.length },
    { id: 'history', label: 'History' },
  ];

  const handoversState =
    status === 'loading' ? <LoadingState label="Loading handovers…" /> : status === 'error' ? <ErrorState message={error} onRetry={reload} /> : null;

  return (
    <div>
      <PageHeader title="Shift handover" subtitle="Tell the next caregiver what happened and what still needs care.">
        <div className="tabs tabs--header" role="tablist" aria-label="Handover sections">
          {TABS.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`htab-${id}`}
              aria-selected={tab === id}
              aria-controls="handover-panel"
              className="tab"
              onClick={() => setTab(id)}
            >
              {label}
              {count > 0 && <span className="tabs__new"> · {count}<span className="sr-only"> unread</span></span>}
            </button>
          ))}
        </div>
      </PageHeader>

      <div id="handover-panel" role="tabpanel" aria-labelledby={`htab-${tab}`}>
        {tab === 'write' && (
          <>
            <div className="card shift-strip">
              <div>
                <p className="small-label">Your shift</p>
                <p className="shift-strip__value">{shift ? `${shift.label} · ${shiftTime(shift)}` : 'No shift today'}</p>
              </div>
              <div>
                <p className="small-label">Date</p>
                <p className="shift-strip__value">{longDate(shiftTimes?.start ?? now)}</p>
              </div>
              <div>
                <p className="small-label">Handing over to</p>
                <p className="shift-strip__value">{next ? `${next.label} shift caregiver` : '—'}</p>
              </div>
              <span className={`status-pill status-pill--${statusPill.tone}`}>{statusPill.label}</span>
            </div>

            <div className="handover-layout">
              <div className="handover-main">
                {shiftsQuery.status === 'loading' || draftQuery.status === 'loading' || residentsStatus === 'loading' ? (
                  <div className="card"><LoadingState label="Loading your shift…" /></div>
                ) : shiftsQuery.status === 'error' ? (
                  <div className="card"><ErrorState message={shiftsQuery.error} onRetry={shiftsQuery.reload} /></div>
                ) : !shift ? (
                  <div className="card"><EmptyState icon={CalendarOff}>You have no shift today, so there's nothing to hand over.</EmptyState></div>
                ) : myHandover ? (
                  <section className="card received">
                    <p className="submitted-note">
                      <CircleCheck size={18} aria-hidden="true" /> Your handover for this shift was submitted. You can find it in History.
                    </p>
                    <HandoverHead handover={myHandover} isMine />
                    <HandoverView handover={myHandover} />
                  </section>
                ) : tasksStatus === 'loading' ? (
                  <div className="card"><LoadingState label="Loading your tasks…" /></div>
                ) : tasksStatus === 'error' ? (
                  <div className="card"><ErrorState message={tasksError} onRetry={reloadTasks} /></div>
                ) : (
                  <WriteHandover
                    key={`${shiftDate}-${shift.id}`}
                    shift={shift}
                    shiftDate={shiftDate}
                    next={next}
                    shiftTasks={shiftTasks}
                    residents={residentsCared}
                    draft={savedDraft}
                    onOpenTask={(t) => setOpenTaskId(t._id)}
                    onDraftSaved={setDraftSavedNow}
                    onSubmitted={() => {
                      setDraftSavedNow(false);
                      draftQuery.reload({ silent: true });
                    }}
                  />
                )}
              </div>

              <aside className="handover-aside" aria-label="Recent handovers">
                {handoversState ? (
                  <div className="card">{handoversState}</div>
                ) : (
                  <>
                    <LastShiftCard handover={received[0]} myId={profile.id} onAcknowledge={handleAcknowledge} />
                    <RecentHandovers handovers={handovers} myId={profile.id} onViewAll={() => setTab('history')} />
                  </>
                )}
              </aside>
            </div>
          </>
        )}

        {tab === 'received' && (
          <div className="handover-feed">
            {handoversState ? (
              <div className="card">{handoversState}</div>
            ) : received.length === 0 ? (
              <div className="card"><EmptyState icon={Inbox}>No handovers from other caregivers yet.</EmptyState></div>
            ) : (
              received.map((h) => (
                <article key={h._id} className="card received">
                  <HandoverHead handover={h} />
                  <HandoverView handover={h} />
                  <p className="signature">— {h.author?.name?.split(' ')[0]}, {formatTime(h.createdAt)}</p>
                  {!h.readByMe && (
                    <div className="received__actions">
                      <button type="button" className="btn btn--soft" onClick={() => handleAcknowledge(h)}>Mark as read</button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="handover-feed">
            {handoversState ? (
              <div className="card">{handoversState}</div>
            ) : handovers.length === 0 ? (
              <div className="card"><EmptyState icon={History}>No handovers yet.</EmptyState></div>
            ) : (
              <ul className="history-list">
                {handovers.map((h) => (
                  <li key={h._id} className="card history-item">
                    <details>
                      <summary>
                        <HandoverHead handover={h} isMine={h.author?._id === profile.id} />
                      </summary>
                      <div className="history-item__body">
                        <HandoverView handover={h} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <TaskDetailModal task={openTask} onSave={handleSaveTask} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}
