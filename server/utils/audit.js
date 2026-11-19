// Admin activity log: which administrator changed what, and when.
// Call it AFTER the change is saved:
//   await logAdmin(req, 'approve', 'staff', user.id, `Approved ${displayName(user)} (${user.username})`);
// It only logs administrators, and never stops the action if saving the log fails.
const pool = require('../db');

// Everything is inside the try: whatever goes wrong here is only written to the console, and the
// action that called it still answers normally.
async function logAdmin(req, action, targetType, targetId, details) {
  try {
    if (req?.user?.role !== 'admin') return;
    const adminName = req.user.name || req.user.username || `Admin #${req.user.id}`; // never empty
    await pool.query(
      'INSERT INTO admin_logs (admin_id, admin_name, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, adminName, action, targetType, targetId ?? null, details ? String(details).slice(0, 500) : null]
    );
  } catch (err) {
    console.error('Admin log failed (the action itself was saved):', err.message);
  }
}

module.exports = { logAdmin };