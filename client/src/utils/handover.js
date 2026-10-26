// Helpers for shift handovers.
//
// The backend stores a handover in parts: a summary, resident updates (by resident),
// passed-on tasks (by task), other notes and read receipts. parseHandover() turns that
// into one `data` object the screens use:
//   { summary: { completed, notFinished, skipped }, tasks (the skipped ones),
//     passOn: [{ taskId, task, resident, dueAt, note }],
//     residents: [{ residentId, name, room, status, note }], other }
// Older handovers still show: the ones saved by the earlier version of this page
// (details as JSON after a marker in `notes`) and plain-text ones (data = null).

import { SHIFTS } from '../constants';
import { shiftWindow } from './shift';
import { formatTime } from './format';

const OLD_MARKER = '\n\n[agapay-data]';

export const RESIDENT_STATUS = {
  normal: { label: 'Normal', tone: 'completed' },
  watch: { label: 'Watch closely', tone: 'pending' },
  urgent: { label: 'Urgent', tone: 'overdue' },
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The handover's `summary` text. Written in a fixed form so it reads well anywhere
// (admin pages, exports) and parseSummary() can read the numbers back.
export function buildSummary({ completed, notFinished, skipped }, skippedTasks) {
  return [
    `Tasks this shift: ${completed} completed, ${notFinished} not finished, ${skipped} skipped.`,
    ...skippedTasks.map((t) => `Skipped: ${t.task} (${t.resident})${t.skipReason ? `: ${t.skipReason}` : ''}`),
  ].join('\n');
}

function parseSummary(text = '') {
  const counts = text.match(/(\d+) completed, (\d+) not finished, (\d+) skipped/);
  const skipped = text
    .split('\n')
    .map((line) => line.match(/^Skipped: (.+) \(([^)]*)\)(?:: (.*))?$/))
    .filter(Boolean)
    .map(([, task, resident, reason], i) => ({ id: `s${i}`, task, resident, status: 'skipped', reason: reason ?? '' }));
  return {
    summary: counts
      ? { completed: Number(counts[1]), notFinished: Number(counts[2]), skipped: Number(counts[3]) }
      : null,
    skipped,
  };
}

// Adds `text` (readable), `data` (the details, or null for plain-text handovers)
// and `readByMe` to a handover from the backend.
export function parseHandover(h, myId) {
  // Before read receipts, only the first reader was kept
  const readByMe = !!h.readByMe || (myId != null && h.acknowledgedBy?._id === myId);
  const notes = h.notes ?? '';

  // Saved by the earlier version of this page
  const at = notes.indexOf(OLD_MARKER);
  if (at !== -1) {
    let data = null;
    try {
      data = JSON.parse(notes.slice(at + OLD_MARKER.length));
    } catch {
      // The details were damaged; the readable part still shows
    }
    return { ...h, readByMe, text: notes.slice(0, at), data };
  }

  // The backend's parts
  const hasParts = h.residents?.length || h.tasks?.length || h.summary || h.otherNotes;
  if (!hasParts) return { ...h, readByMe, text: notes, data: null };

  const { summary, skipped } = parseSummary(h.summary ?? '');
  return {
    ...h,
    readByMe,
    text: notes,
    data: {
      summary: summary ?? { completed: 0, notFinished: h.tasks.length, skipped: skipped.length },
      tasks: skipped,
      passOn: h.tasks.map(({ taskId, task, resident, dueAt, note }) => ({ taskId, task, resident, dueAt, note: note ?? '' })),
      residents: h.residents.map(({ residentId, name, room, status, note }) => ({ residentId, name, room, status, note: note ?? '' })),
      other: h.otherNotes ?? '',
    },
  };
}

export const parseHandovers = (list, myId) => list.map((h) => parseHandover(h, myId));

// This handover's update about a resident (matched by resident, or by name for older handovers)
export const updateFor = (handover, resident) =>
  handover?.data?.residents.find((u) => (u.residentId ? u.residentId === resident.id : u.name === resident.name));

// Who has read a handover: everyone with a read receipt (older handovers: the first reader)
export function readersOf(h) {
  if (h.reads?.length) return h.reads;
  return h.acknowledgedBy ? [{ userId: h.acknowledgedBy._id, name: h.acknowledgedBy.name, readAt: h.acknowledgedAt }] : [];
}

// "On time" or "Late · 2:25 PM", compared with the end of that handover's shift
export function handoverTiming(h) {
  const shift = SHIFTS.find((s) => s.apiValue === h.shift);
  if (!shift) return null;
  const created = new Date(h.createdAt);
  const late = created > shiftWindow(shift, created).end;
  return { late, label: late ? `Late · ${formatTime(created)}` : 'On time' };
}

// One short line about a handover, for lists
export function handoverSummary(h) {
  if (!h.data) return h.text.split('\n')[0].slice(0, 60);
  const flagged = h.data.residents.filter((r) => r.status !== 'normal').length;
  if (flagged) return `${plural(flagged, 'resident')} to watch`;
  if (h.data.passOn.length) return `${plural(h.data.passOn.length, 'task')} passed on`;
  return 'All tasks done';
}

// Morning -> Noon -> Night -> Morning
export const nextShift = (shift) => SHIFTS[(SHIFTS.indexOf(shift) + 1) % SHIFTS.length];

// My handover for this shift: written by me, for this shift and shift date.
// (Older handovers have no shift date: then one sent from 12 hours before the shift
// starts to 12 hours after it ends counts, so an early or late handover still counts.)
export function findMyShiftHandover(handovers, userId, shift, { start, end }, shiftDate) {
  const from = start.getTime() - 12 * 3600000;
  const to = end.getTime() + 12 * 3600000;
  return handovers.find((h) => {
    if (h.author?._id !== userId || h.shift !== shift.apiValue) return false;
    if (h.shiftDate && shiftDate) return h.shiftDate === shiftDate;
    const t = new Date(h.createdAt).getTime();
    return t >= from && t <= to;
  });
}
