// Notification text inside the app.
// The server writes one general title + body that also goes out as the pop-up (push), so it never
// names residents. Inside the app we know more, so each item is made specific here: the task,
// resident and caregiver, who wrote the handover, and so on. Pop-up text is not changed.
import { shiftLabel } from '../constants';
import { formatTime } from './format';
import { sentAt, handoverDay } from './handoverMonitor';
import { dayLabel } from './adminTasks';
import { isoDay } from '../hooks/useShifts';

// The small word above each title
export const TYPE_LABEL = {
  task: 'Task',
  overdue: 'Task',
  message: 'Message',
  handover: 'Handover',
  schedule: 'Schedule',
  signup: 'Sign-up',
};

// "/tasks?open=12" -> 12
export const taskIdOf = (link) => Number((link ?? '').match(/[?&]open=(\d+)/)?.[1]) || null;

// "Nov 1, 3:00 PM"
const dueText = (date) => `${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${formatTime(date)}`;

// The server's bodies say "Open AGAPAY to …", which reads oddly inside AGAPAY
const IN_APP_BODY = {
  task: 'Open the task to see the details.',
  overdue: 'Open the task to update it.',
  message: 'Open the chat to read it.',
  handover: 'Open it to read the handover.',
};
const bodyOf = (n) => (/^Open AGAPAY/i.test(n.body ?? '') ? IN_APP_BODY[n.type] ?? '' : n.body ?? '');

// The handover a "new handover" notification is about: the one sent closest before it (within 5 min)
function handoverFor(n, handovers) {
  const at = new Date(n.time);
  return handovers
    .filter((h) => Math.abs(at - sentAt(h)) < 5 * 60 * 1000 && `New handover from ${shiftLabel(h.shift)} shift` === n.title)
    .sort((a, b) => Math.abs(at - sentAt(a)) - Math.abs(at - sentAt(b)))[0];
}

// One notification -> what the list shows:
// { ...n, label, title, details, due: { text, passed } | null, link }
// `tasks`: tasks loaded around the notifications' dates; `handovers`: parsed handovers;
// `conversations`: [{ user, last }] from Messages; `admin`: true for administrators.
export function describe(n, { tasks = [], handovers = [], conversations = [], now = new Date(), admin = false }) {
  const base = { ...n, label: TYPE_LABEL[n.type] ?? 'Update', details: bodyOf(n), due: null };

  if (n.type === 'task' || n.type === 'overdue') {
    const task = tasks.find((t) => t.id === taskIdOf(n.link));
    if (!task) return base;
    const open = task.status === 'pending' || task.status === 'overdue';
    const where = [task.resident, task.room && `Room ${task.room}`].filter(Boolean).join(' · ');
    const who = admin ? (task.assignedToName ? `assigned to ${task.assignedToName}` : 'not assigned yet') : null;
    return {
      ...base,
      details: [where, who].filter(Boolean).join(' · ') || base.details,
      due: { text: `Due ${dueText(task.dueAt)}`, passed: open && new Date(task.dueAt) < now },
      // The admin task list shows one day: open the day the task is on
      link: admin ? `/admin/tasks?date=${isoDay(task.dueAt)}&open=${task.id}` : n.link,
    };
  }

  if (n.type === 'handover') {
    const h = handoverFor(n, handovers);
    if (!h) return base;
    const flagged = (h.data?.residents ?? []).filter((r) => r.status !== 'normal' && r.name);
    const who = `From ${h.author?.name ?? 'the last shift'} · ${shiftLabel(h.shift)} shift, ${dayLabel(handoverDay(h))}`;
    return { ...base, details: flagged.length ? `${who} · Watch: ${flagged.map((r) => r.name).join(', ')}` : who };
  }

  if (n.type === 'message') {
    // The newest message, if it's from them and arrived with this notification
    const otherId = Number((n.link ?? '').match(/with=(\d+)/)?.[1]);
    const last = conversations.find((c) => c.user.id === otherId)?.last;
    if (last && last.senderId === otherId && Math.abs(new Date(last.createdAt) - new Date(n.time)) < 2 * 60 * 1000) {
      return { ...base, details: `“${last.body.length > 90 ? `${last.body.slice(0, 90)}…` : last.body}”` };
    }
    return base;
  }

  return base;
}

// Pending sign-ups, shown to administrators as notifications (the server doesn't send these yet)
export const signupNotifications = (staff, readIds) =>
  staff
    .filter((u) => u.status === 'pending')
    .map((u) => ({
      id: `signup-${u.id}`,
      type: 'signup',
      label: TYPE_LABEL.signup,
      title: `${u.name} wants to join AGAPAY`,
      details: `${u.role === 'admin' ? 'Administrator' : 'Caregiver'} · waiting for your approval`,
      due: null,
      link: '/admin/staff',
      read: readIds.includes(`signup-${u.id}`),
      time: u.createdAt ?? new Date().toISOString(),
    }));
