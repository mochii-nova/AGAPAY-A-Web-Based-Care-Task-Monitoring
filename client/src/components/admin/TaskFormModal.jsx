import { useState } from 'react';
import { CircleAlert, TriangleAlert } from 'lucide-react';
import api from '../../api';
import Modal from '../Modal';
import FormField from '../FormField';
import SelectField from '../SelectField';
import useApiData from '../../hooks/useApiData';
import { TASK_CATEGORIES, shiftTime } from '../../constants';
import { isoDay } from '../../hooks/useShifts';
import { addDays, dayLabel, dueFrom, timeOf, shiftOfDue, caregiversOnShift } from '../../utils/adminTasks';

const MAX_REPEAT = 31;

function validate(form, chosenOk) {
  const errors = {};
  if (!form.task.trim()) errors.task = 'Please enter the task name.';
  if (!form.category) errors.category = 'Please choose a category.';
  if (!form.residentId) errors.residentId = 'Please choose a resident.';
  if (!form.date) errors.date = 'Please choose the date.';
  if (!form.time) errors.time = 'Please choose the due time.';
  if (!chosenOk) errors.assignedTo = "This caregiver isn't on that shift. Choose someone else or \"Not assigned yet\".";
  const n = Number(form.repeat);
  if (!Number.isInteger(n) || n < 1 || n > MAX_REPEAT) errors.repeat = `Use a number from 1 to ${MAX_REPEAT}.`;
  return errors;
}

// The form inside the pop-up: a new task (`task` empty) or changes to one.
// `preset`: { residentId, date } to start a new task with.
function TaskForm({ task, preset, residents, caregivers, onSaved, onClose }) {
  const editing = !!task;
  const [form, setForm] = useState({
    task: task?.task ?? '',
    category: task?.category ?? '',
    residentId: String(task?.residentId ?? preset?.residentId ?? ''),
    date: task ? isoDay(task.dueAt) : preset?.date ?? isoDay(new Date()),
    time: task ? timeOf(task.dueAt) : '08:00',
    assignedTo: String(task?.assignedTo ?? ''),
    repeat: '1',
    note: task?.note ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const days = editing ? 1 : Math.min(Math.max(Number(form.repeat) || 1, 1), MAX_REPEAT);
  const due = form.date && form.time ? dueFrom(form.date, form.time) : null;
  const { shift, shiftDate } = shiftOfDue(due ?? new Date());

  // The roster around these days (two weeks either side shows who uses the roster at all)
  const from = addDays(shiftDate, -14);
  const to = addDays(shiftDate, days + 14);
  const rosterQuery = useApiData(`/shifts?from=${from}&to=${to}`);
  const roster = rosterQuery.data ?? [];

  // Caregivers of the chosen resident go first
  const resident = residents.find((r) => String(r.id) === form.residentId);
  const looksAfter = (c) => !!resident?.caregivers.some((x) => x.id === c.id);
  const onShift = caregiversOnShift(caregivers, roster, shift, shiftDate).sort(
    (a, b) => looksAfter(b.caregiver) - looksAfter(a.caregiver) || a.caregiver.name.localeCompare(b.caregiver.name)
  );
  // When editing, the person it's already given to stays in the list even if their shift changed
  const keepCurrent =
    editing && task.assignedTo && String(task.assignedTo) === form.assignedTo && !onShift.some((o) => String(o.caregiver.id) === form.assignedTo);
  const chosenOk = !form.assignedTo || keepCurrent || onShift.some((o) => String(o.caregiver.id) === form.assignedTo);

  const caregiverOptions = [
    { value: '', label: 'Not assigned yet' },
    ...onShift.map(({ caregiver: c, usual }) => ({
      value: String(c.id),
      label: `${c.name} · ${shift.label}${usual ? ' (usual shift)' : ''}${looksAfter(c) ? ` · looks after ${resident.name.split(' ')[0]}` : ''}`,
    })),
    ...(keepCurrent ? [{ value: String(task.assignedTo), label: `${task.assignedToName} (not on this shift)` }] : []),
  ];

  // Repeating: the days the chosen caregiver isn't on this shift (those tasks get no caregiver)
  const chosen = caregivers.find((c) => String(c.id) === form.assignedTo);
  const offDays =
    !editing && chosen && days > 1 && due
      ? Array.from({ length: days }, (_, i) => addDays(form.date, i)).filter((day) => {
          const s = shiftOfDue(dueFrom(day, form.time));
          return !caregiversOnShift([chosen], roster, s.shift, s.shiftDate).length;
        })
      : [];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form, chosenOk);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`task-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setSaveError('');
    const fields = {
      task: form.task.trim(),
      category: form.category,
      residentId: Number(form.residentId),
      note: form.note.trim(),
    };
    const saved = [];
    try {
      if (editing) {
        const { data } = await api.put(`/tasks/${task.id}`, { ...fields, dueAt: due.toISOString(), assignedTo: form.assignedTo ? Number(form.assignedTo) : null });
        saved.push(data);
      } else {
        // One task per day, at the same time
        for (let i = 0; i < days; i += 1) {
          const day = addDays(form.date, i);
          const assignedTo = form.assignedTo && !offDays.includes(day) ? Number(form.assignedTo) : null;
          const { data } = await api.post('/tasks', { ...fields, dueAt: dueFrom(day, form.time).toISOString(), assignedTo });
          saved.push(data);
        }
      }
      onSaved(saved, { editing, offDays: offDays.length });
      onClose();
    } catch (err) {
      const message = err.response ? err.response.data?.message || "Couldn't save. Please try again." : "Can't reach the server. Please try again.";
      // Some days may already be saved when a repeat stops part-way
      if (saved.length) {
        onSaved(saved, { editing, offDays: 0, partial: true });
        setSaveError(`${saved.length} of ${days} tasks were saved, then it stopped: ${message}`);
      } else {
        setSaveError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <FormField id={`task-${name}`} name={name} label={label} value={form[name]} onChange={handleChange} error={errors[name]} {...props} />
  );
  const select = (name, label, options, props = {}) => (
    <SelectField id={`task-${name}`} name={name} label={label} value={form[name]} onChange={handleChange} options={options} error={errors[name]} {...props} />
  );

  const shiftHint =
    onShift.length === 0
      ? `No one is on the ${shift.label} shift on ${dayLabel(shiftDate)}. Add someone in Schedule, or save it without a caregiver for now.`
      : `Only caregivers on the ${shift.label} shift (${shiftTime(shift)}) on ${dayLabel(shiftDate)} are listed.`;

  return (
    <form className="staff-form" onSubmit={handleSubmit} noValidate>
      {saveError && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{saveError}</span>
        </div>
      )}

      {field('task', 'Task name', { placeholder: 'e.g. Afternoon snack', autoComplete: 'off', maxLength: 120 })}
      <div className="form-grid">
        {select('category', 'Category', [{ value: '', label: 'Choose a category' }, ...TASK_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))], { required: true })}
        {select(
          'residentId',
          'Resident',
          [{ value: '', label: 'Choose a resident' }, ...residents.map((r) => ({ value: String(r.id), label: `${r.name} · Room ${r.room}` }))],
          { required: true }
        )}
      </div>
      <div className="form-grid">
        {field('date', editing ? 'Date' : 'Date (first day)', { type: 'date' })}
        {field('time', 'Due time', { type: 'time' })}
      </div>

      {select('assignedTo', 'Assigned caregiver', caregiverOptions, {
        hint: rosterQuery.status === 'loading' ? 'Checking who is on shift…' : shiftHint,
        disabled: rosterQuery.status === 'loading',
      })}

      {!editing && (
        <>
          {field('repeat', 'Repeat for how many days?', {
            type: 'number',
            min: 1,
            max: MAX_REPEAT,
            inputMode: 'numeric',
            hint:
              days > 1
                ? `Creates ${days} tasks, one each day from ${dayLabel(form.date)} to ${dayLabel(addDays(form.date, days - 1))}, all at the same time.`
                : '1 = only this day. 7 = one task each day for a week.',
          })}
          {offDays.length > 0 && (
            <div className="alert alert--warning" role="status">
              <TriangleAlert size={18} aria-hidden="true" />
              <span>
                {chosen.name} isn't on this shift on {offDays.map(dayLabel).join(', ')}. The task on{' '}
                {offDays.length === 1 ? 'that day' : 'those days'} will be saved without a caregiver.
              </span>
            </div>
          )}
        </>
      )}

      <div className="field">
        <label htmlFor="task-note" className="field__label">Instructions</label>
        <textarea
          id="task-note"
          name="note"
          className="field__input"
          rows={3}
          maxLength={2000}
          placeholder="e.g. Soft food only. Offer water after."
          value={form.note}
          onChange={handleChange}
          aria-describedby="task-note-hint"
        />
        <p id="task-note-hint" className="field__hint">The caregiver sees this when they open the task.</p>
      </div>

      <div className="modal__footer modal__footer--inline">
        <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : days > 1 ? `Create ${days} tasks` : 'Create task'}
        </button>
      </div>
    </form>
  );
}

// Pop-up for "Create task" (no `task`) and "Edit".
// `caregivers`: every caregiver account. onSaved(savedTasks, { editing, offDays, partial }) after saving.
export default function TaskFormModal({ open, task, preset, residents, caregivers, onSaved, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={task ? `Edit ${task.task}` : 'Create task'} size="lg">
      {open && (
        <TaskForm key={task?.id ?? 'new'} task={task} preset={preset} residents={residents} caregivers={caregivers} onSaved={onSaved} onClose={onClose} />
      )}
    </Modal>
  );
}
