// Overdue alerts (WEB-PUSH-FOR-AERON.md step 6B).
// Overdue happens with time passing, not with a request, so this runs every 5 minutes.
// Each task alerts once (tasks.overdue_notified_at).
//  - Assigned task  -> that caregiver + the admins
//  - Unassigned     -> every active caregiver + the admins
const pool = require('../db');
const { shiftTimes, shiftAt, addDays } = require('../utils/shifts');
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

const GRACE_MS = 15 * 60 * 1000;

async function checkMissingHandovers() {
  try {
    const today = shiftAt().shiftDate;
    const [shifts] = await pool.query(
      `SELECT s.id, s.user_id, s.shift, s.shift_date FROM shifts s
       JOIN users u ON u.id = s.user_id AND u.role = 'caregiver' AND u.status = 'active'
       WHERE s.missing_handover_notified_at IS NULL AND s.shift_date BETWEEN ? AND ?`,
      [addDays(today, -2), today]
    );
    const now = Date.now();
    let admins = null;

    for (const s of shifts) {
      const endsAt = Date.parse(shiftTimes(s.shift_date, s.shift).endsAt);
      if (now < endsAt + GRACE_MS) continue; // not over yet (or still in the 15 minutes)

      // Mark first, so this shift is never alerted twice
      const [marked] = await pool.query(
        'UPDATE shifts SET missing_handover_notified_at = NOW() WHERE id = ? AND missing_handover_notified_at IS NULL',
        [s.id]
      );
      if (marked.affectedRows === 0) continue;

      // Shifts that ended long ago (e.g. the server was off) are only marked, not alerted
      if (now - endsAt > 12 * 3600 * 1000) continue;

      const [[sent]] = await pool.query(
        "SELECT id FROM handovers WHERE author_id = ? AND shift = ? AND shift_date = ? AND status = 'submitted' LIMIT 1",
        [s.user_id, s.shift, s.shift_date]
      );
      if (sent) continue;

      admins ??= await idsWithRole('admin');
      await notify(admins, {
        type: 'handover',
        title: 'Handover not submitted',
        body: 'A shift ended without a handover.',
        link: '/admin/handover',
        tag: `missing-handover-${s.id}`,
      });
    }
  } catch (err) {
    console.error('Missing handover check failed:', err.message);
  }
}

// Every 5 minutes: overdue tasks, then shifts that ended without a handover
async function runChecks() {
  await checkOverdueTasks();
  await checkMissingHandovers();
}

function startOverdueCheck() {
  setTimeout(runChecks, 10 * 1000); // shortly after the server starts
  return setInterval(runChecks, EVERY_MS);
}

module.exports = { startOverdueCheck, checkOverdueTasks, checkMissingHandovers };