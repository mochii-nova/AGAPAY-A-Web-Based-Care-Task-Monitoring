// Counting helpers for the Reports page (admin)

// What happened to a list of tasks. Only tasks that are already due count towards the
// completion rate; ones still waiting for their time are "upcoming".
//   { total, completed, skipped, notDone, upcoming, due, rate (0–100 or null) }
export function taskStats(tasks) {
  const count = (s) => tasks.filter((t) => t.status === s).length;
  const completed = count('completed');
  const skipped = count('skipped');
  const notDone = count('overdue');
  const due = completed + skipped + notDone;
  return {
    total: tasks.length,
    completed,
    skipped,
    notDone,
    upcoming: count('pending'),
    due,
    rate: due ? Math.round((completed / due) * 100) : null,
  };
}

// 91 -> "91%", null -> "–"
export const percent = (rate) => (rate == null ? '–' : `${rate}%`);

// Handover rows (from monitorRows) -> { owed, submitted, onTime, late, missing, read }
// "owed" leaves out shifts that haven't ended yet.
export function handoverStats(rows) {
  const count = (s) => rows.filter((r) => r.status === s).length;
  return {
    owed: rows.filter((r) => r.status !== 'notDue').length,
    submitted: rows.filter((r) => r.handover).length,
    onTime: count('onTime'),
    late: count('late'),
    missing: count('missing'),
    read: rows.filter((r) => r.handover && (r.handover.reads?.length || r.handover.acknowledgedBy)).length,
  };
}
