// Helpers for task data coming from the backend

// Words that point to each category, checked in this order.
// Only used when the administrator saved a task without a category.
const CATEGORY_WORDS = [
  ['hygiene', ['bath', 'shower', 'teeth', 'brush', 'hair', 'groom', 'shave', 'toilet', 'diaper', 'hygiene']],
  ['medical', ['vital', 'medic', 'pill', 'wound', 'blood', 'pressure', 'sugar', 'insulin', 'temperature', 'dressing']],
  ['rest', ['nap', 'sleep', 'rest', 'bedtime']],
  ['mobility', ['walk', 'exercise', 'transfer', 'wheelchair', 'stretch', 'reposition', 'mobility']],
  ['meal', ['meal', 'breakfast', 'lunch', 'dinner', 'feed', 'snack', 'drink', 'water', 'hydrat']],
  ['recreation', ['call', 'game', 'craft', 'music', 'tv', 'visit', 'social', 'activity', 'lounge', 'garden', 'read']],
];

// "Lunch Feeding" -> "meal". Returns null if nothing matches.
export function guessCategory(taskName = '') {
  const name = taskName.toLowerCase();
  return CATEGORY_WORDS.find(([, words]) => words.some((w) => name.includes(w)))?.[0] ?? null;
}

// Fills in a category when the task has none.
// Status comes from the backend as completed / skipped / pending / overdue.
export function normalizeTask(task) {
  return { ...task, category: task.category ?? guessCategory(task.task) };
}

export const normalizeTasks = (tasks) => tasks.map(normalizeTask);

export const isToday = (date, now = new Date()) => new Date(date).toDateString() === now.toDateString();

// Toast text after saving, e.g. "Sponge Bath marked as completed."
export function savedText(task, { status }) {
  const was = task.status === 'overdue' ? 'pending' : task.status;
  if (status === 'completed') return `${task.task} marked as completed.`;
  if (status === 'skipped') return `${task.task} marked as skipped.`;
  return was === 'pending' ? `${task.task} saved.` : `${task.task} moved back to pending.`;
}

// Overdue first, then the earliest due time
export const byUrgency = (a, b) =>
  (b.status === 'overdue') - (a.status === 'overdue') || new Date(a.dueAt) - new Date(b.dueAt);
