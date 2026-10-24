// Helpers for task data coming from the backend

// Words that point to each category, checked in this order.
// TODO: remove once the backend stores a category for each task.
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

// Backend says "done"; the screens say "completed". Also fills in a category.
export function normalizeTask(task) {
  return {
    ...task,
    status: task.status === 'done' ? 'completed' : task.status,
    category: task.category ?? guessCategory(task.task),
  };
}

export const normalizeTasks = (tasks) => tasks.map(normalizeTask);

export const isToday = (date, now = new Date()) => new Date(date).toDateString() === now.toDateString();

// Overdue first, then the earliest due time
export const byUrgency = (a, b) =>
  (b.status === 'overdue') - (a.status === 'overdue') || new Date(a.dueAt) - new Date(b.dueAt);
