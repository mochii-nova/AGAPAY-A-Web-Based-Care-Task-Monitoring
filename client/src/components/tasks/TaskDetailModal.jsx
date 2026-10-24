import { useState } from 'react';
import { CircleCheck, Clock, CircleSlash, CircleAlert, Info } from 'lucide-react';
import Modal from '../Modal';
import StatusPill from '../StatusPill';
import TaskCategoryIcon from '../TaskCategoryIcon';
import { getCategory } from '../../constants';
import { formatTime } from '../../utils/format';

const CHOICES = [
  { value: 'completed', label: 'Completed', icon: CircleCheck },
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'skipped', label: 'Skipped', icon: CircleSlash },
];

const QUICK_REASONS = ['Resident refused', 'Resident was asleep', 'Resident not feeling well', 'Resident was away (visit or appointment)'];

const longDate = (date) =>
  new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// The form inside the pop-up. Its own component so it starts fresh for each task.
function TaskForm({ task, residentRoom, onSave, onCancel }) {
  // "Overdue" isn't something you pick; it means "pending, but late"
  const [status, setStatus] = useState(task.status === 'overdue' ? 'pending' : task.status);
  const [reason, setReason] = useState(task.skipReason ?? '');
  const [note, setNote] = useState(task.note ?? '');
  const [reasonError, setReasonError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // The backend can't undo "done" yet
  const lockedCompleted = task.status === 'completed';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'skipped' && !reason.trim()) {
      setReasonError('Please write why this task was skipped.');
      document.getElementById('task-reason')?.focus();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(task, { status, reason: reason.trim(), note: note.trim() });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save. Please check that the server is running and try again.");
      setSaving(false);
    }
  };

  return (
    <form id="task-form" className="task-form" onSubmit={handleSubmit} noValidate>
      <div className="task-detail">
        <TaskCategoryIcon category={task.category} size={22} />
        <div className="task-detail__main">
          <p className="small-label">{getCategory(task.category)?.label ?? 'Care task'}</p>
          <p className="task-detail__resident">
            {task.resident}
            {residentRoom && <span> · Room {residentRoom}</span>}
          </p>
          <p className="task-detail__time">
            Due {formatTime(task.dueAt)}, {longDate(task.dueAt)}
          </p>
          {task.status === 'completed' && task.doneAt && (
            <p className="task-detail__done">Completed at {formatTime(task.doneAt)}</p>
          )}
        </div>
        <StatusPill status={task.status} />
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={20} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <fieldset className="choice-group">
        <legend className="field__label">Update status</legend>
        <div className="choice-group__options">
          {CHOICES.map(({ value, label, icon: Icon }) => {
            const disabled = lockedCompleted && value !== 'completed';
            return (
              <label key={value} className={`choice choice--${value} ${disabled ? 'is-disabled' : ''}`}>
                <input
                  type="radio"
                  name="status"
                  value={value}
                  checked={status === value}
                  disabled={disabled}
                  onChange={() => setStatus(value)}
                />
                <Icon size={20} aria-hidden="true" />
                {label}
              </label>
            );
          })}
        </div>
        {lockedCompleted && (
          <p className="field__hint">A completed task can't be changed back yet. The backend doesn't support it.</p>
        )}
      </fieldset>

      {status === 'skipped' && (
        <div className="field">
          <label htmlFor="task-reason" className="field__label">
            Why was it skipped? <span className="field__required" aria-hidden="true">*</span>
          </label>
          <div className="chip-row">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`chip ${reason === r ? 'is-active' : ''}`}
                onClick={() => { setReason(r); setReasonError(''); }}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            id="task-reason"
            className="field__input"
            rows={2}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonError(''); }}
            placeholder="Pick a reason above or write your own"
            required
            aria-invalid={!!reasonError}
            aria-describedby={reasonError ? 'task-reason-error' : undefined}
          />
          {reasonError && <p id="task-reason-error" className="field__error">{reasonError}</p>}
        </div>
      )}

      <div className="field">
        <label htmlFor="task-note" className="field__label">Note (optional)</label>
        <textarea
          id="task-note"
          className="field__input"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything the next caregiver should know?"
        />
      </div>

      <p className="local-note">
        <Info size={16} aria-hidden="true" />
        Skip reasons and notes are saved on this computer only, until the backend can store them.
      </p>

      <div className="modal__footer modal__footer--inline">
        <button type="button" className="btn btn--outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

// Pop-up that opens when you click "View" on a task
export default function TaskDetailModal({ task, residentRoom, onSave, onClose }) {
  return (
    <Modal open={!!task} onClose={onClose} title={task?.task ?? ''}>
      {task && <TaskForm key={task._id} task={task} residentRoom={residentRoom} onSave={onSave} onCancel={onClose} />}
    </Modal>
  );
}
