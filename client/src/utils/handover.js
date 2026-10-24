// Helpers for shift handovers.
//
// TEMPORARY FORMAT: the backend's handovers table only has `shift` and one `notes` text.
// So a handover is saved as a readable summary, followed by a marker and the structured
// details as JSON. Old or hand-written handovers (no marker) still show as plain text.
// TODO: replace with real tables when the backend adds them (see the list for Aeron).

import { SHIFTS, shiftLabel } from '../constants';
import { shiftWindow } from './shift';
import { formatTime } from './format';

const MARKER = '\n\n[agapay-data]';

export const RESIDENT_STATUS = {
  normal: { label: 'Normal', tone: 'completed' },
  watch: { label: 'Watch closely', tone: 'pending' },
  urgent: { label: 'Urgent', tone: 'overdue' },
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// data: { v, shift, date, summary, tasks, passOn, residents, other }
export function buildNotes(data) {
  const { summary } = data;
  const lines = [
    `${shiftLabel(data.shift)} shift handover (${data.date}).`,
    `Tasks: ${summary.completed} completed, ${summary.notFinished} not finished, ${summary.skipped} skipped.`,
  ];
  if (data.passOn.length) {
    lines.push('Passed on:', ...data.passOn.map((p) => `- ${p.task} (${p.resident})${p.note ? `: ${p.note}` : ''}`));
  }
  const skipped = data.tasks.filter((t) => t.status === 'skipped');
  if (skipped.length) {
    lines.push('Skipped:', ...skipped.map((t) => `- ${t.task} (${t.resident})${t.reason ? `: ${t.reason}` : ''}`));
  }
  if (data.residents.length) {
    lines.push(
      'Residents:',
      ...data.residents.map((r) => `- ${r.name}: ${RESIDENT_STATUS[r.status].label}${r.note ? `. ${r.note}` : ''}`)
    );
  }
  if (data.other) lines.push(`Other notes: ${data.other}`);
  return `${lines.join('\n')}${MARKER}${JSON.stringify(data)}`;
}

// Adds `text` (the readable part) and `data` (the details, or null) to a handover from the backend
export function parseHandover(h) {
  const notes = h.notes ?? '';
  const at = notes.indexOf(MARKER);
  if (at === -1) return { ...h, text: notes, data: null };
  let data = null;
  try {
    data = JSON.parse(notes.slice(at + MARKER.length));
  } catch {
    // The details were damaged; the readable part still shows
  }
  return { ...h, text: notes.slice(0, at), data };
}

export const parseHandovers = (list) => list.map(parseHandover);

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

// My handover for this shift: written by me, for this shift, from 12 hours before it starts
// to 12 hours after it ends (so an early or late handover still counts)
export function findMyShiftHandover(handovers, userId, shift, { start, end }) {
  const from = start.getTime() - 12 * 3600000;
  const to = end.getTime() + 12 * 3600000;
  return handovers.find((h) => {
    const t = new Date(h.createdAt).getTime();
    return h.author?._id === userId && h.shift === shift.apiValue && t >= from && t <= to;
  });
}
