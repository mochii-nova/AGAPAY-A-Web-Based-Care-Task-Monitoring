// Handover monitoring (admin): which shifts handed over on time, late, or not at all.
//
// Every caregiver on the roster owes one handover per shift, due when the shift ends.
// A handover counts for a roster entry when the same person wrote it for the same shift and day.

import { SHIFTS } from '../constants';
import { isoDay } from '../hooks/useShifts';
import { shiftOnDate } from './shift';
import { dayToDate } from './adminTasks';

export const MONITOR_STATUS = {
  onTime: { label: 'On time', tone: 'completed' },
  late: { label: 'Late', tone: 'pending' },
  missing: { label: 'Missing', tone: 'overdue' },
  notDue: { label: 'Not due yet', tone: 'skipped' },
};

// The day a handover is for (older ones only have the time they were sent)
export const handoverDay = (h) => h.shiftDate ?? isoDay(h.createdAt);

// When the handover was sent
export const sentAt = (h) => new Date(h.submittedAt ?? h.createdAt);

// One row per roster entry from `from` to `to` (plus handovers from people who weren't on the roster),
// newest shift first: { key, shift, shiftDate, userId, userName, handover, status, end }
export function monitorRows(handovers, roster, from, to, now = new Date()) {
  const inRange = (ymd) => ymd >= from && ymd <= to;
  const used = new Set();

  const rows = roster
    .filter((e) => e.shift && inRange(e.shiftDate))
    .map((e) => {
      const shift = SHIFTS.find((s) => s.apiValue === e.shift);
      const { start, end } = shiftOnDate(shift, dayToDate(e.shiftDate));
      const handover = handovers.find(
        (h) => !used.has(h.id) && h.author?.id === e.userId && h.shift === e.shift && handoverDay(h) === e.shiftDate
      );
      if (handover) used.add(handover.id);
      const status = handover ? (sentAt(handover) > end ? 'late' : 'onTime') : now < end ? 'notDue' : 'missing';
      return { key: `r${e.id}`, shift, shiftDate: e.shiftDate, userId: e.userId, userName: e.userName, handover, status, start, end };
    });

  // Handovers from someone who wasn't on the roster that shift still count as submitted
  for (const h of handovers) {
    if (used.has(h.id) || !inRange(handoverDay(h))) continue;
    const shift = SHIFTS.find((s) => s.apiValue === h.shift);
    if (!shift) continue;
    const { start, end } = shiftOnDate(shift, dayToDate(handoverDay(h)));
    rows.push({
      key: `h${h.id}`,
      shift,
      shiftDate: handoverDay(h),
      userId: h.author?.id,
      userName: h.author?.name ?? 'Unknown',
      handover: h,
      status: sentAt(h) > end ? 'late' : 'onTime',
      start,
      end,
    });
  }

  return rows.sort((a, b) => b.start - a.start || a.userName.localeCompare(b.userName));
}

// "1 watch, 1 urgent" from the resident updates, or '' when nobody was flagged
export function flaggedText(h) {
  const residents = h?.data?.residents ?? [];
  const watch = residents.filter((r) => r.status === 'watch').length;
  const urgent = residents.filter((r) => r.status === 'urgent').length;
  return [urgent && `${urgent} urgent`, watch && `${watch} watch`].filter(Boolean).join(', ');
}

// The message "Remind" fills in
export const reminderText = (row) =>
  `Hi ${row.userName.split(' ')[0]}, your ${row.shift.label} handover for ${dayToDate(row.shiftDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })} hasn't been submitted yet. Please submit it when you can.`;
