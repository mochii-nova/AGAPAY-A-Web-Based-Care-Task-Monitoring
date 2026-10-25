// Website contact form (no login needed to send; admins read them)
const express = require('express');
const pool = require('../db');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const rateLimit = require('../utils/rateLimit');
const { validEmail, clean } = require('../utils/users');

const router = express.Router();

// At most 5 messages per hour from the same address, so the form can't be spammed
const contactLimit = rateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Too many messages from this device. Please try again in an hour.',
});

// POST /api/contact  { name, email, message }
router.post('/', contactLimit, async (req, res) => {
  const name = clean(req.body.name, 80);
  const email = clean(req.body.email, 120)?.toLowerCase();
  const message = String(req.body.message ?? '').trim();

  // Hidden "website" field: people never fill it, simple spam bots do. Pretend it worked.
  if (req.body.website) return res.status(201).json({ message: 'Thank you! We will get back to you soon.' });

  if (!name || !email || !message) return res.status(400).json({ message: 'Please fill in your name, email and message.' });
  if (!validEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
  if (message.length > 2000) return res.status(400).json({ message: 'Message is longer than 2000 characters.' });

  await pool.query('INSERT INTO contact_messages (name, email, message, ip) VALUES (?, ?, ?, ?)', [name, email, message, req.ip]);
  res.status(201).json({ message: 'Thank you! We will get back to you soon.' });
});

// GET /api/contact  (admin)  ->  newest first
router.get('/', protect, allowRoles('admin'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200');
  res.json(
    rows.map((r) => ({ id: r.id, _id: r.id, name: r.name, email: r.email, message: r.message, handled: !!r.handled_at, createdAt: r.created_at }))
  );
});

// PATCH /api/contact/:id/handled  (admin)
router.patch('/:id/handled', protect, allowRoles('admin'), async (req, res) => {
  const [result] = await pool.query('UPDATE contact_messages SET handled_at = COALESCE(handled_at, NOW()) WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Message not found' });
  res.json({ message: 'Marked as handled' });
});

module.exports = router;
