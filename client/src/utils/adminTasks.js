// Helpers for creating and filtering tasks on the admin side

import { SHIFTS } from '../constants';
import { shiftOfTime } from './shift';
import { isoDay } from '../hooks/useShifts';

// "2026-10-27" -> a Date at midnight on that day (this computer's time zone)
export const dayToDate = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// "2026-10-27" plus 3 days -> "2026-10-30"
export const addDays = (ymd, days) => {
  const d = dayToDate(ymd);
  d.setDate(d.getDate() + days);
  return isoDay(d);
};

// "Tue, Oct 27"
export const dayLabel = (ymd) => dayToDate(ymd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// The moment a task is due, from a day ("2026-10-27") and a clock time ("07:30")
export const dueFrom = (ymd, time) => new Date(`${ymd}T${time}`);

// "07:30" for a moment, for <input type="time">
export const timeOf = (date) => {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// The shift a due time falls in, and the day that shift started on.
// 2:00 AM on Oct 28 belongs to the Night shift that started on Oct 27.
export function shiftOfDue(due) {
  const shift = shiftOfTime(SHIFTS, due) ?? SHIFTS[0];
  const day = isoDay(due);
  const startsDayBefore = shift.id === 'night' && new Date(due).getHours() < 12;
  return { shift, shiftDate: startsDayBefore ? addDays(day, -1) : day };
}

// Is this person on the Schedule for `shift` on `shiftDate`? (`roster` = shifts loaded around that day)
export const isScheduled = (roster, userId, shift, shiftDate) =>
  roster.some((e) => e.userId === userId && e.shiftDate === shiftDate && e.shift === shift.apiValue);

// The active caregivers scheduled on `shift` on `shiftDate`, as [{ caregiver }]. Only the Schedule
// counts: someone who isn't on it that day can't be given a task on that shift.
export const caregiversOnShift = (caregivers, roster, shift, shiftDate) =>
  caregivers.filter((c) => c.status === 'active' && isScheduled(roster, c.id, shift, shiftDate)).map((c) => ({ caregiver: c }));

// Open tasks (pending or overdue) given to someone who isn't scheduled on the task's shift.
// The roster must cover the day before the first task too (a Night shift starts the evening before).
export const offShiftTasks = (tasks, roster) =>
  tasks.filter((t) => {
    if (!t.assignedTo || (t.status !== 'pending' && t.status !== 'overdue')) return false;
    const { shift, shiftDate } = shiftOfDue(t.dueAt);
    return !isScheduled(roster, t.assignedTo, shift, shiftDate);
  });
