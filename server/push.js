// Web Push helper (WEB-PUSH-FOR-AERON.md, step 4).
// Routes don't call this directly: they call utils/notify.js, which also saves a
// row for the bell list so the pop-ups and the bell always match.
const webpush = require('web-push');
const pool = require('./db');

// Without keys in .env the server still runs; pushes are just skipped.
const pushReady = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (pushReady) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('Web Push is off: add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to server/.env');
}

// Send one notification to every browser a user has turned notifications on in.
// payload: { title, body, url, tag }
async function sendToUser(userId, payload) {
  if (!pushReady) return;
  const [subs] = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        // 404 / 410 = that browser turned notifications off or the subscription expired
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE id = ?', [s.id]);
        } else {
          console.error('Push failed:', err.statusCode ?? '', err.body || err.message);
        }
      }
    })
  );
}

// Send to everyone with a role ('caregiver' or 'admin'), optionally skipping one user
async function sendToRole(role, payload, exceptUserId = null) {
  const [users] = await pool.query("SELECT id FROM users WHERE role = ? AND status = 'active' AND id <> ?", [
    role,
    exceptUserId ?? 0,
  ]);
  await Promise.all(users.map((u) => sendToUser(u.id, payload)));
}

module.exports = { pushReady, sendToUser, sendToRole };
