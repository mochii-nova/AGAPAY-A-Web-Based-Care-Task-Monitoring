// =====================================================================
//  TEMPORARY: task details the backend can't store yet
//
//  The backend only knows "done" or "not done". Until Aeron adds a
//  skipped status, a skip reason and notes to the tasks table, those are
//  kept here, in this browser only (localStorage). Other computers and
//  other people won't see them. Remove this file when the backend has them.
//
//  Shape: { [taskId]: { skipped: true, reason: '...', note: '...' } }
// =====================================================================

const KEY = 'agapay.taskExtras';

export function readExtras() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

export function writeExtras(extras) {
  try {
    localStorage.setItem(KEY, JSON.stringify(extras));
  } catch {
    // Storage can be blocked (private window). The change just won't be remembered.
  }
}

// Adds the saved skip / note to a task from the backend
export function mergeExtras(task, extra) {
  if (!extra) return task;
  const skipped = extra.skipped && task.status !== 'completed';
  return {
    ...task,
    status: skipped ? 'skipped' : task.status,
    skipReason: skipped ? extra.reason : undefined,
    note: extra.note || undefined,
  };
}
