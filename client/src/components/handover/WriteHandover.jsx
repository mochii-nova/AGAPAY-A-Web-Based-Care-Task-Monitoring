import { useState } from 'react';
import { CircleAlert, ClipboardList, Info } from 'lucide-react';
import { useHandovers } from '../../context/HandoverContext';
import { useToast } from '../../context/ToastContext';
import { loadDraft, saveDraft, clearDraft } from '../../data/handoverDraft';
import { buildNotes, RESIDENT_STATUS } from '../../utils/handover';
import { formatTime } from '../../utils/format';
import StatusPill from '../StatusPill';
import Avatar from '../Avatar';
import Modal from '../Modal';
import { EmptyState } from '../StateMessage';

const QUICK_TAGS = ['Supplies', 'Family / Visitor', 'Room / Equipment'];
const EMPTY = { passOn: {}, residents: {}, other: '' };
const DEFAULT_RESIDENT = { status: 'normal', note: '' };

// "Maria Santos" -> "maria-santos" (for element ids)
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// The four-part handover form for my current shift.
// Submitting never changes any task: unfinished tasks stay Pending for the next shift.
export default function WriteHandover({ shift, next, dateLabel, shiftTasks, residents, draftKey, onOpenTask, onDraftSaved, onSubmitted }) {
  const { submit } = useHandovers();
  const showToast = useToast();
  const [form, setForm] = useState(() => {
    const draft = loadDraft(draftKey);
    return draft ? { passOn: draft.passOn ?? {}, residents: draft.residents ?? {}, other: draft.other ?? '' } : EMPTY;
  });
  const [checked, setChecked] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const completed = shiftTasks.filter((t) => t.status === 'completed');
  const skipped = shiftTasks.filter((t) => t.status === 'skipped');
  const unfinished = shiftTasks.filter((t) => t.status === 'pending' || t.status === 'overdue');
  const overdue = unfinished.filter((t) => t.status === 'overdue');

  const residentOf = (name) => form.residents[name] ?? DEFAULT_RESIDENT;
  const roomOf = (name) => residents.find((r) => r.name === name)?.room;
  const flaggedCount = residents.filter((r) => residentOf(r.name).status !== 'normal').length;

  const clearError = (id) => setErrors((e) => ({ ...e, [id]: undefined }));

  const setResident = (name, patch) => {
    setForm((f) => ({ ...f, residents: { ...f.residents, [name]: { ...(f.residents[name] ?? DEFAULT_RESIDENT), ...patch } } }));
    clearError(`res-note-${slug(name)}`);
  };

  const addTag = (tag) => {
    setForm((f) => ({ ...f, other: `${f.other}${f.other && !f.other.endsWith('\n') ? '\n' : ''}${tag}: ` }));
    document.getElementById('handover-other')?.focus();
  };

  // Keyed by the id of the field to focus, so the first problem can be focused
  const validate = () => {
    const found = {};
    overdue.forEach((t) => {
      found[`fix-${t._id}`] = `${t.task} is overdue. Mark it Completed or Skipped first.`;
    });
    residents.forEach((r) => {
      const state = residentOf(r.name);
      if (state.status !== 'normal' && !state.note.trim()) {
        found[`res-note-${slug(r.name)}`] = `Please write what changed for ${r.name.split(' ')[0]}.`;
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
    const data = {
      v: 1,
      shift: shift.apiValue,
      date: dateLabel,
      summary: { completed: completed.length, notFinished: unfinished.length, skipped: skipped.length },
      tasks: shiftTasks.map((t) => ({ id: t._id, task: t.task, resident: t.resident, status: t.status, reason: t.skipReason ?? '' })),
      passOn: unfinished.map((t) => ({ taskId: t._id, task: t.task, resident: t.resident, dueAt: t.dueAt, note: (form.passOn[t._id] ?? '').trim() })),
      residents: residents.map((r) => {
        const state = residentOf(r.name);
        return { name: r.name, room: r.room ?? '', status: state.status, note: state.status === 'normal' ? '' : state.note.trim() };
      }),
      // Leave out quick-tag lines that were added but never filled in (e.g. just "Supplies:")
      other: form.other
        .split('\n')
        .filter((line) => !QUICK_TAGS.some((tag) => line.trim() === `${tag}:`))
        .join('\n')
        .trim(),
    };

    setSending(true);
    try {
      await submit({ shift: shift.apiValue, notes: buildNotes(data) });
      clearDraft(draftKey);
      setConfirmOpen(false);
      showToast('Handover submitted. The next shift can read it now.');
      onSubmitted();
    } catch (err) {
      setSendError(
        err.response
          ? err.response.data?.message || "Couldn't submit the handover. Please try again."
          : "Can't reach the server. Your handover is not lost: press Save Draft, then try again later."
      );
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = () => {
    const savedAt = new Date().toISOString();
    if (saveDraft(draftKey, { ...form, savedAt })) {
      onDraftSaved(savedAt);
      showToast(`Draft saved at ${formatTime(savedAt)} on this computer.`);
    } else {
      showToast("Couldn't save the draft in this browser.", 'error');
    }
  };

  const errorList = Object.values(errors).filter(Boolean);

  return (
    <>
      <form className="handover-form" onSubmit={handleSubmit} noValidate>
        {/* 1. Task summary */}
        <section className="card handover-section" aria-labelledby="hs-tasks">
          <header className="handover-section__head">
            <h2 id="hs-tasks"><span className="step">1.</span> Task summary</h2>
            <p className="card__meta">Filled in automatically from My Tasks</p>
          </header>

          <div className="summary-tiles">
            <div className="summary-tile summary-tile--completed"><strong>{completed.length}</strong>Completed</div>
            <div className="summary-tile summary-tile--pending"><strong>{unfinished.length}</strong>Not finished</div>
            <div className="summary-tile summary-tile--skipped"><strong>{skipped.length}</strong>Skipped</div>
          </div>

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
                    {t.resident}{roomOf(t.resident) && ` · Rm ${roomOf(t.resident)}`}
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
            <h2 id="hs-passon"><span className="step">2.</span> Pass on to next shift</h2>
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
                        <strong>{t.task}</strong> · {t.resident}{roomOf(t.resident) && `, Rm ${roomOf(t.resident)}`}
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
                          onChange={(e) => setForm((f) => ({ ...f, passOn: { ...f.passOn, [t._id]: e.target.value } }))}
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
            <h2 id="hs-residents"><span className="step">3.</span> Resident updates</h2>
          </header>
          <p className="section-help">Pick a status for each resident you cared for. Only write a note if something changed.</p>

          {residents.length === 0 ? (
            <EmptyState icon={ClipboardList}>No residents in your tasks this shift.</EmptyState>
          ) : (
            <ul className="resident-updates">
              {residents.map((r) => {
                const state = residentOf(r.name);
                const noteId = `res-note-${slug(r.name)}`;
                return (
                  <li key={r.name} className="resident-update">
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
                              name={`status-${slug(r.name)}`}
                              value={value}
                              checked={state.status === value}
                              onChange={() => setResident(r.name, { status: value })}
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
                          onChange={(e) => setResident(r.name, { note: e.target.value })}
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
            <h2 id="hs-other"><span className="step">4.</span> Other notes <span className="optional">(optional)</span></h2>
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
              onChange={(e) => setForm((f) => ({ ...f, other: e.target.value }))}
              placeholder="e.g. Supplies: adult wipes running low in Room 102."
            />
          </div>
        </section>

        {/* Confirm and submit */}
        <section className="card handover-submit" aria-label="Submit handover">
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
            <button type="button" className="btn btn--outline" onClick={handleSaveDraft}>Save Draft</button>
            <button type="submit" className="btn btn--primary">Submit Handover</button>
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
