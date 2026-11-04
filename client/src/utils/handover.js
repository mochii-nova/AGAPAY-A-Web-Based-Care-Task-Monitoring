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

// A resident's condition. "Watch closely" has its own apricot badge with an eye (status-pill--watch),
// so it never looks like a task's amber "Pending".
export const RESIDENT_STATUS = {
  normal: { label: 'Normal', tone: 'completed' },
  watch: { label: 'Watch closely', tone: 'watch' },
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
    if (data) data.other = cleanOtherNotes(data.other ?? '');
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
      // taskStatus: the task's status right now (pending / completed / skipped), so readers see if it got done
      passOn: h.tasks.map(({ taskId, task, resident, dueAt, note, taskStatus }) => ({ taskId, task, resident, dueAt, note: note ?? '', taskStatus })),
      residents: h.residents.map(({ residentId, name, room, status, note }) => ({ residentId, name, room, status, note: note ?? '' })),
      other: cleanOtherNotes(h.otherNotes ?? ''),
    },
  };
}

export const parseHandovers = (list, myId) => list.map((h) => parseHandover(h, myId));

// This handover's update about a resident (matched by resident, or by name for older handovers)
export const updateFor = (handover, resident) =>
  handover?.data?.residents.find((u) => (u.residentId ? u.residentId === resident.id : u.name === resident.name));

// The newest handover with an update about this resident: { handover, update } or null.
// (`handovers` newest first, as the backend sends them.)
export function latestUpdate(handovers, resident) {
  for (const handover of handovers) {
    const update = updateFor(handover, resident);
    if (update && RESIDENT_STATUS[update.status]) return { handover, update };
  }
  return null;
}

// "Submitted by Claire River (Morning shift) · 5:23 AM"
export const submittedLine = (h) =>
  `Submitted by ${h.author?.name ?? 'a caregiver'} (${SHIFTS.find((s) => s.apiValue === h.shift)?.label ?? h.shift} shift) · ${formatTime(h.submittedAt ?? h.createdAt)}`;

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

// "Other notes" without the labels nobody filled in (a line that is only "Supplies:")
export const cleanOtherNotes = (text = '') =>
  text
    .split('\n')
    .filter((line) => !/^[^:\n]{1,40}:\s*$/.test(line.trim()))
    .join('\n')
    .trim();

const pad = (n) => String(n).padStart(2, '0');
const dayText = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// The shift a handover is meant for: the one right after it, e.g. Noon on Nov 1 -> Night on Nov 1,
// Night on Nov 1 -> Morning on Nov 2. { shift: 'Night', shiftDate: '2026-11-01' } or null.
// (Older handovers have no shift date: it comes from when the handover was sent.)
export function handoverTarget(h) {
  const shift = SHIFTS.find((s) => s.apiValue === h.shift);
  if (!shift) return null;
  const date = h.shiftDate
    ? new Date(`${h.shiftDate}T12:00:00`)
    : shiftWindow(shift, new Date(h.submittedAt ?? h.createdAt)).start;
  const next = nextShift(shift);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (next === SHIFTS[0] ? 1 : 0));
  return { shift: next.apiValue, shiftDate: dayText(day) };
}

// The newest handover from someone else meant for one of my shifts (`targets`: my current and
// next shift, as { shift, shiftDate }), or undefined. `handovers` newest first.
export const handoverForMe = (handovers, myId, targets) =>
  handovers.find((h) => {
    if (h.author?._id === myId) return false;
    const t = handoverTarget(h);
    return !!t && targets.some((m) => m && m.shift === t.shift && m.shiftDate === t.shiftDate);
  });

// Sent in the last 24 hours
export const isRecentHandover = (h, now = new Date()) =>
  now - new Date(h.submittedAt ?? h.createdAt) < 24 * 3600000;

// Handovers from others I haven't read, from the last 24 hours (the "new" count)
export const newHandovers = (handovers, myId, now = new Date()) =>
  handovers.filter((h) => h.author?._id !== myId && !h.readByMe && isRecentHandover(h, now));

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
