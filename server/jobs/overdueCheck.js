// Overdue alerts (WEB-PUSH-FOR-AERON.md step 6B).
// Overdue happens with time passing, not with a request, so this runs every 5 minutes.
// Each task alerts once (tasks.overdue_notified_at).
//  - Assigned task  -> that caregiver + the admins
//  - Unassigned     -> every active caregiver + the admins
const pool = require('../db');
const { notify, idsWithRole } = require('../utils/notify');

const EVERY_MS = 5 * 60 * 1000;

async function checkOverdueTasks() {
  try {
    // Only tasks that became late in the last day (older ones are marked without an alert)
    await pool.query(
      `UPDATE tasks SET overdue_notified_at = NOW()
       WHERE status = 'pending' AND overdue_notified_at IS NULL AND due_at < NOW() - INTERVAL 1 DAY`
    );
    const [tasks] = await pool.query(
      `SELECT id, task, assigned_to FROM tasks
       WHERE status = 'pending' AND overdue_notified_at IS NULL AND due_at < NOW()`
    );
    if (tasks.length === 0) return;

    const admins = await idsWithRole('admin');
    const caregivers = tasks.some((t) => !t.assigned_to) ? await idsWithRole('caregiver') : [];

    for (const t of tasks) {
      // Mark first, so a slow push never causes a second alert
      const [marked] = await pool.query(
        'UPDATE tasks SET overdue_notified_at = NOW() WHERE id = ? AND overdue_notified_at IS NULL',
        [t.id]
      );
      if (marked.affectedRows === 0) continue;
      await notify([...(t.assigned_to ? [t.assigned_to] : caregivers), ...admins], {
        type: 'overdue',
        title: `${t.task} is overdue`.slice(0, 120),
        body: 'Open AGAPAY to update it.',
        link: `/tasks?open=${t.id}`,
        tag: `overdue-${t.id}`,
      });
    }
  } catch (err) {
    console.error('Overdue check failed:', err.message);
  }
}

function startOverdueCheck() {
  setTimeout(checkOverdueTasks, 10 * 1000); // shortly after the server starts
  return setInterval(checkOverdueTasks, EVERY_MS);
}

module.exports = { startOverdueCheck, checkOverdueTasks };
