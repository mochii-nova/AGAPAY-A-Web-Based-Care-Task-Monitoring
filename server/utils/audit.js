// Admin activity log: which administrator changed what, and when.
// Call it AFTER the change is saved:
//   await logAdmin(req, 'approve', 'staff', user.id, `Approved ${displayName(user)} (${user.username})`);
// It only logs administrators, and never stops the action if saving the log fails.
const pool = require('../db');

async function logAdmin(req, action, targetType, targetId, details) {
  if (req.user?.role !== 'admin') return;
  try {
    await pool.query(
      'INSERT INTO admin_logs (admin_id, admin_name, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, req.user.name, action, targetType, targetId ?? null, details ? String(details).slice(0, 500) : null]
    );
  } catch (err) {
    console.error('Admin log failed:', err.message);
  }
}

module.exports = { logAdmin };