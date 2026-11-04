// Caregiver <-> admin messages. Follows MESSAGES-FOR-AERON.md, plus:
//  - `title` on users is filled in (shown under the admin's name in the chat header)
//  - a new message also goes to the bell list and as a push (no message text in it)
//  - inactive / pending accounts aren't listed and can't be messaged
const express = require('express');
const pool = require('../db');
const { protect } = require('../middleware/authMiddleware');
const { notifyLater } = require('../utils/notify');

const router = express.Router();
router.use(protect);

const MAX_LENGTH = 1000;

// Turns a database row into the shape the frontend expects
const toMessage = (m) => ({
  id: m.id,
  senderId: m.sender_id,
  recipientId: m.recipient_id,
  body: m.body,
  createdAt: m.created_at,
  readAt: m.read_at,
});

// Caregivers may only talk to admins; admins may talk to anyone
async function canTalkTo(me, otherId) {
  if (Number(otherId) === me.id) return null;
  const [[other]] = await pool.query("SELECT id, name, role, title FROM users WHERE id = ? AND status = 'active'", [otherId]);
  if (!other) return null;
  if (me.role !== 'admin' && other.role !== 'admin') return null;
  return other;
}

// GET /api/messages/conversations
// Caregiver: every admin (even with no messages yet). Admin: everyone they've talked to.
router.get('/conversations', async (req, res) => {
  const me = req.user;
  const [people] =
    me.role === 'admin'
      ? await pool.query(
          `SELECT DISTINCT u.id, u.name, u.role, u.title FROM users u
           JOIN messages m ON (m.sender_id = u.id AND m.recipient_id = ?) OR (m.recipient_id = u.id AND m.sender_id = ?)`,
          [me.id, me.id]
        )
      : await pool.query("SELECT id, name, role, title FROM users WHERE role = 'admin' AND status = 'active' AND id <> ?", [me.id]);

  const result = await Promise.all(
    people.map(async (u) => {
      const [[last]] = await pool.query(
        `SELECT * FROM messages WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
         ORDER BY created_at DESC, id DESC LIMIT 1`,
        [me.id, u.id, u.id, me.id]
      );
      const [[{ unread }]] = await pool.query(
        'SELECT COUNT(*) AS unread FROM messages WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL',
        [u.id, me.id]
      );
      return { user: u, lastMessage: last ? toMessage(last) : null, unreadCount: unread };
    })
  );
  // Newest conversation first; ones without messages at the end
  result.sort((a, b) => (b.lastMessage ? new Date(b.lastMessage.createdAt) : 0) - (a.lastMessage ? new Date(a.lastMessage.createdAt) : 0));
  res.json(result);
});

// GET /api/messages/unread-count  ->  { count }   (for the badges)
router.get('/unread-count', async (req, res) => {
  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM messages WHERE recipient_id = ? AND read_at IS NULL',
    [req.user.id]
  );
  res.json({ count });
});

// GET /api/messages/:userId  ->  the conversation, oldest first (last 200 messages)
router.get('/:userId', async (req, res) => {
  const other = await canTalkTo(req.user, req.params.userId);
  if (!other) return res.status(403).json({ message: 'You can’t message this person.' });
  const [rows] = await pool.query(
    `SELECT * FROM (
       SELECT * FROM messages WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
       ORDER BY created_at DESC, id DESC LIMIT 200
     ) recent ORDER BY created_at ASC, id ASC`,
    [req.user.id, other.id, other.id, req.user.id]
  );
  res.json(rows.map(toMessage));
});

// POST /api/messages/:userId  { body }  ->  201 + the saved message
router.post('/:userId', async (req, res) => {
  const other = await canTalkTo(req.user, req.params.userId);
  if (!other) return res.status(403).json({ message: 'You can’t message this person.' });
  const body = String(req.body.body ?? '').trim();
  if (!body) return res.status(400).json({ message: 'Message is empty.' });
  if (body.length > MAX_LENGTH) return res.status(400).json({ message: `Message is longer than ${MAX_LENGTH} characters.` });

  const [result] = await pool.query('INSERT INTO messages (sender_id, recipient_id, body) VALUES (?, ?, ?)', [
    req.user.id,
    other.id,
    body,
  ]);
  const [[saved]] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);

  // Privacy: never the message text (it can show on a locked screen)
  notifyLater([other.id], {
    type: 'message',
    title: `New message from ${req.user.name}`,
    body: 'Open AGAPAY to read it.',
    link: `/messages?with=${req.user.id}`,
    tag: `message-${req.user.id}`,
  });

  res.status(201).json(toMessage(saved));
});

// PATCH /api/messages/:userId/read  ->  marks everything they sent me as read
router.patch('/:userId/read', async (req, res) => {
  await pool.query(
    'UPDATE messages SET read_at = NOW() WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL',
    [req.params.userId, req.user.id]
  );
  // The matching bell entries are read too
  await pool.query(
    "UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND type = 'message' AND link = ? AND read_at IS NULL",
    [req.user.id, `/messages?with=${Number(req.params.userId)}`]
  );
  res.json({ message: 'Marked as read' });
});

module.exports = router;
