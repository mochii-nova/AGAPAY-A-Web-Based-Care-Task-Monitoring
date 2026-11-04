// One place to tell people about something: saves a row in `notifications`
// (the bell list) and sends a Web Push pop-up with the same text.
//
// PRIVACY: title and body can show on a locked phone screen. Never put resident
// names, health details or notes in them. A task name is fine.
const pool = require('../db');
const { sendToUser } = require('../push');

// notify([userId, ...], { type, title, body, link, tag })
// type: task | overdue | handover | schedule | message
async function notify(userIds, { type, title, body = null, link = null, tag }) {
  const ids = [...new Set(userIds.map(Number).filter(Boolean))];
  if (ids.length === 0) return;

  await pool.query('INSERT INTO notifications (user_id, type, title, body, link) VALUES ?', [
    ids.map((id) => [id, type, title.slice(0, 120), body ? body.slice(0, 200) : null, link]),
  ]);

  const payload = { title, body: body || 'Open AGAPAY to see what’s new.', url: link || '/dashboard', tag };
  await Promise.all(ids.map((id) => sendToUser(id, payload).catch((err) => console.error('Push failed:', err.message))));
}

// IDs of active users with a role, optionally skipping one person
async function idsWithRole(role, exceptUserId = null) {
  const [rows] = await pool.query("SELECT id FROM users WHERE role = ? AND status = 'active' AND id <> ?", [
    role,
    exceptUserId ?? 0,
  ]);
  return rows.map((r) => r.id);
}

// Fire and forget: the person making the request is never kept waiting
const notifyLater = (userIds, payload) => {
  Promise.resolve(userIds)
    .then((ids) => notify(ids, payload))
    .catch((err) => console.error('Notify failed:', err.message));
};

module.exports = { notify, notifyLater, idsWithRole };
