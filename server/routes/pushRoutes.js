// Web Push routes (WEB-PUSH-FOR-AERON.md, step 5)
const express = require('express');
const pool = require('../db');
const { protect } = require('../middleware/authMiddleware');
const { sendToUser, pushReady } = require('../push');

const router = express.Router();

// The frontend needs the public key to subscribe.
// `null` means the keys aren't in .env yet; the frontend then says "the server can't send them yet".
router.get('/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// Save this browser's subscription for the logged-in user
router.post('/subscribe', protect, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 500 || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: 'Invalid subscription.' });
  }
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
    [req.user.id, endpoint, String(keys.p256dh).slice(0, 255), String(keys.auth).slice(0, 255)]
  );
  res.status(201).json({ message: 'Subscribed' });
});

// Remove this browser's subscription (when the user turns notifications off or logs out)
router.post('/unsubscribe', protect, async (req, res) => {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?', [req.body.endpoint, req.user.id]);
  res.json({ message: 'Unsubscribed' });
});

// Send a test notification to myself (for the demo and for testing).
// Not saved in the bell list on purpose: it's only a test.
router.post('/test', protect, async (req, res) => {
  if (!pushReady) return res.status(503).json({ message: 'The server has no VAPID keys yet, so it cannot send notifications.' });
  await sendToUser(req.user.id, {
    title: 'AGAPAY notifications are on',
    body: 'You will get alerts for overdue tasks and new handovers.',
    url: '/dashboard',
    tag: 'test',
  });
  res.json({ message: 'Test sent' });
});

module.exports = router;
