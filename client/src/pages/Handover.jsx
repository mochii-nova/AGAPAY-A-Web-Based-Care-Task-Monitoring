import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarOff, Inbox, History, CircleCheck } from 'lucide-react';
import { useHandovers } from '../context/HandoverContext';
import { useToast } from '../context/ToastContext';
import useTasks from '../hooks/useTasks';
import useNow from '../hooks/useNow';
import { sampleResidents, sampleShiftOn } from '../data/sample';
import { useProfile } from '../context/ProfileContext';
import { draftKeyFor, loadDraft } from '../data/handoverDraft';
import { SHIFTS, shiftLabel, shiftTime } from '../constants';
import { shiftWindow, shiftPhase } from '../utils/shift';
import { formatTime } from '../utils/format';
import { dayKey } from '../utils/calendar';
import { SAVED_TEXT } from '../utils/tasks';
import { handoverTiming, findMyShiftHandover, nextShift } from '../utils/handover';
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

// Header of a submitted handover (Received, History and "submitted" views)
function HandoverHead({ handover, isMine }) {
  const timing = handoverTiming(handover);
  return (
    <div className="received__head">
      <div>
        <h3>From {shiftLabel(handover.shift)} shift{isMine && ' (you)'}</h3>
        <p className="received__meta">
          {handover.author?.name} · submitted {when(handover.createdAt)}
          {timing && <> · <span className={`timing ${timing.late ? 'timing--late' : ''}`}>{timing.label}</span></>}
        </p>
      </div>
      <span className={`status-pill status-pill--${handover.acknowledgedBy ? 'completed' : 'overdue'}`}>
        {handover.acknowledgedBy ? 'Read' : 'Not yet read'}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [openTaskId, setOpenTaskId] = useState(null);

  const tab = ['received', 'history'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'write';
  const setTab = (id) => setSearchParams(id === 'write' ? {} : { tab: id }, { replace: true });

  // My shift today (sample roster until the backend has shifts). null = day off.
  const shift = SHIFTS.find((s) => s.apiValue === sampleShiftOn(now)) ?? null;
  const shiftTimes = shift ? shiftWindow(shift, now) : null;
  const next = shift ? nextShift(shift) : null;

  // My tasks in this shift's hours. TODO: only tasks assigned to me, once the backend has that.
  const shiftTasks = shiftTimes
    ? tasks
        .filter((t) => new Date(t.dueAt) >= shiftTimes.start && new Date(t.dueAt) < shiftTimes.end)
        .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    : [];
  const residentsCared = [...new Set(shiftTasks.map((t) => t.resident))].map((name) => ({
    name,
    room: sampleResidents.find((r) => r.name === name)?.room,
  }));

  const myHandover = shiftTimes ? findMyShiftHandover(handovers, profile.id, shift, shiftTimes) : null;
  const received = handovers.filter((h) => h.author?._id !== profile.id);
  const unread = received.filter((h) => !h.acknowledgedBy);

  const draftKey = shiftTimes ? draftKeyFor(profile.id, shift.id, dayKey(shiftTimes.start)) : null;
  const [draftSavedAt, setDraftSavedAt] = useState(() => loadDraft(draftKey)?.savedAt ?? null);

  const statusPill = (() => {
    if (!shift) return { label: 'Day off', tone: 'skipped' };
    if (myHandover) return { label: `Submitted · ${formatTime(myHandover.createdAt)}`, tone: 'completed' };
    if (shiftPhase(shiftTimes, now) === 'ended') return { label: `Late · was due ${shift.end}`, tone: 'overdue' };
    if (draftSavedAt) return { label: `Draft · due by ${shift.end}`, tone: 'pending' };
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
    showToast(`${task.task} ${SAVED_TEXT[changes.status]}.`);
  };

  const TABS = [
    { id: 'write', label: 'Write Handover' },
    { id: 'received', label: unread.length ? `Received (${unread.length})` : 'Received' },
    { id: 'history', label: 'History' },
  ];

  const handoversState =
    status === 'loading' ? <LoadingState label="Loading handovers…" /> : status === 'error' ? <ErrorState message={error} onRetry={reload} /> : null;

  return (
    <div>
      <PageHeader title="Shift Handover" subtitle="Tell the next caregiver what happened and what still needs attention.">
        <div className="tabs tabs--header" role="tablist" aria-label="Handover sections">
          {TABS.map(({ id, label }) => (
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
                {!shift ? (
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
                    key={draftKey}
                    shift={shift}
                    next={next}
                    dateLabel={longDate(shiftTimes.start)}
                    shiftTasks={shiftTasks}
                    residents={residentsCared}
                    draftKey={draftKey}
                    onOpenTask={(t) => setOpenTaskId(t._id)}
                    onDraftSaved={setDraftSavedAt}
                    onSubmitted={() => setDraftSavedAt(null)}
                  />
                )}
              </div>

              <aside className="handover-aside" aria-label="Recent handovers">
                {handoversState ? (
                  <div className="card">{handoversState}</div>
                ) : (
                  <>
                    <LastShiftCard handover={received[0]} onAcknowledge={handleAcknowledge} />
                    <RecentHandovers handovers={handovers} myId={profile.id} onViewAll={() => setTab('history')} />
                  </>
                )}
                <div className="handover-tip">
                  <p className="handover-tip__title">Before you submit</p>
                  <p>Overdue tasks must be marked Completed or Skipped (with a reason). Submitting does not mark anything as done.</p>
                </div>
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
                  {!h.acknowledgedBy && (
                    <div className="received__actions">
                      <button type="button" className="btn btn--soft" onClick={() => handleAcknowledge(h)}>Mark as Read</button>
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

      <TaskDetailModal
        task={openTask}
        residentRoom={openTask && sampleResidents.find((r) => r.name === openTask.resident)?.room}
        onSave={handleSaveTask}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  );
}
