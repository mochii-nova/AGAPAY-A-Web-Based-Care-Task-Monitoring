const express = require('express');
const pool = require('../db');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

// Shape NotificationContext.jsx expects
const toNotification = (n) => ({
  id: n.id,
  _id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  read: n.read_at !== null,
  time: n.created_at,
});

// GET /api/notifications  ->  my newest 50
router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50',
    [req.user.id]
  );
  res.json(rows.map(toNotification));
});

// GET /api/notifications/unread-count  ->  { count }
router.get('/unread-count', async (req, res) => {
  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [req.user.id]
  );
  res.json({ count });
});

// PATCH /api/notifications/read-all  (before /:id/read)
router.patch('/read-all', async (req, res) => {
  await pool.query('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
  res.json({ message: 'All marked as read' });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const [result] = await pool.query(
    'UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Notification not found' });
  const [[row]] = await pool.query('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
  res.json(toNotification(row));
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Notification deleted' });
});

module.exports = router;
