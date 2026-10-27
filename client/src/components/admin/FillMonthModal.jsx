import { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import api from '../../api';
import Modal from '../Modal';
import SelectField from '../SelectField';
import useApiData from '../../hooks/useApiData';
import { SHIFTS, shiftTime } from '../../constants';
import { isoDay } from '../../hooks/useShifts';
import { WEEKDAYS, addMonths, monthTitle } from '../../utils/calendar';
import { dayToDate } from '../../utils/adminTasks';

const FULL_WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

// This month and the next three, as { value: '2026-10', label: 'October 2026' }
function monthOptions(now) {
  return Array.from({ length: 4 }, (_, i) => {
    const m = addMonths(now, i);
    return { value: isoDay(m).slice(0, 7), label: monthTitle(m) };
  });
}

function FillForm({ caregivers, startMonth, onDone, onClose }) {
  const active = caregivers.filter((c) => c.status === 'active');
  const first = active[0];
  const [form, setForm] = useState({
    userId: String(first?.id ?? ''),
    month: isoDay(startMonth).slice(0, 7),
    shift: first?.assignedShift ?? SHIFTS[0].apiValue,
  });
  const [offDays, setOffDays] = useState([]);
  const [clearOff, setClearOff] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const person = active.find((c) => String(c.id) === form.userId);
  const [y, m] = form.month.split('-').map(Number);
  const from = `${form.month}-01`;
  const to = isoDay(new Date(y, m, 0));
  const shift = SHIFTS.find((s) => s.apiValue === form.shift);

  // Their shifts in that month now, to say what will change
  const existingQuery = useApiData(`/shifts?from=${from}&to=${to}&userId=${form.userId}`);
  const existing = existingQuery.data ?? [];
  const weekday = (ymd) => dayToDate(ymd).getDay();
  const allDays = Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => isoDay(new Date(y, m - 1, i + 1)));
  const workDays = allDays.filter((d) => !offDays.includes(weekday(d)));
  const changed = existing.filter((e) => !offDays.includes(weekday(e.shiftDate)) && e.shift !== form.shift).length;
  const toClear = clearOff ? existing.filter((e) => offDays.includes(weekday(e.shiftDate))) : [];

  const handleChange = (e) => {
    const next = { ...form, [e.target.name]: e.target.value };
    // Picking a person starts with their usual shift
    if (e.target.name === 'userId') {
      const usual = active.find((c) => String(c.id) === e.target.value)?.assignedShift;
      if (usual) next.shift = usual;
    }
    setForm(next);
  };
  const toggleDay = (i) => setOffDays(offDays.includes(i) ? offDays.filter((d) => d !== i) : [...offDays, i].sort());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!person || workDays.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/shifts/bulk', { userId: person.id, from, to, shift: form.shift, skipWeekdays: offDays });
      for (const entry of toClear) await api.delete(`/shifts/${entry.id}`);
      onDone({ person, shift, month: monthTitle(new Date(y, m - 1, 1)), count: workDays.length, cleared: toClear.length });
      onClose();
    } catch (err) {
      setError(err.response ? err.response.data?.message || "Couldn't save. Please try again." : "Can't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (active.length === 0) {
    return <p className="staff-details__empty">There are no active caregivers yet. Add or approve one in Manage Staff.</p>;
  }

  const offText = offDays.length ? ` (off on ${offDays.map((i) => FULL_WEEKDAYS[i]).join(', ')})` : ' (no days off)';

  return (
    <form className="staff-form" onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert--error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <SelectField id="fill-userId" name="userId" label="Caregiver" value={form.userId} onChange={handleChange} options={active.map((c) => ({ value: String(c.id), label: c.name }))} />
      <div className="form-grid">
        <SelectField id="fill-month" name="month" label="Month" value={form.month} onChange={handleChange} options={monthOptions(startMonth)} />
        <SelectField
          id="fill-shift"
          name="shift"
          label="Shift"
          value={form.shift}
          onChange={handleChange}
          options={SHIFTS.map((s) => ({ value: s.apiValue, label: `${s.label} · ${shiftTime(s)}` }))}
        />
      </div>

      <fieldset className="field need-picker">
        <legend className="field__label">Days off every week</legend>
        <div className="weekday-picker">
          {WEEKDAYS.map((d, i) => (
            <label key={d} className="need-picker__option weekday-picker__day">
              <input type="checkbox" checked={offDays.includes(i)} onChange={() => toggleDay(i)} />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="checkbox-row fill-month__clear">
        <input type="checkbox" checked={clearOff} onChange={(e) => setClearOff(e.target.checked)} />
        <span>Also remove shifts they already have on those days off</span>
      </label>

      <div className="alert alert--info fill-month__summary" role="status">
        <span>
          <strong>{person?.name}</strong>: {shift.label} shift on <strong>{workDays.length} days</strong> in{' '}
          {monthTitle(new Date(y, m - 1, 1))}
          {offText}.
          {existingQuery.status === 'ready' && changed > 0 && ` ${changed} ${changed === 1 ? 'day' : 'days'} where they work another shift will change to ${shift.label}.`}
          {toClear.length > 0 && ` ${toClear.length} ${toClear.length === 1 ? 'shift' : 'shifts'} on their days off will be removed.`}
        </span>
      </div>

      <div className="modal__footer modal__footer--inline">
        <button type="button" className="btn btn--outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={saving || workDays.length === 0 || existingQuery.status === 'loading'}>
          {saving ? 'Saving…' : `Fill ${workDays.length} days`}
        </button>
      </div>
    </form>
  );
}

// Pop-up for "Fill a month": one caregiver, one shift, every day of a month except their days off.
// onDone({ person, shift, month, count, cleared }) after saving.
export default function FillMonthModal({ open, caregivers, startMonth, onDone, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Fill a month">
      {open && <FillForm caregivers={caregivers} startMonth={startMonth} onDone={onDone} onClose={onClose} />}
    </Modal>
  );
}
