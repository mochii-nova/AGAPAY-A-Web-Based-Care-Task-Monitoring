import { useEffect, useRef, useState } from 'react';
import { CircleAlert, ClipboardList, Info } from 'lucide-react';
import { useHandovers } from '../../context/HandoverContext';
import { useToast } from '../../context/ToastContext';
import { buildSummary, RESIDENT_STATUS } from '../../utils/handover';
import { formatTime } from '../../utils/format';
import StatusPill from '../StatusPill';
import Avatar from '../Avatar';
import Modal from '../Modal';
import { EmptyState } from '../StateMessage';

const QUICK_TAGS = ['Supplies', 'Family / Visitor', 'Room / Equipment'];
const EMPTY = { passOn: {}, residents: {}, other: '' };
const DEFAULT_RESIDENT = { status: 'normal', note: '' };
const AUTOSAVE_AFTER = 2500; // ms after the last change
const timeNow = () => new Date().toISOString();

// My saved draft from the backend, if it is for this shift, as the form's starting values
function formFromDraft(draft, shift, shiftDate) {
  if (!draft || draft.shift !== shift.apiValue || draft.shiftDate !== shiftDate) return EMPTY;
  return {
    passOn: Object.fromEntries(draft.tasks.map((t) => [t.taskId, t.note ?? ''])),
    residents: Object.fromEntries(draft.residents.map((r) => [r.residentId, { status: r.status, note: r.note ?? '' }])),
    other: draft.otherNotes ?? '',
  };
}

// The four-part handover form for my current shift.
// Drafts are saved in the database on their own a moment after each change (and with "Save draft").
// Submitting never changes any task: unfinished tasks stay Pending for the next shift.
export default function WriteHandover({ shift, shiftDate, next, shiftTasks, residents, draft, onOpenTask, onDraftSaved, onSubmitted }) {
  const { submit, saveDraft } = useHandovers();
  const showToast = useToast();
  const [form, setForm] = useState(() => formFromDraft(draft, shift, shiftDate));
  // { status: 'idle' | 'saving' | 'saved' | 'error', at: when this computer last saved it }
  const [draftState, setDraftState] = useState(() => (form !== EMPTY ? { status: 'saved', at: null } : { status: 'idle' }));
  const changed = useRef(false); // nothing is autosaved until the person changes something
  const submitted = useRef(false); // no autosave after submitting (it would start a new draft)
  const [checked, setChecked] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const completed = shiftTasks.filter((t) => t.status === 'completed');
  const skipped = shiftTasks.filter((t) => t.status === 'skipped');
  const unfinished = shiftTasks.filter((t) => t.status === 'pending' || t.status === 'overdue');
  const overdue = unfinished.filter((t) => t.status === 'overdue');

  const residentOf = (id) => form.residents[id] ?? DEFAULT_RESIDENT;
  const flaggedCount = residents.filter((r) => residentOf(r.id).status !== 'normal').length;

  const clearError = (id) => setErrors((e) => ({ ...e, [id]: undefined }));

  // Every change to the form goes through here, so it can be autosaved
  const change = (update) => {
    changed.current = true;
    setForm(update);
  };

  const setResident = (id, patch) => {
    change((f) => ({ ...f, residents: { ...f.residents, [id]: { ...(f.residents[id] ?? DEFAULT_RESIDENT), ...patch } } }));
    clearError(`res-note-${id}`);
  };

  const addTag = (tag) => {
    change((f) => ({ ...f, other: `${f.other}${f.other && !f.other.endsWith('\n') ? '\n' : ''}${tag}: ` }));
    document.getElementById('handover-other')?.focus();
  };

  // What the backend gets. A draft keeps notes as typed; a submitted handover
  // leaves out notes for "Normal" residents and unused quick tags (e.g. just "Supplies:").
  const payload = ({ final }) => ({
    shift: shift.apiValue,
    shiftDate,
    summary: buildSummary({ completed: completed.length, notFinished: unfinished.length, skipped: skipped.length }, skipped),
    residents: residents.map((r) => {
      const state = residentOf(r.id);
      return { residentId: r.id, status: state.status, note: final && state.status === 'normal' ? '' : state.note.trim() };
    }),
    tasks: unfinished.map((t) => ({ taskId: t._id, note: (form.passOn[t._id] ?? '').trim() })),
    otherNotes: final
      ? form.other.split('\n').filter((line) => !QUICK_TAGS.some((tag) => line.trim() === `${tag}:`)).join('\n').trim()
      : form.other,
  });

  const storeDraft = async () => {
    setDraftState((d) => ({ ...d, status: 'saving' }));
    try {
      await saveDraft(payload({ final: false }));
      if (submitted.current) return false;
      setDraftState({ status: 'saved', at: timeNow() });
      onDraftSaved(true);
      return true;
    } catch {
      setDraftState((d) => ({ ...d, status: 'error' }));
      return false;
    }
  };

  // Autosave a moment after the last change (with the newest form, kept in a ref after each render)
  const latestStore = useRef(storeDraft);
  useEffect(() => {
    latestStore.current = storeDraft;
  });
  useEffect(() => {
    if (!changed.current || submitted.current) return undefined;
    const timer = setTimeout(() => latestStore.current(), AUTOSAVE_AFTER);
    return () => clearTimeout(timer);
  }, [form]);

  // Keyed by the id of the field to focus, so the first problem can be focused
  const validate = () => {
    const found = {};
    overdue.forEach((t) => {
      found[`fix-${t._id}`] = `${t.task} is overdue. Mark it Completed or Skipped first.`;
    });
    residents.forEach((r) => {
      const state = residentOf(r.id);
      if (state.status !== 'normal' && !state.note.trim()) {
        found[`res-note-${r.id}`] = `Please write what changed for ${r.name.split(' ')[0]}.`;
      }
    });
    if (!checked) found['handover-checked'] = 'Please confirm that you checked your tasks and residents.';
    return found;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    setSendError('');
    setConfirmOpen(true);
  };

  const sendHandover = async () => {
    setSending(true);
    submitted.current = true; // stops any autosave from starting a new draft
    try {
      await submit(payload({ final: true }));
      setConfirmOpen(false);
      showToast('Handover submitted. The next shift can read it now.');
      onSubmitted();
    } catch (err) {
      submitted.current = false;
      setSendError(
        err.response
          ? err.response.data?.message || "Couldn't submit the handover. Please try again."
          : "Can't reach the server. Your handover is not lost: your draft is saved, so try again later."
      );
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (await storeDraft()) showToast(`Draft saved at ${formatTime(timeNow())}.`);
    else showToast("Couldn't save the draft. Please check that the server is running.", 'error');
  };

  const errorList = Object.values(errors).filter(Boolean);

  return (
    <>
      <form className="handover-form" onSubmit={handleSubmit} noValidate>
        {/* 1. Task summary */}
        <section className="card handover-section" aria-labelledby="hs-tasks">
          <header className="handover-section__head">
            <h2 id="hs-tasks"><span className="step">1 ·</span> Task summary</h2>
            <p className="card__meta">Filled in from My Tasks</p>
          </header>

          <ul className="summary-legend">
            <li className="status-pill status-pill--completed">{completed.length} completed</li>
            <li className="status-pill status-pill--pending">{unfinished.length} not finished</li>
            <li className="status-pill status-pill--skipped">{skipped.length} skipped</li>
          </ul>

          {shiftTasks.length === 0 ? (
            <EmptyState icon={ClipboardList}>You have no tasks in this shift.</EmptyState>
          ) : (
            <ul className="summary-list">
              {shiftTasks.map((t) => (
                <li key={t._id}>
                  <span className="summary-list__task">
                    <span>{t.task}</span>
                    {t.skipReason && <small>Reason: {t.skipReason}</small>}
                  </span>
                  <span className="summary-list__resident">
                    {t.resident}{t.room && ` · Rm ${t.room}`}
                  </span>
                  <StatusPill status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 2. Pass on */}
        <section className="card handover-section" aria-labelledby="hs-passon">
          <header className="handover-section__head">
            <h2 id="hs-passon"><span className="step">2 ·</span> Pass on to the next shift</h2>
          </header>
          <p className="section-help">
            Unfinished tasks stay Pending and move to the next caregiver. Add a short note so they know where you stopped.
          </p>

          {unfinished.length === 0 ? (
            <EmptyState icon={ClipboardList}>Nothing to pass on. Every task is completed or skipped.</EmptyState>
          ) : (
            <ul className="passon-list">
              {unfinished.map((t) => {
                const isOverdue = t.status === 'overdue';
                const errorId = `fix-${t._id}`;
                return (
                  <li key={t._id} className={`passon ${isOverdue ? 'passon--overdue' : ''}`}>
                    <div className="passon__top">
                      <span>
                        <strong>{t.task}</strong> · {t.resident}{t.room && `, Rm ${t.room}`}
                      </span>
                      <span className="passon__time">Due {formatTime(t.dueAt)}</span>
                    </div>

                    {isOverdue ? (
                      <div className="passon__overdue">
                        <p>
                          <StatusPill status="overdue" /> Mark this task Completed or Skipped before you submit.
                        </p>
                        <button
                          type="button"
                          id={errorId}
                          className="btn btn--soft btn--sm"
                          onClick={() => onOpenTask(t)}
                          aria-describedby={errors[errorId] ? `${errorId}-error` : undefined}
                        >
                          Update task
                        </button>
                        {errors[errorId] && <p id={`${errorId}-error`} className="field__error">{errors[errorId]}</p>}
                      </div>
                    ) : (
                      <div className="field passon__field">
                        <label htmlFor={`passon-${t._id}`} className="field__label">Note for next caregiver</label>
                        <input
                          id={`passon-${t._id}`}
                          className="field__input"
                          value={form.passOn[t._id] ?? ''}
                          onChange={(e) => change((f) => ({ ...f, passOn: { ...f.passOn, [t._id]: e.target.value } }))}
                          placeholder="e.g. Started at 11:40, ate half of the rice"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 3. Resident updates */}
        <section className="card handover-section" aria-labelledby="hs-residents">
          <header className="handover-section__head">
            <h2 id="hs-residents"><span className="step">3 ·</span> Resident updates</h2>
          </header>
          <p className="section-help">Pick a status for each resident you cared for. Only write a note if something changed.</p>

          {residents.length === 0 ? (
            <EmptyState icon={ClipboardList}>No residents are assigned to you.</EmptyState>
          ) : (
            <ul className="resident-updates">
              {residents.map((r) => {
                const state = residentOf(r.id);
                const noteId = `res-note-${r.id}`;
                return (
                  <li key={r.id} className="resident-update">
                    <div className="resident-update__top">
                      <span className="resident-update__who">
                        <Avatar name={r.name} size={36} />
                        <span>
                          <strong>{r.name}</strong>
                          <small>{r.room ? `Room ${r.room}` : 'Room not set'}{state.status === 'normal' && ' · no changes'}</small>
                        </span>
                      </span>
                      <fieldset className="status-choice">
                        <legend className="sr-only">Status for {r.name}</legend>
                        {Object.entries(RESIDENT_STATUS).map(([value, { label }]) => (
                          <label key={value} className={`status-choice__opt status-choice__opt--${value}`}>
                            <input
                              type="radio"
                              name={`status-${r.id}`}
                              value={value}
                              checked={state.status === value}
                              onChange={() => setResident(r.id, { status: value })}
                            />
                            {label}
                          </label>
                        ))}
                      </fieldset>
                    </div>

                    {state.status !== 'normal' && (
                      <div className="field resident-update__note">
                        <label htmlFor={noteId} className="field__label">
                          What changed? <span className="field__required" aria-hidden="true">*</span>
                        </label>
                        <textarea
                          id={noteId}
                          className="field__input"
                          rows={2}
                          value={state.note}
                          onChange={(e) => setResident(r.id, { note: e.target.value })}
                          placeholder="e.g. Felt weak, so the walk was skipped. Please check on her after her nap."
                          required
                          aria-invalid={!!errors[noteId]}
                          aria-describedby={errors[noteId] ? `${noteId}-error` : undefined}
                        />
                        {errors[noteId] && <p id={`${noteId}-error`} className="field__error">{errors[noteId]}</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 4. Other notes */}
        <section className="card handover-section" aria-labelledby="hs-other">
          <header className="handover-section__head">
            <h2 id="hs-other"><span className="step">4 ·</span> Other notes <span className="optional">(optional)</span></h2>
          </header>
          <div className="chip-row" role="group" aria-label="Quick tags">
            {QUICK_TAGS.map((tag) => (
              <button key={tag} type="button" className="chip" onClick={() => addTag(tag)}>+ {tag}</button>
            ))}
          </div>
          <div className="field handover-other">
            <label htmlFor="handover-other" className="field__label">Anything else the next shift should know</label>
            <textarea
              id="handover-other"
              className="field__input"
              rows={3}
              value={form.other}
              onChange={(e) => change((f) => ({ ...f, other: e.target.value }))}
              placeholder="e.g. Supplies: adult wipes running low in Room 102."
            />
          </div>
        </section>

        {/* Confirm and submit */}
        <section className="handover-submit" aria-label="Submit handover">
          <div className="checkbox-row">
            <input
              type="checkbox"
              id="handover-checked"
              checked={checked}
              onChange={(e) => { setChecked(e.target.checked); clearError('handover-checked'); }}
              aria-invalid={!!errors['handover-checked']}
            />
            <label htmlFor="handover-checked">I checked my tasks and residents before handing over.</label>
          </div>

          {errorList.length > 0 && (
            <div className="alert alert--error" role="alert">
              <CircleAlert size={18} aria-hidden="true" />
              <div>
                <p className="alert__title">Please fix {errorList.length === 1 ? 'this' : `these ${errorList.length} things`} before submitting:</p>
                <ul className="alert__list">{errorList.map((msg) => <li key={msg}>{msg}</li>)}</ul>
              </div>
            </div>
          )}

          <div className="handover-submit__actions">
            <p className="draft-status" role="status">
              {draftState.status === 'saving' && 'Saving draft…'}
              {draftState.status === 'saved' && `Draft saved${draftState.at ? ` · ${formatTime(draftState.at)}` : ''}`}
              {draftState.status === 'error' && "Couldn't save the draft"}
            </p>
            <button type="button" className="btn btn--outline" onClick={handleSaveDraft} disabled={draftState.status === 'saving'}>
              Save draft
            </button>
            <button type="submit" className="btn btn--primary">Submit handover</button>
          </div>
        </section>
      </form>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit this handover?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--outline" onClick={() => setConfirmOpen(false)} disabled={sending}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={sendHandover} disabled={sending}>
              {sending ? 'Submitting…' : 'Submit handover'}
            </button>
          </>
        }
      >
        {sendError && (
          <div className="alert alert--error" role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{sendError}</span>
          </div>
        )}
        <ul className="confirm-list">
          <li>{unfinished.length} {unfinished.length === 1 ? 'task' : 'tasks'} passed on to the {next.label} shift</li>
          <li>{flaggedCount} {flaggedCount === 1 ? 'resident' : 'residents'} marked Watch closely or Urgent</li>
        </ul>
        <p className="local-note">
          <Info size={16} aria-hidden="true" />
          Submitting does not mark any task as completed. Unfinished tasks stay Pending.
        </p>
      </Modal>
    </>
  );
}
